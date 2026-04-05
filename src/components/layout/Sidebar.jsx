import { motion as Motion } from 'framer-motion';

const navItems = [
    { id: 'overview', label: 'Dashboard', materialIcon: 'dashboard' },
    { id: 'network', label: 'Federation', materialIcon: 'hub' },
    { id: 'analytics', label: 'Performance', materialIcon: 'monitoring' },
    { id: 'security', label: 'Privacy', materialIcon: 'shield' },
];

const Sidebar = ({ activeTab, setActiveTab, onRunRound, isTraining }) => {
    return (
        <div className="w-64 h-full flex flex-col bg-[rgba(2,6,16,0.8)] backdrop-blur-2xl border-r border-[rgba(99,102,241,0.1)] shadow-[24px_0_48px_rgba(0,0,0,0.4)]">
            {/* Brand */}
            <div className="mb-10 px-8 pt-8">
                <h1 className="text-lg font-black text-[#818cf8]" style={{ fontFamily: 'Manrope' }}>Nexus Intelligence</h1>
                <p className="text-[10px] text-[#475569] uppercase tracking-widest mt-1">Federated Core V1.2</p>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item, index) => {
                    const isActive = activeTab === item.id;

                    return (
                        <Motion.button
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * index }}
                            onClick={() => setActiveTab(item.id)}
                            className={`group flex items-center gap-3 w-full py-3 px-4 rounded-xl relative transition-all duration-300 ${isActive
                                ? 'bg-[rgba(99,102,241,0.1)] text-[#818cf8] shadow-[0_0_15px_rgba(99,102,241,0.2)] translate-x-1'
                                : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[rgba(99,102,241,0.05)]'
                                }`}
                        >
                            <span
                                className="material-symbols-outlined text-xl"
                                style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                            >
                                {item.materialIcon}
                            </span>
                            <span className="text-sm font-medium">{item.label}</span>
                        </Motion.button>
                    );
                })}
            </nav>

            {/* Bottom Area */}
            <div className="p-6 border-t border-[rgba(99,102,241,0.1)]">
                <button
                    onClick={onRunRound}
                    disabled={isTraining}
                    className={`w-full bg-gradient-to-r from-primary to-secondary text-on-primary-fixed py-3 rounded-xl font-bold glow-primary text-sm tracking-wide transition-transform hover:scale-[1.02] ${isTraining ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isTraining ? 'Training...' : 'Run Training Round'}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
