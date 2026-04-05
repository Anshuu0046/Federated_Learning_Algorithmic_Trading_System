import { motion as Motion } from 'framer-motion';

const ClientCard = ({ client, delay = 0, onClick }) => {
    const { id, name, loss, dataSize, prediction, actual, signal, confidence } = client;

    const getSignalUI = (sig) => {
        switch (sig) {
            case 'BUY': return <span className="sig-tag sig-tag-buy">Buy</span>;
            case 'SELL': return <span className="sig-tag sig-tag-sell">Sell</span>;
            default: return <span className="sig-tag sig-tag-hold">Hold</span>;
        }
    };

    const getSignalColor = (sig) => {
        switch (sig) {
            case 'BUY': return 'text-tertiary';
            case 'SELL': return 'text-error';
            default: return 'text-primary';
        }
    };

    return (
        <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay }}
            onClick={onClick}
            className="group relative glass-card rounded-xl p-8 hover:border-[rgba(99,102,241,0.3)] transition-all duration-300 cursor-none interactive min-h-[280px] flex flex-col"
        >
            {/* Hover Glow Top */}
            <div className="absolute top-0 left-0 right-0 h-[3px] scale-x-0 origin-left transition-transform duration-400 ease-out group-hover:scale-x-100 bg-gradient-to-r from-primary to-tertiary rounded-t-xl"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div>
                    <div className="text-[10px] tracking-[0.2em] text-outline mb-2">0{id}</div>
                    <h3 className="text-3xl font-bold text-on-surface tracking-tight mb-1" style={{ fontFamily: 'Manrope' }}>{name}</h3>
                    <div className="text-[10px] tracking-[0.1em] uppercase text-on-surface-variant">{dataSize} Samples · Series Shard</div>
                </div>
                <div>
                    {getSignalUI(signal)}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 mt-auto">
                <div>
                    <div className="text-[10px] tracking-[0.1em] uppercase text-on-surface-variant mb-1">Local Loss</div>
                    <div className="text-2xl font-bold text-on-surface" style={{ fontFamily: 'Manrope' }}>{loss.toFixed(4)}</div>
                </div>

                <div className="text-right">
                    <div className="text-[10px] tracking-[0.1em] uppercase text-on-surface-variant mb-1">Target</div>
                    <div className="text-2xl font-bold text-on-surface" style={{ fontFamily: 'Manrope' }}>${actual.toFixed(2)}</div>
                </div>

                <div className="col-span-2 pt-4 border-t border-outline-variant/30 flex justify-between items-baseline">
                    <div className="text-xs text-on-surface-variant">Forecast:</div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xl font-bold ${getSignalColor(signal)}`} style={{ fontFamily: 'Manrope' }}>${prediction.toFixed(2)}</span>
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
                            <div className="w-8 h-0.5 bg-outline-variant overflow-hidden rounded-full">
                                <Motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${confidence}%` }}
                                    transition={{ duration: 1 }}
                                    className="h-full bg-gradient-to-r from-primary to-tertiary"
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
