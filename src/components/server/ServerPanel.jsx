import React, { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { Play, Pause, Server, Activity, ArrowRight, Share2, CheckCircle2, RotateCcw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import EditorialCard from '../ui/EditorialCard';

const ServerPanel = ({ gameState, onRunRound, onToggleAuto }) => {
    const { globalLoss, isTraining, history } = gameState;

    // Prepare chart data
    const chartData = useMemo(() => {
        if (history.length === 0) return [];
        return history.map(h => ({
            round: h.round,
            loss: h.loss,
            accuracy: h.accuracy * 100
        }));
    }, [history]);

    return (
        <EditorialCard className="h-full flex flex-col pt-8">
            {/* Header */}
            <div className="px-8 pb-6 border-b border-rule flex items-end justify-between">
                <div>
                    <div className="section-label mb-4">Aggregation Server</div>
                    <h2 className="font-serif text-3xl text-ink">Global <em>Weights</em></h2>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={onToggleAuto}
                        className="nav-cta flex items-center gap-2"
                    >
                        {isTraining ? <Pause size={14} /> : <Play size={14} />}
                        {isTraining ? 'Pause' : 'Auto'}
                    </button>
                    <button
                        onClick={onRunRound}
                        disabled={isTraining}
                        className={`nav-cta flex items-center gap-2 ${isTraining ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        <ArrowRight size={14} /> Step
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Timeline Log */}
                <div className="p-8 border-b border-rule">
                    <div className="section-label mb-6">Execution Log</div>
                    <div className="space-y-4">
                        {history.slice(-3).reverse().map((h) => (
                            <Motion.div
                                key={h.round}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="grid grid-cols-[auto_1fr_auto] gap-6 items-center text-sm"
                            >
                                <div className="font-serif italic text-light w-16">Rnd {h.round}</div>
                                <div className="text-mid">
                                    FedAvg aggregation complete. Loss reduced to <span className="text-ink font-medium">{h.loss.toFixed(4)}</span>
                                </div>
                                <div className="flex items-center text-[10px] uppercase tracking-[0.1em] text-accent2">
                                    <CheckCircle2 size={12} className="mr-2" />
                                    Success
                                </div>
                            </Motion.div>
                        ))}
                        {history.length === 0 && (
                            <div className="text-mid text-sm italic">Waiting for initial round...</div>
                        )}
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="p-8 grid grid-rows-2 h-[400px] gap-8">
                    {/* Loss Chart */}
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] uppercase tracking-[0.1em] text-mid">Global Loss Convergence</span>
                            <span className="font-serif text-accent2 text-xl">{globalLoss.toFixed(4)}</span>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-ink)" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="var(--color-ink)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="round" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tickMargin={8} width={40} />
                                    <Tooltip
                                        contentStyle={{ border: 'none' }}
                                        itemStyle={{ color: 'var(--color-cream)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="loss"
                                        stroke="var(--color-ink)"
                                        strokeWidth={2}
                                        fill="url(#lossGradient)"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Protocol Info */}
                    <div className="flex flex-col border-t border-rule pt-8">
                        <div className="section-label mb-6">Algorithm Detail</div>
                        <div className="bg-cream2 p-6 rounded-sm border border-rule">
                            <div className="flex items-center gap-4 mb-4">
                                <Share2 className="text-accent2" size={20} />
                                <h3 className="font-serif text-xl tracking-tight text-ink">Federated Averaging</h3>
                            </div>
                            <div className="font-serif italic text-lg text-mid mb-4">
                                w_global ← Σ(n_k / N) · w_k
                            </div>
                            <p className="text-sm text-mid leading-relaxed">
                                The aggregation server waits for all 5 simulated clients to complete local epochs using their private stock shards. Gradients are collected, volume-weighted, and applied to the central model.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </EditorialCard>
    );
};

export default ServerPanel;
