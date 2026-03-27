import React from 'react';
import { motion as Motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

const ClientCard = ({ client, delay = 0, onClick }) => {
    const { id, name, loss, dataSize, prediction, actual, signal, confidence } = client;

    // Signal UI mapping matching the nexus_site.html table design
    const getSignalUI = (sig) => {
        switch (sig) {
            case 'BUY': return <span className="sig-tag sig-tag-buy">Buy</span>;
            case 'SELL': return <span className="sig-tag sig-tag-sell">Sell</span>;
            default: return <span className="sig-tag sig-tag-hold">Hold</span>;
        }
    };

    const getSignalColor = (sig) => {
        switch (sig) {
            case 'BUY': return 'text-accent2';
            case 'SELL': return 'text-danger';
            default: return 'text-[#6b5c28]';
        }
    };

    return (
        <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay }}
            onClick={onClick}
            className="group relative p-8 border-b border-r border-rule bg-white hover:bg-cream2 transition-colors duration-300 cursor-none interactive min-h-[280px] flex flex-col"
        >
            {/* Hover Line Top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] scale-x-0 origin-left transition-transform duration-400 ease-out group-hover:scale-x-100 bg-ink"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div>
                    <div className="text-[10px] tracking-[0.2em] text-light mb-2">0{id}</div>
                    <h3 className="font-serif text-3xl text-ink tracking-tight mb-1">{name}</h3>
                    <div className="text-[10px] tracking-[0.1em] uppercase text-mid">{dataSize} Samples · Series Shard</div>
                </div>
                <div>
                    {getSignalUI(signal)}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 mt-auto">
                <div>
                    <div className="text-[10px] tracking-[0.1em] uppercase text-mid mb-1">Local Loss</div>
                    <div className="font-serif text-2xl text-ink">{loss.toFixed(4)}</div>
                </div>

                <div className="text-right">
                    <div className="text-[10px] tracking-[0.1em] uppercase text-mid mb-1">Target</div>
                    <div className="font-serif text-2xl text-ink">${actual.toFixed(2)}</div>
                </div>

                <div className="col-span-2 pt-4 border-t border-rule flex justify-between items-baseline">
                    <div className="text-xs text-mid">Forecast:</div>
                    <div className="flex items-center gap-3">
                        <span className={`font-serif text-xl ${getSignalColor(signal)}`}>${prediction.toFixed(2)}</span>
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-mid">
                            <div className="w-8 h-0.5 bg-rule overflow-hidden">
                                <Motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${confidence}%` }}
                                    transition={{ duration: 1 }}
                                    className="h-full bg-ink"
                                />
                            </div>
                            {confidence.toFixed(0)}%
                        </div>
                    </div>
                </div>
            </div>
        </Motion.div>
    );
};

export default ClientCard;
