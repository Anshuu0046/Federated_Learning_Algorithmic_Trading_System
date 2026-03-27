import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Activity, Shield, Users, Cpu, Database, Network as NetworkIcon, Globe } from 'lucide-react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import ServerPanel from '../components/server/ServerPanel';
import ClientCard from '../components/clients/ClientCard';
import ClientDetail from '../components/clients/ClientDetail';
import NetworkTopology from '../components/server/NetworkTopology';
import AnalyticsCharts from '../components/charts/AnalyticsCharts';
import EditorialCard from '../components/ui/EditorialCard';
import { FederatedEngine } from '../simulation/federatedEngine';

// Force HMR reload
const engine = new FederatedEngine(5);

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedClient, setSelectedClient] = useState(null);
    const [gameState, setGameState] = useState({
        globalRound: 0,
        globalLoss: 0,
        globalAccuracy: 0,
        isTraining: false,
        clients: [],
        history: []
    });

    useEffect(() => {
        const updateState = () => {
            setGameState({
                globalRound: engine.globalRound,
                globalLoss: engine.globalLoss,
                globalAccuracy: engine.globalAccuracy,
                isTraining: engine.isTraining,
                clients: engine.clients,
                history: engine.history
            });
        };

        updateState();
        const interval = setInterval(updateState, 100);
        return () => clearInterval(interval);
    }, []);

    const handleRunRound = () => {
        engine.runFederatedRound();
    };

    const handleToggleAuto = () => {
        engine.toggleAutoPilot();
    };

    return (
        <div className="min-h-screen bg-cream text-ink flex flex-col font-sans">
            <Header round={gameState.globalRound} />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

                <main className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <AnimatePresence mode="wait">

                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <Motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="max-w-[1600px] mx-auto space-y-12"
                            >
                                {/* Top Stats Editorial Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-l border-rule">
                                    <div className="p-8 border-r border-b border-rule bg-white transition-colors hover:bg-cream2">
                                        <div className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-mid mb-6">
                                            <div className="w-4 h-px bg-light"></div>
                                            Global Loss
                                        </div>
                                        <div className="font-serif text-5xl tracking-[-0.03em] text-accent2">
                                            {gameState.globalLoss.toFixed(4)}
                                        </div>
                                    </div>

                                    <div className="p-8 border-r border-b border-rule bg-white transition-colors hover:bg-cream2">
                                        <div className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-mid mb-6">
                                            <div className="w-4 h-px bg-light"></div>
                                            Global Accuracy
                                        </div>
                                        <div className="font-serif text-5xl tracking-[-0.03em] text-ink">
                                            {(gameState.globalAccuracy * 100).toFixed(1)}%
                                        </div>
                                    </div>

                                    <div className="p-8 border-r border-b border-rule bg-white transition-colors hover:bg-cream2">
                                        <div className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-mid mb-6">
                                            <div className="w-4 h-px bg-light"></div>
                                            Active Nodes
                                        </div>
                                        <div className="font-serif text-5xl tracking-[-0.03em] text-accent">
                                            {gameState.clients.length}
                                        </div>
                                    </div>

                                    <div className="p-8 border-r border-b border-rule bg-white transition-colors hover:bg-cream2">
                                        <div className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-mid mb-6">
                                            <div className="w-4 h-px bg-light"></div>
                                            Training Round
                                        </div>
                                        <div className="font-serif text-5xl tracking-[-0.03em] text-ink">
                                            {gameState.globalRound} <span className="text-xl text-light">/ 15</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                    {/* Left Column - Network Topology */}
                                    <div className="xl:col-span-2">
                                        <EditorialCard className="h-[460px] p-8 flex flex-col">
                                            <div className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase text-mid mb-8">
                                                <div className="w-4 h-px bg-light"></div>
                                                Federated Network Topology
                                            </div>
                                            <div className="flex-1 border border-rule bg-cream/50 relative overflow-hidden">
                                                <NetworkTopology
                                                    clients={gameState.clients}
                                                    isTraining={gameState.isTraining}
                                                    globalRound={gameState.globalRound}
                                                />
                                            </div>
                                        </EditorialCard>
                                    </div>

                                    {/* Right Column - Server Controls */}
                                    <div className="xl:col-span-1">
                                        <ServerPanel
                                            gameState={gameState}
                                            onRunRound={handleRunRound}
                                            onToggleAuto={handleToggleAuto}
                                        />
                                    </div>
                                </div>

                                {/* Signals / Client Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="font-serif text-4xl tracking-[-0.02em]">Market <em>Nodes</em></h2>
                                        </div>
                                        {selectedClient && (
                                            <button
                                                onClick={() => setSelectedClient(null)}
                                                className="text-[10px] tracking-[0.2em] uppercase text-mid hover:text-ink transition-colors interactive pb-1 border-b border-mid/30 hover:border-ink"
                                            >
                                                ← Back to Grid
                                            </button>
                                        )}
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {selectedClient ? (
                                            <Motion.div
                                                key="client-detail"
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <ClientDetail
                                                    client={selectedClient}
                                                    onClose={() => setSelectedClient(null)}
                                                />
                                            </Motion.div>
                                        ) : (
                                            <Motion.div
                                                key="client-grid"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-0 border-t border-l border-rule"
                                            >
                                                {gameState.clients.map((client, idx) => (
                                                    <ClientCard
                                                        key={client.id}
                                                        client={client}
                                                        delay={idx * 0.1}
                                                        onClick={() => setSelectedClient(client)}
                                                    />
                                                ))}
                                            </Motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </Motion.div>
                        )}

                        {/* ANALYTICS TAB */}
                        {activeTab === 'analytics' && (
                            <Motion.div
                                key="analytics"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="max-w-[1600px] mx-auto"
                            >
                                <div className="mb-12">
                                    <h2 className="font-serif text-5xl tracking-[-0.02em] mb-4">Trading <em>Performance</em></h2>
                                    <p className="text-mid max-w-2xl leading-relaxed">
                                        Backtest results and portfolio simulated metrics across the federated learning protocol.
                                    </p>
                                </div>

                                <AnalyticsCharts history={gameState.history} clients={gameState.clients} />
                            </Motion.div>
                        )}

                        {/* NETWORK TAB */}
                        {activeTab === 'network' && (
                            <Motion.div
                                key="network"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="max-w-[1600px] mx-auto h-[80vh] flex flex-col"
                            >
                                <div className="mb-8">
                                    <h2 className="font-serif text-5xl tracking-[-0.02em] mb-4">Federated <em>Protocol</em></h2>
                                    <p className="text-mid">Real-time visualization of the privacy-preserving model aggregation.</p>
                                </div>

                                <EditorialCard className="flex-1 p-8 flex flex-col">
                                    <div className="flex-1 border border-rule bg-cream/50 relative">
                                        <NetworkTopology
                                            clients={gameState.clients}
                                            isTraining={gameState.isTraining}
                                            globalRound={gameState.globalRound}
                                            fullScreen={true}
                                        />
                                    </div>
                                </EditorialCard>
                            </Motion.div>
                        )}

                        {/* PRIVACY TAB */}
                        {activeTab === 'security' && (
                            <Motion.div
                                key="security"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="max-w-4xl mx-auto py-12"
                            >
                                <div className="text-center mb-16">
                                    <div className="section-label justify-center mb-8">NEXUS Security</div>
                                    <h2 className="font-serif text-5xl md:text-7xl tracking-[-0.02em] mb-6">Zero <em>Raw Data</em> shared.</h2>
                                    <p className="text-lg text-mid max-w-2xl mx-auto leading-relaxed">
                                        The intelligence travels. The data stays local. A cryptographic approach to enterprise machine learning.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <EditorialCard className="p-10">
                                        <Shield className="text-accent2 w-8 h-8 mb-6" />
                                        <h3 className="font-serif text-2xl mb-4">Local Execution</h3>
                                        <p className="text-mid leading-relaxed">
                                            All backpropagation runs on the client node's local machine using isolated data shards. The central server has zero access to the underlying time-series data or trading history.
                                        </p>
                                    </EditorialCard>

                                    <EditorialCard className="p-10">
                                        <Database className="text-accent w-8 h-8 mb-6" />
                                        <h3 className="font-serif text-2xl mb-4">Weight Aggregation</h3>
                                        <p className="text-mid leading-relaxed">
                                            Only parameter deltas (gradients/weights) are transmitted across the network. These vectors reveal nothing about individual trading patterns or raw stock prices.
                                        </p>
                                    </EditorialCard>

                                    <EditorialCard className="p-10">
                                        <Activity className="text-ink w-8 h-8 mb-6" />
                                        <h3 className="font-serif text-2xl mb-4">FedAvg Protocol</h3>
                                        <p className="text-mid leading-relaxed">
                                            The core aggregation algorithm uses canonical Federated Averaging. The global model is simply a weighted mean of the local parameters based on dataset size.
                                        </p>
                                    </EditorialCard>

                                    <EditorialCard className="p-10">
                                        <Cpu className="text-mid w-8 h-8 mb-6" />
                                        <h3 className="font-serif text-2xl mb-4">Homomorphic Ready</h3>
                                        <p className="text-mid leading-relaxed">
                                            The architecture is designed to support Fully Homomorphic Encryption (FHE) in v2, allowing the server to aggregate weights without ever decrypting them.
                                        </p>
                                    </EditorialCard>
                                </div>
                            </Motion.div>
                        )}

                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
