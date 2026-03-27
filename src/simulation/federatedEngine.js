import { generateStockData, generatePredictions, generateSignals, calculateReturns } from './stockData';

const NUM_CLIENTS = 5;
const MAX_ROUNDS = 20;
const EPOCHS_PER_ROUND = 10;

function seededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function createClient(id) {
    const stockData = generateStockData(id);
    const predictions = generatePredictions(stockData, id);
    const signals = generateSignals(stockData);
    const returns = calculateReturns(stockData);

    return {
        id,
        name: `Client ${id + 1}`,
        status: 'idle', // idle | training | uploading | updated
        stockData,
        predictions,
        signals,
        returns,
        currentEpoch: 0,
        totalEpochs: EPOCHS_PER_ROUND,
        lossHistory: [],
        currentLoss: 1.0,
        accuracy: 0,
        weights: Array.from({ length: 10 }, () => Math.random() * 2 - 1),
    };
}

function fedAvg(clientWeights) {
    const numClients = clientWeights.length;
    const numWeights = clientWeights[0].length;
    const avgWeights = new Array(numWeights).fill(0);

    for (let i = 0; i < numWeights; i++) {
        for (let c = 0; c < numClients; c++) {
            avgWeights[i] += clientWeights[c][i];
        }
        avgWeights[i] /= numClients;
    }

    return avgWeights;
}

export function createFederatedEngine() {
    const clients = Array.from({ length: NUM_CLIENTS }, (_, i) => createClient(i));
    const rng = seededRandom(99);

    let currentRound = 0;
    let globalWeights = Array.from({ length: 10 }, () => rng() * 2 - 1);
    let globalLoss = 1.0;
    let globalAccuracy = 0.5;
    let roundHistory = [];
    let phase = 'idle'; // idle | training | aggregating | distributing

    function simulateTrainingStep(client) {
        if (client.currentEpoch >= client.totalEpochs) return client;

        const decay = 0.85 + rng() * 0.1;
        const noise = (rng() - 0.5) * 0.05;
        client.currentLoss = Math.max(0.01, client.currentLoss * decay + noise);
        client.currentEpoch += 1;
        client.accuracy = Math.min(0.99, 1 - client.currentLoss + rng() * 0.1);
        client.lossHistory.push({
            epoch: client.lossHistory.length + 1,
            loss: Math.round(client.currentLoss * 10000) / 10000,
            round: currentRound,
        });

        // Update local weights with noise
        client.weights = client.weights.map(
            (w) => w + (rng() - 0.5) * 0.1 * client.currentLoss
        );

        client.status = client.currentEpoch >= client.totalEpochs ? 'uploading' : 'training';
        return client;
    }

    function runRound() {
        if (currentRound >= MAX_ROUNDS) return getState();

        currentRound += 1;
        phase = 'training';

        // Reset clients for new round
        clients.forEach((c) => {
            c.currentEpoch = 0;
            c.currentLoss = Math.max(0.05, globalLoss * (0.8 + rng() * 0.4));
            c.status = 'training';
        });

        // Simulate all epochs for each client
        clients.forEach((client) => {
            for (let e = 0; e < EPOCHS_PER_ROUND; e++) {
                simulateTrainingStep(client);
            }
            client.status = 'uploading';
        });

        // Aggregation
        phase = 'aggregating';
        const clientWeights = clients.map((c) => c.weights);
        globalWeights = fedAvg(clientWeights);
        globalLoss = clients.reduce((s, c) => s + c.currentLoss, 0) / clients.length;
        globalAccuracy = clients.reduce((s, c) => s + c.accuracy, 0) / clients.length;

        // Distribution
        phase = 'distributing';
        clients.forEach((c) => {
            c.weights = [...globalWeights];
            c.status = 'updated';
        });

        roundHistory.push({
            round: currentRound,
            globalLoss: Math.round(globalLoss * 10000) / 10000,
            globalAccuracy: Math.round(globalAccuracy * 10000) / 10000,
            clientLosses: clients.map((c) => Math.round(c.currentLoss * 10000) / 10000),
            clientAccuracies: clients.map(
                (c) => Math.round(c.accuracy * 10000) / 10000
            ),
        });

        phase = 'idle';
        return getState();
    }

    function getState() {
        return {
            clients: clients.map((c) => ({
                ...c,
                stockData: c.stockData,
                predictions: c.predictions,
                signals: c.signals,
                returns: c.returns,
            })),
            server: {
                currentRound,
                maxRounds: MAX_ROUNDS,
                globalWeights: [...globalWeights],
                globalLoss: Math.round(globalLoss * 10000) / 10000,
                globalAccuracy: Math.round(globalAccuracy * 10000) / 10000,
                roundHistory: [...roundHistory],
                phase,
            },
        };
    }

    // Run initial rounds for data
    for (let i = 0; i < 8; i++) {
        runRound();
    }

    return {
        getState,
        runRound,
        clients,
    };
}

export class FederatedEngine {
    constructor() {
        this._engine = createFederatedEngine();
        this.isTraining = false;
        this.autoPilotInterval = null;
        this.updateState();
    }

    updateState() {
        const state = this._engine.getState();
        this.globalRound = state.server.currentRound;
        this.globalLoss = state.server.globalLoss;
        this.globalAccuracy = state.server.globalAccuracy;
        this.history = state.server.roundHistory.map(h => ({
            round: h.round,
            loss: h.globalLoss,
            accuracy: h.globalAccuracy
        }));

        // Map clients to provide the flat properties expected by ClientCard / ClientDetail
        this.clients = state.clients.map(c => {
            const len = c.stockData.length;
            const lastData = c.stockData[len - 1] || { price: 100 };
            const lastPred = c.predictions[len - 1] || { predicted: 100 };
            const lastSig = c.signals[len - 1] || { signal: 'HOLD' };

            return {
                ...c,
                loss: c.currentLoss,
                dataSize: len,
                actual: lastData.price,
                prediction: lastPred.predicted,
                signal: lastSig.signal,
                confidence: 65 + Math.random() * 30, // Mock confidence percentage
                history: c.stockData.map((d, i) => ({
                    time: d.date,
                    actual: d.price,
                    predicted: c.predictions[i] ? c.predictions[i].predicted : d.price
                }))
            };
        });
    }

    runFederatedRound() {
        if (this.isTraining) return;
        this.isTraining = true;
        this.updateState();

        // Simulate a delay for the UI to show 'training'/'uploading' state transitions
        setTimeout(() => {
            this._engine.runRound();
            this.isTraining = false;
            this.updateState();
        }, 1500);
    }

    toggleAutoPilot() {
        if (this.autoPilotInterval) {
            clearInterval(this.autoPilotInterval);
            this.autoPilotInterval = null;
            this.isTraining = false;
        } else {
            this.runFederatedRound();
            this.autoPilotInterval = setInterval(() => {
                if (!this.isTraining) {
                    this.runFederatedRound();
                }
            }, 3000);
        }
    }
}
