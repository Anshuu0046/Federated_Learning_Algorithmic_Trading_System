import { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { Play, Pause, ArrowRight, Share2, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import EditorialCard from '../ui/EditorialCard';

const ServerPanel = ({ gameState, onRunRound, onToggleAuto }) => {
    const { globalLoss, isTraining, history } = gameState;

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
            <div className="px-8 pb-6 border-b border-outline-variant/30 flex items-end justify-between">
                <div>
                    <div className="section-label mb-4">Aggregation Server</div>
                    <h2 className="text-3xl font-bold text-on-surface" style={{ fontFamily: 'Manrope' }}>Global <em className="text-primary">Weights</em></h2>
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
                        className={`nav-cta flex items-center gap-2 ${isTraining ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <ArrowRight size={14} /> Step
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Timeline Log */}
                <div className="p-8 border-b border-outline-variant/30">
                    <div className="section-label mb-6">Execution Log</div>
                    <div className="space-y-4">
                        {history.slice(-3).reverse().map((h) => (
                            <Motion.div
                                key={h.round}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="grid grid-cols-[auto_1fr_auto] gap-6 items-center text-sm"
                            >
                                <div className="italic text-outline w-16" style={{ fontFamily: 'Manrope' }}>Rnd {h.round}</div>
                                <div className="text-on-surface-variant">
                                    FedAvg aggregation complete. Loss reduced to <span className="text-on-surface font-medium">{h.loss.toFixed(4)}</span>
                                </div>
                                <div className="flex items-center text-[10px] uppercase tracking-[0.1em] text-tertiary">
                                    <CheckCircle2 size={12} className="mr-2" />
                                    Success
                                </div>
                            </Motion.div>
                        ))}
                        {history.length === 0 && (
                            <div className="text-on-surface-variant text-sm italic">Waiting for initial round...</div>
                        )}
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="p-8 grid grid-rows-2 h-[400px] gap-8">
                    {/* Loss Chart */}
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">Global Loss Convergence</span>
                            <span className="text-xl text-tertiary font-bold" style={{ fontFamily: 'Manrope' }}>{globalLoss.toFixed(4)}</span>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="round" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tickMargin={8} width={40} />
                                    <Tooltip
                                        contentStyle={{ border: 'none' }}
                                        itemStyle={{ color: 'var(--color-on-surface)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="loss"
                                        stroke="var(--color-primary)"
                                        strokeWidth={2}
                                        fill="url(#lossGradient)"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Protocol Info */}
                    <div className="flex flex-col border-t border-outline-variant/30 pt-8">
                        <div className="section-label mb-6">Algorithm Detail</div>
                        <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/30">
                            <div className="flex items-center gap-4 mb-4">
                                <Share2 className="text-tertiary" size={20} />
                                <h3 className="text-xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Manrope' }}>Federated Averaging</h3>
                            </div>
                            <div className="italic text-lg text-primary mb-4" style={{ fontFamily: 'Manrope' }}>
                                w_global ← Σ(n_k / N) · w_k
                            </div>
                            <p className="text-sm text-on-surface-variant leading-relaxed">
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
