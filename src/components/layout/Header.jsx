import React from 'react';
import { Activity } from 'lucide-react';

const Header = ({ round }) => {
    return (
        <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-rule h-[72px] px-12 flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-12">
                <div className="font-serif text-lg text-ink font-medium tracking-[0.02em]">
                    NEXUS <span className="italic text-accent">Intelligence</span>
                </div>
            </div>

            {/* Center - Status */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
                <div className="flex items-center gap-3 px-4 py-1.5 border border-rule rounded-full bg-cream2/50 backdrop-blur-sm">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-ink font-medium">System Live</span>
                </div>

                <div className="text-[10px] uppercase tracking-[0.1em] text-mid">
                    Round {round} / 15
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-6">
                <div className="text-[10px] tracking-[0.2em] uppercase text-mid flex items-center gap-3">
                    <div className="w-4 h-px bg-light"></div>
                    Protocol Active
                </div>
            </div>
        </header>
    );
};

export default Header;
