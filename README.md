# Federated Learning Algorithmic Trading System

A decentralised stock price prediction and trading system that trains a global LSTM model across multiple clients without sharing raw data — implementing the **FedAvg** algorithm.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      FEDERATED SERVER                        │
│   Global LSTM Model  ←──── FedAvg Aggregation               │
│        │  ↑                                                  │
│   Broadcast weights   Receive updated weights                │
└────┬───┴──────────────────────────────────────────┬─────────┘
     │                                              │
┌────▼──────┐   ┌───────────┐   ...   ┌────────────▼──────┐
│ Client 1  │   │ Client 2  │         │    Client N       │
│ AAPL data │   │ TSLA data │         │  RELIANCE data    │
│ Local LSTM│   │ Local LSTM│         │  Local LSTM       │
└───────────┘   └───────────┘         └───────────────────┘
```

### Data Flow (privacy-preserving)
1. Each client holds its own private stock data (never leaves the device)
2. Server broadcasts global model weights → each client
3. Each client trains locally for N epochs
4. Clients send *only model weights* (not raw data) back to server
5. Server aggregates via weighted FedAvg → new global model
6. Repeat for R rounds

---

## Project Structure

```
federated_trading/
├── data_loader.py        # Yahoo Finance fetch, feature engineering, partitioning
├── model.py              # LSTM architecture (PyTorch)
├── client.py             # Federated client (local training)
├── server.py             # FedAvg server (aggregation)
├── train.py              # Main pipeline (entry point)
├── utils.py              # Metrics, signals, backtesting, plotting
├── flower_simulation.py  # (Optional) Flower framework integration
├── requirements.txt
└── README.md
```

---

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the full pipeline
```bash
python train.py
```

### 3. (Optional) Flower simulation
```bash
pip install flwr
python flower_simulation.py
```

---

## Configuration

All settings are in the `CONFIG` dict at the top of `train.py`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `tickers` | AAPL, TSLA, MSFT, AMZN, GOOGL | Stock symbols to train on |
| `num_clients` | 5 | Number of federated participants |
| `fl_rounds` | 15 | Total federated communication rounds |
| `local_epochs` | 3 | Local training epochs per client per round |
| `seq_len` | 30 | Look-back window in days |
| `hidden_size` | 128 | LSTM hidden units |
| `buy_threshold` | 0.005 | Min predicted upside to trigger BUY |
| `iid_split` | False | Temporal (non-IID) partition for realism |

---

## LSTM Model

```
Input (B, 30, F)
     ↓
LSTM × 2 layers (hidden=128, dropout=0.2)
     ↓
Last timestep hidden state
     ↓
LayerNorm → Linear(128→64) → ReLU → Dropout → Linear(64→1)
     ↓
Predicted next Close price (scaled)
```

Features (F = 15):
- OHLCV (5)
- SMA-10, SMA-30, EMA-12 (3)
- RSI-14 (1)
- MACD, MACD Signal (2)
- Bollinger Width, %B (2)
- 1-day return, 5-day return (2)

---

## Trading Strategy

| Signal | Condition |
|--------|-----------|
| **BUY** | `predicted / current > 1 + 0.005` |
| **SELL** | `predicted / current < 1 - 0.002` |
| **HOLD** | otherwise |

Backtest rules:
- Long-only strategy
- 0.1% transaction cost per trade
- Initial capital: $10,000

---

## Evaluation Metrics

| Metric | Description |
|--------|-------------|
| RMSE | Prediction error in original price scale |
| MAE | Mean absolute prediction error |
| MAPE % | Mean absolute percentage error |
| Sharpe Ratio | Risk-adjusted return (annualised, 252 days) |
| Max Drawdown % | Worst peak-to-trough equity decline |
| Cumulative Return % | Total strategy return over backtest period |

---

## Output Files (`outputs/`)

| File | Description |
|------|-------------|
| `predictions.png` | Predicted vs actual price chart |
| `portfolio.png` | Equity curve + buy/sell signals |
| `federated_loss.png` | Global & per-client loss across rounds |
| `global_model.pt` | Saved global model weights |
| `training.log` | Full training log |

---

## Extending the System

### Add more stocks
```python
CONFIG["tickers"] = ["AAPL", "TSLA", "RELIANCE.NS", "TCS.NS", "INFY.NS"]
```

### Switch to FedProx (alternative aggregation)
Replace `server.aggregate()` with proximal term minimisation:
```python
# Add μ/2 * ||w - w_global||² to local loss
```

### Add differential privacy
```python
from opacus import PrivacyEngine
privacy_engine = PrivacyEngine()
model, optimizer, loader = privacy_engine.make_private(...)
```

### Use Flower for real distributed training
See `flower_simulation.py` — replace `start_simulation` with
`fl.server.start_server` + per-client `fl.client.start_client`.

---

## References

- McMahan et al. (2017). *Communication-Efficient Learning of Deep Networks from Decentralized Data*. [FedAvg paper]
- Beutel et al. (2020). *Flower: A Friendly Federated Learning Research Framework*.
- Hochreiter & Schmidhuber (1997). *Long Short-Term Memory*.
