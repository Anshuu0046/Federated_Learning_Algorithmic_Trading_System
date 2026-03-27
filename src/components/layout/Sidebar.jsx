import React from 'react';
import { motion as Motion } from 'framer-motion';
import { LayoutDashboard, Network, LineChart, ShieldCheck } from 'lucide-react';

const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'network', label: 'Federation', icon: Network },
    { id: 'analytics', label: 'Performance', icon: LineChart },
    { id: 'security', label: 'Privacy', icon: ShieldCheck },
];

const Sidebar = ({ activeTab, setActiveTab }) => {
    return (
        <div className="w-64 h-full bg-cream border-r border-rule flex flex-col">
            <div className="flex-1 py-12 px-8 flex flex-col gap-6">
                <div className="text-[10px] tracking-[0.2em] uppercase text-mid mb-4 flex items-center gap-3">
                    <div className="w-4 h-px bg-light"></div>
                    Menu
                </div>

                {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <Motion.button
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * index }}
                            onClick={() => setActiveTab(item.id)}
                            className={`group flex items-center gap-4 py-3 relative transition-all duration-300 ${isActive ? 'text-ink' : 'text-mid hover:text-ink interactive'
                                }`}
                        >
                            {/* Active Indicator Line */}
                            {isActive && (
                                <Motion.div
                                    layoutId="activeTabSidebar"
                                    className="absolute left-[-32px] top-1/2 -translate-y-1/2 w-1 h-8 bg-accent"
                                />
                            )}

                            <Icon
                                size={18}
                                className={`transition-all duration-300 ${isActive ? 'text-accent' : 'text-light group-hover:text-mid'}`}
                                strokeWidth={isActive ? 2 : 1.5}
                            />
                            <span className={`font-serif text-xl tracking-tight ${isActive ? 'font-medium' : ''}`}>
                                {item.label}
                            </span>
                        </Motion.button>
                    );
                })}
            </div>

            {/* Bottom Area */}
            <div className="p-8 border-t border-rule space-y-4">
                <div className="text-[10px] tracking-[0.2em] uppercase text-mid flex items-center gap-3">
                    <div className="w-4 h-px bg-light"></div>
                    Node Status
                </div>
                <div className="font-serif text-lg text-ink">
                    5 / 5 <span className="text-mid italic text-sm">Online</span>
                </div>
                <div className="w-full h-px bg-rule mt-4" />
                <div className="text-xs text-mid leading-relaxed">
                    NEXUS Protocol<br />Local training active.
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
