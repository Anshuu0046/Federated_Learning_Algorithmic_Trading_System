"""
train.py
========
Main entry point for the Federated Learning trading system.

Orchestrates the full pipeline:
  1. Configuration
  2. Data loading & partitioning
  3. Client & server initialisation
  4. Federated training loop (multiple rounds)
  5. Global model evaluation
  6. Signal generation & backtesting
  7. Metric reporting & plotting

Usage:
    python train.py

Adjust TICKERS, NUM_CLIENTS, FL_ROUNDS etc. in the CONFIG dict below.
"""

import os
import sys
import logging
import warnings
import numpy as np
import torch

# Suppress noisy third-party warnings
warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Logging setup (structured console output)
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("training.log", mode="w"),
    ],
)
logger = logging.getLogger("train")

# ---------------------------------------------------------------------------
# Local imports (all modules in the same directory)
# ---------------------------------------------------------------------------
from data_loader import prepare_federated_data
from model import build_model, count_parameters
from client import FederatedClient
from server import FederatedServer
from utils import (
    generate_signals,
    backtest,
    compute_all_metrics,
    plot_predictions,
    plot_portfolio,
    plot_federated_loss,
    print_metrics_table,
)


# =============================================================================
# CONFIGURATION
# =============================================================================

CONFIG = {
    # ---- Data ----
    "tickers":       ["AAPL", "TSLA", "MSFT", "AMZN", "GOOGL"],
    "start_date":    "2019-01-01",
    "end_date":      "2024-01-01",
    "seq_len":       30,            # look-back window (timesteps)
    "iid_split":     False,         # False = temporal (non-IID, more realistic)

    # ---- Federated Learning ----
    "num_clients":   5,
    "fl_rounds":     15,            # total federated communication rounds
    "client_fraction": 1.0,         # fraction of clients selected per round

    # ---- Local Training ----
    "local_epochs":  3,             # epochs each client trains per round
    "batch_size":    32,
    "learning_rate": 1e-3,
    "weight_decay":  1e-5,

    # ---- Model ----
    "hidden_size":   128,
    "num_layers":    2,
    "dropout":       0.2,

    # ---- Trading ----
    "buy_threshold":     0.005,     # +0.5% predicted upside → BUY
    "sell_threshold":    0.002,     # -0.2% predicted downside → SELL
    "initial_capital":   10_000.0,
    "transaction_cost":  0.001,     # 0.1% per trade

    # ---- Output ----
    "output_dir":    "outputs",
    "save_model":    True,
}


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def set_seed(seed: int = 42) -> None:
    """Reproducibility."""
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def get_device() -> torch.device:
    """Prefer CUDA → MPS → CPU."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


# =============================================================================
# MAIN PIPELINE
# =============================================================================

def main():
    set_seed(42)
    device = get_device()
    logger.info(f"Using device: {device}")

    # Create output directory
    os.makedirs(CONFIG["output_dir"], exist_ok=True)

    # ------------------------------------------------------------------
    # STEP 1: Data Preparation
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("STEP 1: Fetching & partitioning data")
    logger.info("=" * 60)

    client_data, normalizer, raw_close = prepare_federated_data(
        tickers=CONFIG["tickers"],
        num_clients=CONFIG["num_clients"],
        seq_len=CONFIG["seq_len"],
        start=CONFIG["start_date"],
        end=CONFIG["end_date"],
        iid=CONFIG["iid_split"],
    )

    # Input size = number of features (inferred from data shape)
    input_size = client_data[0][0].shape[2]
    logger.info(f"Input features per timestep: {input_size}")

    # ------------------------------------------------------------------
    # STEP 2: Build Clients
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("STEP 2: Initialising federated clients")
    logger.info("=" * 60)

    client_config = {
        "local_epochs":   CONFIG["local_epochs"],
        "batch_size":     CONFIG["batch_size"],
        "learning_rate":  CONFIG["learning_rate"],
        "weight_decay":   CONFIG["weight_decay"],
    }

    clients = []
    for i, (X_i, y_i) in enumerate(client_data):
        cid = f"client_{i+1}"
        c = FederatedClient(
            client_id=cid,
            X_train=X_i,
            y_train=y_i,
            config=client_config,
            device=device,
        )
        clients.append(c)
        logger.info(f"  {c}")

    # ------------------------------------------------------------------
    # STEP 3: Build Server & Global Model
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("STEP 3: Initialising federated server")
    logger.info("=" * 60)

    model_config = {
        "hidden_size":  CONFIG["hidden_size"],
        "num_layers":   CONFIG["num_layers"],
        "dropout":      CONFIG["dropout"],
        "output_size":  1,
    }

    server = FederatedServer(
        input_size=input_size,
        model_config=model_config,
        device=device,
    )
    logger.info(
        f"Global model parameters: "
        f"{count_parameters(server.global_model):,}"
    )

    # ------------------------------------------------------------------
    # STEP 4: Federated Training Loop
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info(f"STEP 4: Starting {CONFIG['fl_rounds']} federated rounds")
    logger.info("=" * 60)

    # Track per-client loss histories across rounds
    client_loss_history = {c.client_id: [] for c in clients}

    for round_num in range(1, CONFIG["fl_rounds"] + 1):
        metrics = server.run_round(
            clients=clients,
            round_num=round_num,
            fraction=CONFIG["client_fraction"],
        )
        # Accumulate per-client loss histories for plotting
        for cid, loss in metrics["client_losses"].items():
            client_loss_history[cid].append(loss)

    logger.info("Federated training complete.")

    # ------------------------------------------------------------------
    # STEP 5: Global Model Evaluation
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("STEP 5: Evaluating global model")
    logger.info("=" * 60)

    # Use all available sequence data for evaluation (combine all clients)
    all_X = np.concatenate([cd[0] for cd in client_data], axis=0)
    all_y = np.concatenate([cd[1] for cd in client_data], axis=0)

    # Predict on the full dataset
    scaled_preds = server.predict(all_X)  # scaled [0, 1]

    # Inverse-transform to actual prices
    pred_prices = normalizer.inverse_close(scaled_preds)
    true_prices = normalizer.inverse_close(all_y)

    # Align raw_close with predictions (may differ in length due to shuffling)
    # We use true_prices (inverse of scaled y) for signal generation
    assert len(pred_prices) == len(true_prices), "Length mismatch in predictions"

    logger.info(f"Evaluated on {len(true_prices)} samples")

    # ------------------------------------------------------------------
    # STEP 6: Trading Signals & Backtest
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("STEP 6: Generating signals and running backtest")
    logger.info("=" * 60)

    signals = generate_signals(
        current_prices=true_prices,
        predicted_prices=pred_prices,
        buy_threshold=CONFIG["buy_threshold"],
        sell_threshold=CONFIG["sell_threshold"],
    )

    portfolio_values, trade_log = backtest(
        signals=signals,
        actual_prices=true_prices,
        initial_capital=CONFIG["initial_capital"],
        transaction_cost=CONFIG["transaction_cost"],
    )

    logger.info(f"Total trades executed: {len(trade_log)}")
    if not trade_log.empty:
        logger.info(f"\nSample trades:\n{trade_log.head(10).to_string(index=False)}")

    # ------------------------------------------------------------------
    # STEP 7: Metrics
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("STEP 7: Computing evaluation metrics")
    logger.info("=" * 60)

    metrics_dict = compute_all_metrics(
        y_true=true_prices,
        y_pred=pred_prices,
        portfolio_values=portfolio_values,
    )
    print_metrics_table(metrics_dict)

    # ------------------------------------------------------------------
    # STEP 8: Plots
    # ------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("STEP 8: Generating plots")
    logger.info("=" * 60)

    out = CONFIG["output_dir"]

    plot_predictions(
        actual=true_prices,
        predicted=pred_prices,
        title="Global LSTM Model: Predicted vs Actual Price",
        save_path=os.path.join(out, "predictions.png"),
    )

    plot_portfolio(
        portfolio_values=portfolio_values,
        actual_prices=true_prices,
        signals=signals,
        initial_capital=CONFIG["initial_capital"],
        save_path=os.path.join(out, "portfolio.png"),
    )

    plot_federated_loss(
        global_losses=server.global_loss_history,
        client_loss_history=client_loss_history,
        save_path=os.path.join(out, "federated_loss.png"),
    )

    # ------------------------------------------------------------------
    # STEP 9: Save Model
    # ------------------------------------------------------------------
    if CONFIG["save_model"]:
        model_path = os.path.join(out, "global_model.pt")
        server.save(model_path)

    logger.info("=" * 60)
    logger.info("Pipeline complete. All outputs saved to: " + out)
    logger.info("=" * 60)

    return metrics_dict, portfolio_values, server


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    main()
