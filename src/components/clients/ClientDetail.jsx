import React, { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Clock, Activity, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import EditorialCard from '../ui/EditorialCard';

const ClientDetail = ({ client }) => {
    const { id, name, loss, dataSize, status, prediction, actual, history, signal, confidence } = client;

    // Prepare chart data matching editorial style
    const chartData = useMemo(() => {
        if (!history) return [];
        return history.map(h => ({
            time: h.time,
            actual: h.actual,
            predicted: h.predicted
        }));
    }, [history]);

    const getSignalColor = (sig) => {
        switch (sig) {
            case 'BUY': return 'text-accent2';
            case 'SELL': return 'text-danger';
            default: return 'text-[#6b5c28]';
        }
    };

    return (
        <EditorialCard className="p-8 h-[650px] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-rule">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="text-[10px] tracking-[0.2em] uppercase text-mid">0{id}</div>
                        <div className="w-1 h-1 rounded-full bg-light"></div>
                        <div className={`text-[10px] tracking-[0.1em] uppercase ${status === 'training' ? 'text-accent animate-pulse' : 'text-mid'}`}>
                            {status === 'training' ? 'Computing' : 'Standing By'}
                        </div>
                    </div>
                    <h2 className="font-serif text-5xl tracking-[-0.02em] text-ink mb-2">{name}</h2>
                    <p className="text-mid text-sm">Federated Model Shard — {dataSize} Data Points</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="font-serif text-3xl tracking-tight text-ink">
                        ${actual.toFixed(2)}
                    </div>
                    <div className="text-[10px] tracking-[0.1em] uppercase text-mid">Current Price</div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-12">
                {/* Left Side - Stats */}
                <div className="w-1/3 flex flex-col gap-8">
                    <div className="bg-cream2 p-6 border border-rule">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-[0.1em] text-mid">Current Signal</span>
                            <Activity size={14} className="text-light" />
                        </div>
                        <div className={`font-serif text-4xl mb-4 ${getSignalColor(signal)}`}>
                            {signal}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-mid">
                                <span>Confidence</span>
                                <span>{confidence.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-1 bg-rule overflow-hidden">
                                <div
                                    className={`h-full ${signal === 'BUY' ? 'bg-accent2' : signal === 'SELL' ? 'bg-danger' : 'bg-[#6b5c28]'}`}
                                    style={{ width: `${confidence}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-rule border border-rule">
                        <div className="bg-white p-6">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-mid mb-2">Local Loss</div>
                            <div className="font-serif text-2xl text-ink">{loss.toFixed(4)}</div>
                        </div>
                        <div className="bg-white p-6">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-mid mb-2">Forecast</div>
                            <div className="font-serif text-2xl text-ink">${prediction.toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-6 col-span-2">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-mid mb-2 flex items-center gap-2">
                                <Database size={12} /> Dataset Horizon
                            </div>
                            <div className="text-sm text-ink font-serif italic text-lg opacity-80 mt-2">
                                Last 200 trading days
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Chart */}
                <div className="flex-1 flex flex-col border-l border-rule pl-12">
                    <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-mid mb-6">
                        <div className="w-4 h-px bg-light"></div>
                        Price Prediction Time Series
                    </div>

                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={12}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={12}
                                    width={60}
                                />
                                <Tooltip
                                    contentStyle={{ border: 'none' }}
                                    itemStyle={{ color: 'var(--color-cream)' }}
                                    labelStyle={{ color: 'var(--color-light)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    stroke="var(--color-ink)"
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                    name="Observed Price"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="predicted"
                                    stroke="var(--color-accent2)"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    isAnimationActive={false}
                                    name="Model Forecast"
                                />

                                {chartData.length > 0 && (
                                    <ReferenceLine
                                        x={chartData[chartData.length - 1].time}
                                        stroke="var(--color-mid)"
                                        strokeDasharray="3 3"
                                        opacity={0.5}
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex items-center gap-8 mt-6 text-xs text-mid pt-6 border-t border-rule">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-ink"></div>
                            <span>Observed Price</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-accent2 border border-dashed border-transparent" style={{ borderStyle: 'dashed', borderWidth: '1px', borderTopWidth: 0 }}></div>
                            <span>Model Forecast</span>
                        </div>
                    </div>
                </div>
            </div>
        </EditorialCard>
    );
};

export default ClientDetail;
