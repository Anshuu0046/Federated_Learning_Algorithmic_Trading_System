"""
client.py
=========
Represents a single federated learning participant.

Each client:
  1. Holds a private local dataset (never shared with the server)
  2. Receives the current global model weights from the server
  3. Trains locally for `local_epochs` using its own data
  4. Returns the updated model weights (gradients never leave the client)

This simulates the privacy-preserving property of Federated Learning:
  only model *parameters* (not raw data) are communicated.
"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import logging
from typing import Dict, Tuple

from model import LSTMPredictor, get_model_weights, set_model_weights

logger = logging.getLogger(__name__)


class FederatedClient:
    """
    A single node in the federated network.

    Parameters
    ----------
    client_id    : unique identifier string
    X_train      : numpy array of shape (N, SeqLen, Features)
    y_train      : numpy array of shape (N,)
    config       : training hyper-parameters
    device       : torch device
    """

    def __init__(self,
                 client_id: str,
                 X_train: np.ndarray,
                 y_train: np.ndarray,
                 config: dict,
                 device: torch.device):

        self.client_id = client_id
        self.device = device
        self.config = config

        # Build PyTorch DataLoader from local data
        X_tensor = torch.tensor(X_train, dtype=torch.float32)
        y_tensor = torch.tensor(y_train, dtype=torch.float32).unsqueeze(1)

        dataset = TensorDataset(X_tensor, y_tensor)
        self.loader = DataLoader(
            dataset,
            batch_size=config.get("batch_size", 32),
            shuffle=True,
            drop_last=False,
            num_workers=0,
            pin_memory=(device.type == "cuda")
        )

        self.n_samples = len(X_train)
        self.input_size = X_train.shape[2]  # number of features

        # Local model (weights synced from server each round)
        self.model: LSTMPredictor = None

        # Training history
        self.loss_history = []

    # ------------------------------------------------------------------
    # Weight Synchronisation
    # ------------------------------------------------------------------

    def receive_global_weights(self,
                               global_weights: Dict[str, torch.Tensor],
                               model: LSTMPredictor) -> None:
        """
        Replace local model weights with the global model weights.
        Called at the START of every federated round.
        """
        self.model = model
        set_model_weights(self.model, global_weights)
        self.model.to(self.device)

    # ------------------------------------------------------------------
    # Local Training
    # ------------------------------------------------------------------

    def train(self) -> Tuple[Dict[str, torch.Tensor], float, int]:
        """
        Run local training for `local_epochs` on the private dataset.

        Returns
        -------
        updated_weights : state_dict after local training
        avg_loss        : mean training loss over all local epochs
        n_samples       : size of local dataset (used for weighted averaging)
        """
        if self.model is None:
            raise RuntimeError("Call receive_global_weights() before train().")

        local_epochs = self.config.get("local_epochs", 3)
        lr = self.config.get("learning_rate", 1e-3)
        weight_decay = self.config.get("weight_decay", 1e-5)

        self.model.train()
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=lr,
            weight_decay=weight_decay
        )
        scheduler = torch.optim.lr_scheduler.StepLR(
            optimizer, step_size=2, gamma=0.9
        )

        epoch_losses = []

        for epoch in range(local_epochs):
            batch_losses = []

            for X_batch, y_batch in self.loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)

                optimizer.zero_grad()
                preds = self.model(X_batch)          # (B, 1)
                loss = criterion(preds, y_batch)
                loss.backward()

                # Gradient clipping to prevent exploding gradients in LSTM
                nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)

                optimizer.step()
                batch_losses.append(loss.item())

            epoch_loss = np.mean(batch_losses)
            epoch_losses.append(epoch_loss)
            scheduler.step()

        avg_loss = float(np.mean(epoch_losses))
        self.loss_history.append(avg_loss)

        updated_weights = get_model_weights(self.model)
        logger.debug(
            f"[{self.client_id}] local training complete | "
            f"avg_loss={avg_loss:.6f} | samples={self.n_samples}"
        )

        return updated_weights, avg_loss, self.n_samples

    # ------------------------------------------------------------------
    # Local Evaluation (optional, for per-client metrics)
    # ------------------------------------------------------------------

    @torch.no_grad()
    def evaluate(self) -> float:
        """Compute MSE on the client's own data using current model weights."""
        if self.model is None:
            return float("inf")

        self.model.eval()
        criterion = nn.MSELoss()
        total_loss = 0.0
        total_batches = 0

        for X_batch, y_batch in self.loader:
            X_batch = X_batch.to(self.device)
            y_batch = y_batch.to(self.device)
            preds = self.model(X_batch)
            loss = criterion(preds, y_batch)
            total_loss += loss.item()
            total_batches += 1

        return total_loss / max(total_batches, 1)

    def __repr__(self) -> str:
        return (f"FederatedClient(id={self.client_id}, "
                f"samples={self.n_samples}, "
                f"input_size={self.input_size})")
