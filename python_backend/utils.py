"""
utils.py
========
Shared utilities for the federated trading system:

  - Evaluation metrics  : RMSE, Sharpe Ratio, Max Drawdown, Cumulative Return
  - Trading signals     : Buy / Sell / Hold based on predicted vs current price
  - Backtesting engine  : simulate P&L from signal stream
  - Plotting            : predictions, portfolio growth, federated loss curves
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")           # non-interactive backend for headless runs
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import logging
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


# =============================================================================
# 1. EVALUATION METRICS
# =============================================================================

def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Root Mean Squared Error."""
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Error."""
    return float(np.mean(np.abs(y_true - y_pred)))


def mape(y_true: np.ndarray, y_pred: np.ndarray, eps: float = 1e-9) -> float:
    """Mean Absolute Percentage Error (%)."""
    return float(np.mean(np.abs((y_true - y_pred) / (y_true + eps))) * 100)


def sharpe_ratio(returns: np.ndarray,
                 risk_free_rate: float = 0.0,
                 annualisation: int = 252) -> float:
    """
    Annualised Sharpe Ratio.

    Parameters
    ----------
    returns         : daily portfolio return series
    risk_free_rate  : daily risk-free rate (default 0)
    annualisation   : trading days per year
    """
    excess = returns - risk_free_rate
    if excess.std() < 1e-9:
        return 0.0
    return float((excess.mean() / excess.std()) * np.sqrt(annualisation))


def max_drawdown(portfolio_values: np.ndarray) -> float:
    """
    Maximum peak-to-trough percentage drawdown.

    Returns a negative float (e.g. -0.25 means -25% drawdown).
    """
    peak = np.maximum.accumulate(portfolio_values)
    drawdown = (portfolio_values - peak) / (peak + 1e-9)
    return float(drawdown.min())


def cumulative_return(portfolio_values: np.ndarray) -> float:
    """Total return from start to end of the backtest period."""
    if portfolio_values[0] < 1e-9:
        return 0.0
    return float((portfolio_values[-1] / portfolio_values[0]) - 1.0)


def compute_all_metrics(y_true: np.ndarray,
                        y_pred: np.ndarray,
                        portfolio_values: np.ndarray) -> Dict[str, float]:
    """
    Compute and return all evaluation metrics in a single dict.
    """
    daily_returns = np.diff(portfolio_values) / (portfolio_values[:-1] + 1e-9)

    return {
        "RMSE": rmse(y_true, y_pred),
        "MAE": mae(y_true, y_pred),
        "MAPE_%": mape(y_true, y_pred),
        "Sharpe_Ratio": sharpe_ratio(daily_returns),
        "Max_Drawdown_%": max_drawdown(portfolio_values) * 100,
        "Cumulative_Return_%": cumulative_return(portfolio_values) * 100,
    }


# =============================================================================
# 2. TRADING SIGNALS
# =============================================================================

def generate_signals(current_prices: np.ndarray,
                     predicted_prices: np.ndarray,
                     buy_threshold: float = 0.005,
                     sell_threshold: float = 0.0) -> np.ndarray:
    """
    Rule-based signal generator.

    Logic:
      BUY  (+1) : predicted / current > 1 + buy_threshold
      SELL (-1) : predicted / current < 1 - sell_threshold
      HOLD  (0) : otherwise

    Parameters
    ----------
    current_prices   : array of current (actual) Close prices
    predicted_prices : array of model-predicted next-step prices
    buy_threshold    : fractional uplift required to trigger a Buy
    sell_threshold   : fractional decline required to trigger a Sell

    Returns
    -------
    signals : int array of {-1, 0, +1}
    """
    signals = np.zeros(len(current_prices), dtype=int)

    for i in range(len(current_prices)):
        if current_prices[i] < 1e-9:
            continue
        ratio = predicted_prices[i] / current_prices[i]
        if ratio > 1 + buy_threshold:
            signals[i] = 1    # BUY
        elif ratio < 1 - sell_threshold:
            signals[i] = -1   # SELL
        # else: HOLD (0)

    buys = (signals == 1).sum()
    sells = (signals == -1).sum()
    holds = (signals == 0).sum()
    logger.info(f"Signals -> BUY={buys} | SELL={sells} | HOLD={holds}")
    return signals


# =============================================================================
# 3. BACKTESTING ENGINE
# =============================================================================

def backtest(signals: np.ndarray,
             actual_prices: np.ndarray,
             initial_capital: float = 10_000.0,
             transaction_cost: float = 0.001) -> Tuple[np.ndarray, pd.DataFrame]:
    """
    Simple long/short backtester.

    Strategy:
      - Signal +1  → BUY  (invest all capital into the position)
      - Signal -1  → SELL (exit any long, optionally short)
      - Signal  0  → HOLD (maintain current position)

    Transaction costs are applied on every trade as a fraction of trade value.

    Parameters
    ----------
    signals          : int array {-1, 0, +1}
    actual_prices    : array of true Close prices (same length as signals)
    initial_capital  : starting portfolio value in currency units
    transaction_cost : fraction of trade value deducted per trade (e.g. 0.001 = 0.1%)

    Returns
    -------
    portfolio_values : np.ndarray of portfolio equity curve
    trade_log        : pd.DataFrame with per-trade details
    """
    n = len(signals)
    portfolio_values = np.zeros(n)
    cash = initial_capital
    shares_held = 0.0
    position = 0           # 0=flat, 1=long
    trade_log = []

    for i in range(n):
        price = actual_prices[i]
        signal = signals[i]

        if signal == 1 and position == 0:
            # ---- BUY ----
            cost = cash * transaction_cost
            shares_held = (cash - cost) / price
            cash = 0.0
            position = 1
            trade_log.append({
                "step": i, "action": "BUY",
                "price": price, "shares": shares_held
            })

        elif signal == -1 and position == 1:
            # ---- SELL ----
            proceeds = shares_held * price
            cost = proceeds * transaction_cost
            cash = proceeds - cost
            shares_held = 0.0
            position = 0
            trade_log.append({
                "step": i, "action": "SELL",
                "price": price, "cash": cash
            })

        # Mark-to-market portfolio value
        portfolio_values[i] = cash + shares_held * price

    # Force close any open position at the last price
    if position == 1:
        last_price = actual_prices[-1]
        cash = shares_held * last_price * (1 - transaction_cost)
        portfolio_values[-1] = cash

    trade_df = pd.DataFrame(trade_log)
    return portfolio_values, trade_df


# =============================================================================
# 4. PLOTTING
# =============================================================================

# --- colour palette ---
PALETTE = {
    "actual":     "#2196F3",   # blue
    "predicted":  "#FF5722",   # orange-red
    "portfolio":  "#4CAF50",   # green
    "buy":        "#00C853",   # bright green
    "sell":       "#D50000",   # bright red
    "loss":       "#9C27B0",   # purple
    "loss_client":"#CE93D8",   # light purple
}


def plot_predictions(actual: np.ndarray,
                     predicted: np.ndarray,
                     title: str = "Global Model: Predicted vs Actual Price",
                     save_path: Optional[str] = None) -> None:
    """Line chart of predicted vs actual Close prices."""
    fig, ax = plt.subplots(figsize=(14, 5))
    ax.plot(actual, label="Actual", color=PALETTE["actual"], lw=1.8, alpha=0.9)
    ax.plot(predicted, label="Predicted", color=PALETTE["predicted"],
            lw=1.5, linestyle="--", alpha=0.85)
    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.set_xlabel("Time Step")
    ax.set_ylabel("Price (USD / INR)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    _save_or_show(fig, save_path)


def plot_portfolio(portfolio_values: np.ndarray,
                   actual_prices: np.ndarray,
                   signals: np.ndarray,
                   initial_capital: float = 10_000.0,
                   save_path: Optional[str] = None) -> None:
    """
    Two-panel chart:
      Top    : actual price overlaid with Buy/Sell markers
      Bottom : portfolio equity curve vs Buy-and-Hold benchmark
    """
    fig = plt.figure(figsize=(14, 9))
    gs = gridspec.GridSpec(2, 1, height_ratios=[1.5, 1], hspace=0.4)

    # --- Panel 1: Price + Signals ---
    ax1 = fig.add_subplot(gs[0])
    ax1.plot(actual_prices, color=PALETTE["actual"], lw=1.5, label="Actual Price")

    buy_idx  = np.where(signals == 1)[0]
    sell_idx = np.where(signals == -1)[0]
    ax1.scatter(buy_idx,  actual_prices[buy_idx],
                color=PALETTE["buy"],  marker="^", s=80, zorder=5, label="Buy")
    ax1.scatter(sell_idx, actual_prices[sell_idx],
                color=PALETTE["sell"], marker="v", s=80, zorder=5, label="Sell")

    ax1.set_title("Trading Signals on Actual Price", fontsize=13, fontweight="bold")
    ax1.set_xlabel("Time Step")
    ax1.set_ylabel("Price")
    ax1.legend(loc="upper left")
    ax1.grid(True, alpha=0.3)

    # --- Panel 2: Portfolio vs Buy-and-Hold ---
    ax2 = fig.add_subplot(gs[1])
    bnh = initial_capital * (actual_prices / actual_prices[0])   # benchmark

    ax2.plot(portfolio_values, color=PALETTE["portfolio"],
             lw=2, label="Strategy Portfolio")
    ax2.plot(bnh, color=PALETTE["actual"], lw=1.5,
             linestyle=":", label="Buy & Hold")
    ax2.axhline(initial_capital, color="gray", linestyle="--", lw=1, alpha=0.6)
    ax2.fill_between(range(len(portfolio_values)),
                     portfolio_values, initial_capital,
                     where=(portfolio_values >= initial_capital),
                     alpha=0.15, color=PALETTE["portfolio"])
    ax2.fill_between(range(len(portfolio_values)),
                     portfolio_values, initial_capital,
                     where=(portfolio_values < initial_capital),
                     alpha=0.15, color=PALETTE["sell"])

    ax2.set_title("Portfolio Equity Curve", fontsize=13, fontweight="bold")
    ax2.set_xlabel("Time Step")
    ax2.set_ylabel("Portfolio Value ($)")
    ax2.legend(loc="upper left")
    ax2.grid(True, alpha=0.3)

    plt.suptitle("Federated Learning Trading System — Backtest",
                 fontsize=15, fontweight="bold", y=1.01)
    _save_or_show(fig, save_path)


def plot_federated_loss(global_losses: List[float],
                        client_loss_history: Dict[str, List[float]],
                        save_path: Optional[str] = None) -> None:
    """
    Two-panel chart:
      Left  : global avg loss per federated round
      Right : per-client local loss across rounds
    """
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    rounds = list(range(1, len(global_losses) + 1))

    # Global loss
    ax1.plot(rounds, global_losses, color=PALETTE["loss"],
             lw=2.5, marker="o", markersize=5)
    ax1.set_title("Global Model Loss (FedAvg)", fontsize=13, fontweight="bold")
    ax1.set_xlabel("Federated Round")
    ax1.set_ylabel("Average MSE Loss")
    ax1.grid(True, alpha=0.3)

    # Per-client loss
    cmap = plt.get_cmap("tab10")
    for idx, (cid, losses) in enumerate(client_loss_history.items()):
        r = list(range(1, len(losses) + 1))
        ax2.plot(r, losses, label=cid, color=cmap(idx % 10),
                 lw=1.5, marker=".", markersize=4, alpha=0.8)

    ax2.set_title("Per-Client Local Loss", fontsize=13, fontweight="bold")
    ax2.set_xlabel("Federated Round")
    ax2.set_ylabel("MSE Loss")
    ax2.legend(loc="upper right", fontsize=8)
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    _save_or_show(fig, save_path)


def print_metrics_table(metrics: Dict[str, float]) -> None:
    """Pretty-print a metrics dict to stdout."""
    separator = "─" * 45
    print(f"\n{separator}")
    print(f"  {'EVALUATION METRICS':^41}")
    print(separator)
    for key, val in metrics.items():
        formatted = f"{val:+.4f}" if "%" not in key else f"{val:+.2f}%"
        print(f"  {key:<28} {formatted:>12}")
    print(separator + "\n")


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------

def _save_or_show(fig: plt.Figure, path: Optional[str]) -> None:
    if path:
        fig.savefig(path, dpi=150, bbox_inches="tight")
        logger.info(f"Plot saved -> {path}")
    else:
        plt.show()
    plt.close(fig)
