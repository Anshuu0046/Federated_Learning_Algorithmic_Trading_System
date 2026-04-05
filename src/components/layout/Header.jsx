import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header = ({ round, maxRounds }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <header className="sticky top-0 z-40 bg-[rgba(6,14,32,0.6)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.1)] h-[72px] px-8 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            {/* Brand */}
            <div className="flex items-center gap-12">
                <span className="text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-[#818cf8] to-[#60a5fa]" style={{ fontFamily: 'Manrope' }}>
                    Nexus Intelligence
                </span>
            </div>

            {/* Center - Status */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
                <div className="flex items-center gap-3 px-4 py-1.5 border border-[rgba(99,102,241,0.1)] rounded-full bg-[rgba(20,31,56,0.5)] backdrop-blur-sm">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-tertiary font-medium drop-shadow-[0_0_8px_rgba(125,233,255,0.4)]">System Live</span>
                </div>

                <div className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
                    Round {round} / {maxRounds}
                </div>
            </div>

            {/* Right side - Badges & Auth */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-1.5 border border-[rgba(99,102,241,0.1)] rounded-full bg-[rgba(20,31,56,0.5)] backdrop-blur-sm">
                    <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>model_training</span>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">FedAvg Protocol</span>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex justify-center items-center w-8 h-8 rounded-full bg-[rgba(239,68,68,0.1)] text-red-400 hover:bg-red-400 hover:text-white transition-colors"
                    title="Sign Out"
                >
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>logout</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
