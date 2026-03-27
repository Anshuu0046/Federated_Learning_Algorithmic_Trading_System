"""
flower_simulation.py  (OPTIONAL)
=================================
Realistic federated simulation using the Flower (flwr) framework.

Flower provides:
  - A proper gRPC communication layer between clients and server
  - Built-in FedAvg strategy (and many others: FedProx, FedAdam, …)
  - Client selection, aggregation, and evaluation hooks
  - Simulation mode (no real network required)

Install: pip install flwr

Usage:
    python flower_simulation.py

NOTE: This file is self-contained and independent of train.py.
      It reuses data_loader.py and model.py.
"""

import logging
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from collections import OrderedDict
from typing import List, Tuple, Dict, Optional

# Flower imports (comment out if not installed)
try:
    import flwr as fl
    from flwr.common import (
        Metrics, NDArrays, Parameters,
        ndarrays_to_parameters, parameters_to_ndarrays,
    )
    FLWR_AVAILABLE = True
except ImportError:
    FLWR_AVAILABLE = False
    print("Flower not installed. Run: pip install flwr")

from data_loader import prepare_federated_data
from model import build_model, LSTMPredictor

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s | %(levelname)-8s | %(message)s")


# =============================================================================
# CONFIGURATION
# =============================================================================

CONFIG = {
    "tickers":       ["AAPL", "TSLA", "MSFT"],
    "start_date":    "2020-01-01",
    "end_date":      "2024-01-01",
    "seq_len":       30,
    "num_clients":   5,
    "fl_rounds":     10,
    "local_epochs":  3,
    "batch_size":    32,
    "learning_rate": 1e-3,
    "hidden_size":   128,
    "num_layers":    2,
    "dropout":       0.2,
}

DEVICE = torch.device("cpu")


# =============================================================================
# FLOWER CLIENT
# =============================================================================

class FlowerTradingClient(fl.client.NumPyClient):
    """
    Flower NumPyClient wraps our LSTM model for federated simulation.

    Flower communicates model parameters as lists of numpy arrays.
    We convert between numpy ↔ state_dict in get_parameters / set_parameters.
    """

    def __init__(self,
                 client_id: str,
                 X_train: np.ndarray,
                 y_train: np.ndarray,
                 model: LSTMPredictor):

        self.client_id = client_id
        self.model = model

        X_t = torch.tensor(X_train, dtype=torch.float32)
        y_t = torch.tensor(y_train, dtype=torch.float32).unsqueeze(1)
        dataset = TensorDataset(X_t, y_t)
        self.loader = DataLoader(dataset, batch_size=CONFIG["batch_size"],
                                 shuffle=True)

    # --- Flower protocol ---

    def get_parameters(self, config) -> NDArrays:
        """Return model parameters as a list of numpy arrays."""
        return [val.cpu().numpy() for _, val in self.model.state_dict().items()]

    def set_parameters(self, parameters: NDArrays) -> None:
        """Load a list of numpy arrays into the model state_dict."""
        params_dict = zip(self.model.state_dict().keys(), parameters)
        state_dict = OrderedDict(
            {k: torch.tensor(v) for k, v in params_dict}
        )
        self.model.load_state_dict(state_dict, strict=True)

    def fit(self, parameters: NDArrays, config: Dict) -> Tuple[NDArrays, int, Dict]:
        """
        Receive global parameters, train locally, return updated parameters.

        Returns
        -------
        parameters  : updated model weights
        num_examples: local dataset size (for weighted averaging)
        metrics     : dict with local training metrics
        """
        self.set_parameters(parameters)

        local_epochs = config.get("local_epochs", CONFIG["local_epochs"])
        lr = config.get("learning_rate", CONFIG["learning_rate"])

        self.model.train()
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)

        total_loss = 0.0
        n_batches = 0

        for _ in range(local_epochs):
            for X_b, y_b in self.loader:
                optimizer.zero_grad()
                pred = self.model(X_b)
                loss = criterion(pred, y_b)
                loss.backward()
                nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                optimizer.step()
                total_loss += loss.item()
                n_batches += 1

        avg_loss = total_loss / max(n_batches, 1)
        n_samples = len(self.loader.dataset)

        logger.info(f"[{self.client_id}] fit complete | loss={avg_loss:.6f}")
        return self.get_parameters(config={}), n_samples, {"loss": avg_loss}

    def evaluate(self,
                 parameters: NDArrays,
                 config: Dict) -> Tuple[float, int, Dict]:
        """
        Evaluate the received global parameters on local data.

        Returns
        -------
        loss        : float
        num_examples: int
        metrics     : dict
        """
        self.set_parameters(parameters)
        self.model.eval()
        criterion = nn.MSELoss()
        total_loss = 0.0
        n_batches = 0

        with torch.no_grad():
            for X_b, y_b in self.loader:
                pred = self.model(X_b)
                total_loss += criterion(pred, y_b).item()
                n_batches += 1

        avg_loss = total_loss / max(n_batches, 1)
        n_samples = len(self.loader.dataset)
        return avg_loss, n_samples, {"mse": avg_loss}


# =============================================================================
# FLOWER SERVER STRATEGY
# =============================================================================

def weighted_average(metrics: List[Tuple[int, Metrics]]) -> Metrics:
    """
    Custom aggregation function for evaluation metrics.
    Computes weighted average MSE across all clients.
    """
    total_examples = sum(n for n, _ in metrics)
    weighted_mse = sum(n * m["mse"] for n, m in metrics) / total_examples
    return {"mse": weighted_mse}


def build_strategy(initial_parameters: Parameters) -> fl.server.strategy.FedAvg:
    """Configure the Flower FedAvg strategy."""
    return fl.server.strategy.FedAvg(
        fraction_fit=1.0,           # use all clients each round
        fraction_evaluate=1.0,
        min_fit_clients=CONFIG["num_clients"],
        min_evaluate_clients=CONFIG["num_clients"],
        min_available_clients=CONFIG["num_clients"],
        evaluate_metrics_aggregation_fn=weighted_average,
        initial_parameters=initial_parameters,
        on_fit_config_fn=lambda rnd: {   # pass config to clients
            "local_epochs":  CONFIG["local_epochs"],
            "learning_rate": CONFIG["learning_rate"],
        },
    )


# =============================================================================
# CLIENT FACTORY
# =============================================================================

def make_client_fn(client_datasets, input_size):
    """
    Factory that returns a function mapping client_id → FlowerTradingClient.
    Required by fl.simulation.start_simulation.
    """
    def client_fn(cid: str) -> fl.client.Client:
        idx = int(cid)
        X_i, y_i = client_datasets[idx]
        model = build_model(input_size, {
            "hidden_size": CONFIG["hidden_size"],
            "num_layers":  CONFIG["num_layers"],
            "dropout":     CONFIG["dropout"],
        }).to(DEVICE)
        client = FlowerTradingClient(
            client_id=f"client_{idx}",
            X_train=X_i,
            y_train=y_i,
            model=model,
        )
        return client.to_client()
    return client_fn


# =============================================================================
# MAIN
# =============================================================================

def main():
    if not FLWR_AVAILABLE:
        print("Install Flower with: pip install flwr")
        return

    logger.info("Loading data …")
    client_data, normalizer, _ = prepare_federated_data(
        tickers=CONFIG["tickers"],
        num_clients=CONFIG["num_clients"],
        seq_len=CONFIG["seq_len"],
        start=CONFIG["start_date"],
        end=CONFIG["end_date"],
        iid=False,
    )

    input_size = client_data[0][0].shape[2]
    logger.info(f"Input size: {input_size}")

    # Build a reference model to extract initial parameters
    global_model = build_model(input_size, {
        "hidden_size": CONFIG["hidden_size"],
        "num_layers":  CONFIG["num_layers"],
        "dropout":     CONFIG["dropout"],
    })
    init_params = ndarrays_to_parameters(
        [val.cpu().numpy() for val in global_model.state_dict().values()]
    )

    strategy = build_strategy(init_params)
    client_fn = make_client_fn(client_data, input_size)

    logger.info(f"Starting Flower simulation | "
                f"clients={CONFIG['num_clients']} | "
                f"rounds={CONFIG['fl_rounds']}")

    history = fl.simulation.start_simulation(
        client_fn=client_fn,
        num_clients=CONFIG["num_clients"],
        config=fl.server.ServerConfig(num_rounds=CONFIG["fl_rounds"]),
        strategy=strategy,
    )

    logger.info("Flower simulation complete.")
    logger.info(f"Loss history: {history.losses_distributed}")
    return history


if __name__ == "__main__":
    main()
