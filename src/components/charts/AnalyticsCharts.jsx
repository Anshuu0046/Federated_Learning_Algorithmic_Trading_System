import React, { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from 'recharts';
import EditorialCard from '../ui/EditorialCard';

const AnalyticsCharts = ({ history }) => {
    // Mock performance data using history length
    const performanceData = useMemo(() => {
        let equity = 10000;
        let peak = 10000;
        const baselinePrice = 100;
        let currentPrice = 100;

        return Array.from({ length: Math.max(20, history.length * 2) }).map((_, i) => {
            // Simulate cumulative returns and drawdown
            const dailyReturn = (Math.abs(Math.sin(i * 12.3)) - 0.48) * 0.02; // Slight positive drift
            equity = equity * (1 + dailyReturn);
            peak = Math.max(peak, equity);
            const drawdown = ((equity - peak) / peak) * 100;

            // Simulate baseline S&P500 for comparison
            const marketReturn = (Math.abs(Math.sin(i * 4.5)) - 0.49) * 0.015;
            currentPrice = currentPrice * (1 + marketReturn);

            return {
                day: i,
                equity: equity,
                drawdown: drawdown,
                baseline: (currentPrice / baselinePrice) * 10000
            };
        });
    }, [history.length]);

    const sharpeData = [
        { name: 'FedAvg Model', value: 1.87 },
        { name: 'S&P 500', value: 0.85 },
        { name: 'Trend Following', value: 1.12 },
        { name: 'Mean Reversion', value: 1.45 },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

            {/* Portfolio Equity Curve */}
            <EditorialCard className="p-8 h-[450px] flex flex-col">
                <div className="flex justify-between items-end mb-8 border-b border-rule pb-4">
                    <div>
                        <div className="section-label mb-2">Simulated Backtest</div>
                        <h3 className="font-serif text-3xl tracking-tight text-ink">Equity <em>Curve</em></h3>
                        <div className="text-[10px] tracking-[0.1em] uppercase text-mid mt-2">Initial Capital: $10,000</div>
                    </div>
                    <div className="text-right">
                        <div className="font-serif text-3xl text-accent2">
                            ${(performanceData[performanceData.length - 1]?.equity || 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] tracking-[0.1em] uppercase text-mid">Current Value</div>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-accent2)" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="var(--color-accent2)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-mid)" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="var(--color-mid)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
                            <YAxis
                                domain={['auto', 'auto']}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                width={60}
                            />
                            <Tooltip
                                formatter={(value) => [`$${value.toFixed(2)}`, 'Value']}
                                contentStyle={{ border: 'none' }}
                                itemStyle={{ color: 'var(--color-cream)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="equity"
                                stroke="var(--color-accent2)"
                                strokeWidth={2}
                                fill="url(#equityGrad)"
                                name="FedTrade Model"
                            />
                            <Area
                                type="monotone"
                                dataKey="baseline"
                                stroke="var(--color-mid)"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                fill="url(#baseGrad)"
                                name="S&P 500"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </EditorialCard>

            {/* Drawdown Chart */}
            <EditorialCard className="p-8 h-[450px] flex flex-col">
                <div className="flex justify-between items-end mb-8 border-b border-rule pb-4">
                    <div>
                        <div className="section-label mb-2">Simulated Backtest</div>
                        <h3 className="font-serif text-3xl tracking-tight text-ink">Maximum <em>Drawdown</em></h3>
                        <div className="text-[10px] tracking-[0.1em] uppercase text-mid mt-2">Peak to Trough Decline</div>
                    </div>
                    <div className="text-right">
                        <div className="font-serif text-3xl text-danger">
                            {Math.min(...(performanceData.map(d => d.drawdown) || [0])).toFixed(1)}%
                        </div>
                        <div className="text-[10px] tracking-[0.1em] uppercase text-mid">Max Drawdown</div>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
                            <YAxis
                                domain={['auto', 0]}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val.toFixed(1)}%`}
                                width={50}
                            />
                            <Tooltip
                                formatter={(value) => [`${value.toFixed(2)}%`, 'Drawdown']}
                                contentStyle={{ border: 'none' }}
                                itemStyle={{ color: 'var(--color-cream)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="drawdown"
                                stroke="var(--color-danger)"
                                strokeWidth={2}
                                fill="url(#drawdownGrad)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </EditorialCard>

            {/* Sharpe Ratio Comparison */}
            <EditorialCard className="p-8 h-[360px] flex flex-col lg:col-span-2">
                <div className="flex justify-between items-end mb-8 border-b border-rule pb-4">
                    <div>
                        <div className="section-label mb-2">Risk/Reward Profile</div>
                        <h3 className="font-serif text-3xl tracking-tight text-ink">Sharpe <em>Ratio</em> Comparison</h3>
                        <div className="text-[10px] tracking-[0.1em] uppercase text-mid mt-2">Annualised Risk-Adjusted Return</div>
                    </div>
                    <div className="text-right">
                        <div className="font-serif text-3xl text-accent">1.87</div>
                        <div className="text-[10px] tracking-[0.1em] uppercase text-mid">FedAvg Sharpe</div>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sharpeData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" tickLine={false} axisLine={false} domain={[0, 2]} />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                width={100}
                                tick={{ fill: 'var(--color-ink)', fontSize: 11, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--color-cream2)' }}
                                contentStyle={{ border: 'none' }}
                                itemStyle={{ color: 'var(--color-cream)' }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                {sharpeData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.name === 'FedAvg Model' ? 'var(--color-accent)' : 'var(--color-light)'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </EditorialCard>

        </div>
    );
};

export default AnalyticsCharts;
