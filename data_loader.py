"""
data_loader.py
==============
Handles all data acquisition and preprocessing for the federated trading system.

Responsibilities:
  - Fetch OHLCV data from Yahoo Finance
  - Engineer technical features (SMA, EMA, RSI, MACD, Bollinger Bands)
  - Normalize data using MinMaxScaler per feature
  - Create sliding-window sequences for LSTM input
  - Partition dataset into N client shards (IID or non-IID)
"""

import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler
from typing import List, Tuple, Dict
import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Feature Engineering Helpers
# ---------------------------------------------------------------------------

def compute_rsi(series: pd.Series, window: int = 14) -> pd.Series:
    """Relative Strength Index."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window).mean()
    avg_loss = loss.rolling(window).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    return 100 - (100 / (1 + rs))


def compute_macd(series: pd.Series,
                 fast: int = 12,
                 slow: int = 26,
                 signal: int = 9) -> pd.DataFrame:
    """MACD line and signal line."""
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    return pd.DataFrame({"macd": macd_line, "macd_signal": signal_line})


def compute_bollinger(series: pd.Series, window: int = 20) -> pd.DataFrame:
    """Bollinger Band width and %B."""
    sma = series.rolling(window).mean()
    std = series.rolling(window).std()
    upper = sma + 2 * std
    lower = sma - 2 * std
    bb_width = (upper - lower) / (sma + 1e-9)
    bb_pct = (series - lower) / (upper - lower + 1e-9)
    return pd.DataFrame({"bb_width": bb_width, "bb_pct": bb_pct})


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Augment raw OHLCV DataFrame with technical indicators.

    Input columns expected: Open, High, Low, Close, Volume
    Returns a DataFrame with additional feature columns.
    """
    df = df.copy()
    close = df["Close"]

    # Trend indicators
    df["sma_10"] = close.rolling(10).mean()
    df["sma_30"] = close.rolling(30).mean()
    df["ema_12"] = close.ewm(span=12, adjust=False).mean()

    # Momentum
    df["rsi_14"] = compute_rsi(close, window=14)

    # MACD
    macd_df = compute_macd(close)
    df["macd"] = macd_df["macd"]
    df["macd_signal"] = macd_df["macd_signal"]

    # Volatility
    bb_df = compute_bollinger(close)
    df["bb_width"] = bb_df["bb_width"]
    df["bb_pct"] = bb_df["bb_pct"]

    # Returns
    df["return_1d"] = close.pct_change(1)
    df["return_5d"] = close.pct_change(5)

    # Volume change
    df["volume_change"] = df["Volume"].pct_change(1)

    # Drop NaN rows introduced by rolling windows
    df.dropna(inplace=True)
    df.reset_index(drop=True, inplace=True)

    return df


# ---------------------------------------------------------------------------
# Core Data Fetching
# ---------------------------------------------------------------------------

def fetch_stock_data(ticker: str,
                     start: str = "2018-01-01",
                     end: str = "2024-01-01") -> pd.DataFrame:
    """
    Download historical daily OHLCV data from Yahoo Finance.

    Parameters
    ----------
    ticker : str  e.g. "AAPL", "TSLA", "RELIANCE.NS"
    start  : str  ISO date string
    end    : str  ISO date string

    Returns
    -------
    pd.DataFrame with enriched feature columns.
    """
    logger.info(f"Fetching data for {ticker} ({start} → {end})")
    raw = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)

    if raw.empty:
        raise ValueError(f"No data returned for ticker '{ticker}'. "
                         "Check the symbol or date range.")

    # Flatten MultiIndex columns if present (yfinance ≥ 0.2)
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)

    # Keep only OHLCV
    raw = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
    raw.dropna(inplace=True)
    raw.reset_index(drop=True, inplace=True)

    enriched = add_features(raw)
    logger.info(f"{ticker}: {len(enriched)} rows, {len(enriched.columns)} features")
    return enriched


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------

class DataNormalizer:
    """
    Per-feature MinMax scaling. Stores scalers so we can inverse-transform
    the Close column for evaluation/plotting.
    """

    def __init__(self):
        self.scalers: Dict[str, MinMaxScaler] = {}

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        """Fit scalers on df and return scaled numpy array."""
        scaled_cols = []
        for col in df.columns:
            scaler = MinMaxScaler(feature_range=(0, 1))
            scaled_cols.append(scaler.fit_transform(df[[col]]))
            self.scalers[col] = scaler
        return np.hstack(scaled_cols)  # shape: (T, num_features)

    def inverse_close(self, scaled_values: np.ndarray) -> np.ndarray:
        """Inverse-transform predictions back to original Close price scale."""
        return self.scalers["Close"].inverse_transform(
            scaled_values.reshape(-1, 1)
        ).flatten()


# ---------------------------------------------------------------------------
# Sequence Builder
# ---------------------------------------------------------------------------

def build_sequences(data: np.ndarray,
                    seq_len: int,
                    target_col_idx: int = 3) -> Tuple[np.ndarray, np.ndarray]:
    """
    Slide a window of length `seq_len` over the data to produce (X, y) pairs.

    Parameters
    ----------
    data          : shape (T, F) – scaled feature matrix
    seq_len       : number of past timesteps used as input
    target_col_idx: column index of the target variable (Close = index 3)

    Returns
    -------
    X : shape (N, seq_len, F)
    y : shape (N,)  – next-step scaled Close price
    """
    X, y = [], []
    for i in range(len(data) - seq_len):
        X.append(data[i: i + seq_len])          # input window
        y.append(data[i + seq_len, target_col_idx])  # target: next Close
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


# ---------------------------------------------------------------------------
# Client Data Partitioning
# ---------------------------------------------------------------------------

def partition_data(X: np.ndarray,
                   y: np.ndarray,
                   num_clients: int,
                   iid: bool = True) -> List[Tuple[np.ndarray, np.ndarray]]:
    """
    Split (X, y) into `num_clients` non-overlapping shards.

    IID   : random shuffle then equal split  → similar distributions
    Non-IID: sequential split                → each client sees a different
              time segment (more realistic for FL research)

    Returns
    -------
    List of (X_i, y_i) tuples, one per client.
    """
    n = len(X)
    if iid:
        indices = np.random.permutation(n)
    else:
        indices = np.arange(n)  # temporal order preserved

    shards = np.array_split(indices, num_clients)
    partitions = []
    for shard in shards:
        partitions.append((X[shard], y[shard]))
        logger.debug(f"Client shard size: {len(shard)}")

    return partitions


# ---------------------------------------------------------------------------
# High-Level Pipeline
# ---------------------------------------------------------------------------

def prepare_federated_data(
        tickers: List[str],
        num_clients: int,
        seq_len: int = 30,
        start: str = "2018-01-01",
        end: str = "2024-01-01",
        iid: bool = False
) -> Tuple[List[Tuple[np.ndarray, np.ndarray]], DataNormalizer, pd.DataFrame]:
    """
    End-to-end pipeline:
      1. Fetch & enrich data for each ticker
      2. Concatenate into one dataset
      3. Normalize
      4. Build LSTM sequences
      5. Partition into client shards

    Returns
    -------
    client_data : list of (X_i, y_i) per client
    normalizer  : fitted DataNormalizer (for inverse transforms)
    raw_close   : raw Close prices aligned to sequence targets (for backtesting)
    """
    all_dfs = []
    for ticker in tickers:
        df = fetch_stock_data(ticker, start=start, end=end)
        all_dfs.append(df)

    combined = pd.concat(all_dfs, ignore_index=True)
    logger.info(f"Combined dataset: {len(combined)} rows from {tickers}")

    # Save raw Close for backtesting (aligned to sequence windows)
    normalizer = DataNormalizer()
    scaled = normalizer.fit_transform(combined)

    # Close is column index 3 (Open=0, High=1, Low=2, Close=3)
    close_col_idx = list(combined.columns).index("Close")

    X, y = build_sequences(scaled, seq_len=seq_len, target_col_idx=close_col_idx)
    logger.info(f"Sequences built: X={X.shape}, y={y.shape}")

    # Raw close prices aligned with y (for strategy evaluation)
    raw_close = combined["Close"].values[seq_len:]

    client_data = partition_data(X, y, num_clients=num_clients, iid=iid)
    logger.info(f"Data partitioned into {num_clients} client shards.")

    return client_data, normalizer, raw_close
