import { useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import { Activity, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import EditorialCard from '../ui/EditorialCard';

const ClientDetail = ({ client }) => {
    const { id, name, loss, dataSize, status, prediction, actual, history, signal, confidence } = client;

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
            case 'BUY': return 'text-tertiary';
            case 'SELL': return 'text-error';
            default: return 'text-primary';
        }
    };

    return (
        <EditorialCard className="p-8 h-[650px] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-outline-variant/30">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="text-[10px] tracking-[0.2em] uppercase text-on-surface-variant">0{id}</div>
                        <div className="w-1 h-1 rounded-full bg-outline"></div>
                        <div className={`text-[10px] tracking-[0.1em] uppercase ${status === 'training' ? 'text-tertiary animate-pulse' : 'text-on-surface-variant'}`}>
                            {status === 'training' ? 'Computing' : 'Standing By'}
                        </div>
                    </div>
                    <h2 className="text-5xl font-bold tracking-tight text-on-surface mb-2" style={{ fontFamily: 'Manrope' }}>{name}</h2>
                    <p className="text-on-surface-variant text-sm">Federated Model Shard — {dataSize} Data Points</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="text-3xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Manrope' }}>
                        ${actual.toFixed(2)}
                    </div>
                    <div className="text-[10px] tracking-[0.1em] uppercase text-on-surface-variant">Current Price</div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-12">
                {/* Left Side - Stats */}
                <div className="w-1/3 flex flex-col gap-8">
                    <div className="bg-surface-container p-6 border border-outline-variant/30 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">Current Signal</span>
                            <Activity size={14} className="text-outline" />
                        </div>
                        <div className={`text-4xl font-bold mb-4 ${getSignalColor(signal)}`} style={{ fontFamily: 'Manrope' }}>
                            {signal}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-on-surface-variant">
                                <span>Confidence</span>
                                <span>{confidence.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-1 bg-outline-variant/30 overflow-hidden rounded-full">
                                <div
                                    className={`h-full rounded-full ${signal === 'BUY' ? 'bg-tertiary' : signal === 'SELL' ? 'bg-error' : 'bg-primary'}`}
                                    style={{ width: `${confidence}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-outline-variant/20 border border-outline-variant/30 rounded-xl overflow-hidden">
                        <div className="bg-surface-container-high p-6">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant mb-2">Local Loss</div>
                            <div className="text-2xl font-bold text-on-surface" style={{ fontFamily: 'Manrope' }}>{loss.toFixed(4)}</div>
                        </div>
                        <div className="bg-surface-container-high p-6">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant mb-2">Forecast</div>
                            <div className="text-2xl font-bold text-on-surface" style={{ fontFamily: 'Manrope' }}>${prediction.toFixed(2)}</div>
                        </div>
                        <div className="bg-surface-container-high p-6 col-span-2">
                            <div className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant mb-2 flex items-center gap-2">
                                <Database size={12} /> Dataset Horizon
                            </div>
                            <div className="text-lg text-on-surface-variant italic mt-2" style={{ fontFamily: 'Manrope' }}>
                                Last 200 trading days
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Chart */}
                <div className="flex-1 flex flex-col border-l border-outline-variant/30 pl-12">
                    <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mb-6">
                        <div className="w-4 h-px bg-outline"></div>
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
                                    itemStyle={{ color: 'var(--color-on-surface)' }}
                                    labelStyle={{ color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    stroke="var(--color-primary)"
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                    name="Observed Price"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="predicted"
                                    stroke="var(--color-tertiary)"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    isAnimationActive={false}
                                    name="Model Forecast"
                                />

                                {chartData.length > 0 && (
                                    <ReferenceLine
                                        x={chartData[chartData.length - 1].time}
                                        stroke="var(--color-outline)"
                                        strokeDasharray="3 3"
                                        opacity={0.5}
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex items-center gap-8 mt-6 text-xs text-on-surface-variant pt-6 border-t border-outline-variant/30">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-primary rounded-full"></div>
                            <span>Observed Price</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-tertiary rounded-full" style={{ borderStyle: 'dashed', borderWidth: '1px', borderTopWidth: 0 }}></div>
                            <span>Model Forecast</span>
                        </div>
                    </div>
                </div>
            </div>
        </EditorialCard>
    );
};

export default ClientDetail;
