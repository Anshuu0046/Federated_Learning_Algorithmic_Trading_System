"""
model.py
========
Defines the LSTM-based price prediction model in PyTorch.

Architecture:
  Input  → [Batch, SeqLen, Features]
  LSTM   → stacked recurrent layers with dropout
  Linear → single scalar prediction (next Close, scaled 0-1)

Design choices:
  - Bidirectional LSTM disabled by default (can be toggled for research)
  - Batch normalisation applied after linear head for training stability
  - Weight initialisation follows Xavier uniform for gates
"""

import torch
import torch.nn as nn
import copy
from typing import Dict, Any


class LSTMPredictor(nn.Module):
    """
    Multi-layer LSTM for univariate / multivariate time-series regression.

    Parameters
    ----------
    input_size   : number of input features (F)
    hidden_size  : number of LSTM hidden units per layer
    num_layers   : depth of stacked LSTM
    dropout      : dropout probability between LSTM layers (ignored if num_layers=1)
    output_size  : prediction horizon (1 = next step)
    bidirectional: if True, doubles hidden representation
    """

    def __init__(self,
                 input_size: int,
                 hidden_size: int = 128,
                 num_layers: int = 2,
                 dropout: float = 0.2,
                 output_size: int = 1,
                 bidirectional: bool = False):
        super().__init__()

        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.bidirectional = bidirectional
        self.num_directions = 2 if bidirectional else 1

        # Core recurrent backbone
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0.0,
            batch_first=True,          # (batch, seq, feature)
            bidirectional=bidirectional
        )

        # Projection head
        lstm_out_dim = hidden_size * self.num_directions
        self.head = nn.Sequential(
            nn.LayerNorm(lstm_out_dim),
            nn.Linear(lstm_out_dim, 64),
            nn.ReLU(),
            nn.Dropout(p=dropout),
            nn.Linear(64, output_size)
        )

        self._init_weights()

    def _init_weights(self):
        """Xavier uniform initialisation for all LSTM weight matrices."""
        for name, param in self.lstm.named_parameters():
            if "weight_ih" in name:
                nn.init.xavier_uniform_(param.data)
            elif "weight_hh" in name:
                nn.init.orthogonal_(param.data)
            elif "bias" in name:
                param.data.fill_(0)
                # Set forget gate bias to 1 (reduces vanishing gradient)
                n = param.size(0)
                param.data[n // 4: n // 2].fill_(1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Parameters
        ----------
        x : Tensor of shape (B, SeqLen, F)

        Returns
        -------
        Tensor of shape (B, output_size) – predicted next price(s)
        """
        # lstm_out: (B, SeqLen, hidden * num_directions)
        lstm_out, _ = self.lstm(x)

        # Use the last timestep's output as the sequence representation
        last_hidden = lstm_out[:, -1, :]  # (B, hidden * num_directions)

        return self.head(last_hidden)     # (B, output_size)


# ---------------------------------------------------------------------------
# Weight Utilities (used by FedAvg)
# ---------------------------------------------------------------------------

def get_model_weights(model: nn.Module) -> Dict[str, torch.Tensor]:
    """Return a deep copy of the model's state_dict (detached from graph)."""
    return copy.deepcopy(model.state_dict())


def set_model_weights(model: nn.Module,
                      weights: Dict[str, torch.Tensor]) -> None:
    """Load a state_dict into the model in-place."""
    model.load_state_dict(copy.deepcopy(weights))


def count_parameters(model: nn.Module) -> int:
    """Count total trainable parameters."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def build_model(input_size: int,
                config: Dict[str, Any] = None) -> LSTMPredictor:
    """
    Convenience factory that accepts a config dict.

    Default config:
        hidden_size  : 128
        num_layers   : 2
        dropout      : 0.2
        output_size  : 1
        bidirectional: False
    """
    cfg = {
        "hidden_size": 128,
        "num_layers": 2,
        "dropout": 0.2,
        "output_size": 1,
        "bidirectional": False,
    }
    if config:
        cfg.update(config)

    model = LSTMPredictor(input_size=input_size, **cfg)
    return model
