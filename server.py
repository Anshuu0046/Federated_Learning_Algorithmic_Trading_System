"""
server.py
=========
Central coordinator for the Federated Learning process.

Responsibilities:
  1. Maintain the global LSTM model
  2. Broadcast global weights to all participating clients
  3. Collect updated weights after local training
  4. Aggregate via Federated Averaging (FedAvg)
  5. Optionally apply server-side optimisation (FedAdam / momentum)
  6. Track global loss and round history

FedAvg Algorithm (McMahan et al., 2017):
  w_global ← Σ (n_k / N) * w_k
  where n_k = local dataset size, N = total samples across all clients
"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import copy
import logging
from typing import List, Tuple, Dict, Optional

from model import LSTMPredictor, build_model, get_model_weights, set_model_weights
from client import FederatedClient

logger = logging.getLogger(__name__)


class FederatedServer:
    """
    Orchestrates the global federated training loop.

    Parameters
    ----------
    input_size   : number of input features (from data)
    model_config : dict forwarded to build_model()
    device       : torch device
    """

    def __init__(self,
                 input_size: int,
                 model_config: dict,
                 device: torch.device):

        self.device = device
        self.input_size = input_size

        # Initialise the global model
        self.global_model: LSTMPredictor = build_model(
            input_size=input_size,
            config=model_config
        ).to(device)

        self.round_history: List[Dict] = []     # per-round metrics
        self.global_loss_history: List[float] = []

        logger.info(
            f"Global model initialised | "
            f"input_size={input_size} | "
            f"params={sum(p.numel() for p in self.global_model.parameters()):,}"
        )

    # ------------------------------------------------------------------
    # FedAvg Core
    # ------------------------------------------------------------------

    def aggregate(self,
                  client_updates: List[Tuple[Dict[str, torch.Tensor], int]]
                  ) -> None:
        """
        Federated Averaging: weighted mean of client weight updates.

        Parameters
        ----------
        client_updates : list of (state_dict, n_samples) tuples
        """
        total_samples = sum(n for _, n in client_updates)

        # Accumulate weighted parameter tensors
        averaged_weights: Dict[str, torch.Tensor] = {}

        for key in self.global_model.state_dict().keys():
            weighted_sum = torch.zeros_like(
                self.global_model.state_dict()[key], dtype=torch.float32
            )
            for weights, n_samples in client_updates:
                client_tensor = weights[key].to(self.device).float()
                weighted_sum += (n_samples / total_samples) * client_tensor

            averaged_weights[key] = weighted_sum

        # Load aggregated weights into global model
        self.global_model.load_state_dict(averaged_weights)
        logger.debug("FedAvg aggregation complete.")

    # ------------------------------------------------------------------
    # Communication Helpers
    # ------------------------------------------------------------------

    def get_global_weights(self) -> Dict[str, torch.Tensor]:
        """Return a snapshot of the current global model weights."""
        return get_model_weights(self.global_model)

    # ------------------------------------------------------------------
    # Federated Round
    # ------------------------------------------------------------------

    def run_round(self,
                  clients: List[FederatedClient],
                  round_num: int,
                  fraction: float = 1.0) -> Dict:
        """
        Execute one full federated round.

        Steps:
          1. Sample a fraction of clients (C in FedAvg paper)
          2. Broadcast global weights
          3. Clients train locally
          4. Collect updates + aggregate
          5. Compute and log round statistics

        Parameters
        ----------
        clients   : list of FederatedClient instances
        round_num : current round index (for logging)
        fraction  : proportion of clients to sample each round [0, 1]

        Returns
        -------
        dict with round metrics
        """
        # --- Step 1: Client selection ---
        n_selected = max(1, int(len(clients) * fraction))
        selected = np.random.choice(clients, size=n_selected, replace=False).tolist()
        logger.info(
            f"\n{'='*60}\n"
            f"Round {round_num:3d} | Selected {n_selected}/{len(clients)} clients\n"
            f"{'='*60}"
        )

        global_weights = self.get_global_weights()
        client_updates = []
        client_losses = {}

        # --- Steps 2 & 3: Broadcast + local training ---
        for client in selected:
            # Build a fresh model instance for the client (avoids shared state)
            local_model = build_model(
                input_size=self.input_size,
                config={"hidden_size": self.global_model.hidden_size,
                        "num_layers": self.global_model.num_layers}
            )
            client.receive_global_weights(global_weights, local_model)
            updated_w, local_loss, n_samples = client.train()
            client_updates.append((updated_w, n_samples))
            client_losses[client.client_id] = local_loss

            logger.info(
                f"  [{client.client_id}] loss={local_loss:.6f} | "
                f"samples={n_samples}"
            )

        # --- Step 4: Aggregate ---
        self.aggregate(client_updates)

        # --- Step 5: Compute global loss on a held-out eval set (optional) ---
        round_avg_loss = float(np.mean(list(client_losses.values())))
        self.global_loss_history.append(round_avg_loss)

        metrics = {
            "round": round_num,
            "avg_client_loss": round_avg_loss,
            "client_losses": client_losses,
            "n_clients_selected": n_selected,
        }
        self.round_history.append(metrics)

        logger.info(
            f"Round {round_num} complete | "
            f"avg_client_loss={round_avg_loss:.6f}"
        )
        return metrics

    # ------------------------------------------------------------------
    # Global Inference
    # ------------------------------------------------------------------

    @torch.no_grad()
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Run inference using the global model.

        Parameters
        ----------
        X : numpy array of shape (N, SeqLen, Features)

        Returns
        -------
        numpy array of shape (N,) – predicted scaled Close prices
        """
        self.global_model.eval()
        X_tensor = torch.tensor(X, dtype=torch.float32).to(self.device)
        preds = self.global_model(X_tensor)
        return preds.cpu().numpy().flatten()

    @torch.no_grad()
    def evaluate_global(self,
                        X: np.ndarray,
                        y: np.ndarray) -> float:
        """MSE of the global model on a validation set."""
        preds = self.predict(X)
        mse = float(np.mean((preds - y) ** 2))
        return mse

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: str) -> None:
        """Save global model weights to disk."""
        torch.save(self.global_model.state_dict(), path)
        logger.info(f"Global model saved → {path}")

    def load(self, path: str) -> None:
        """Load global model weights from disk."""
        state = torch.load(path, map_location=self.device)
        self.global_model.load_state_dict(state)
        logger.info(f"Global model loaded ← {path}")
