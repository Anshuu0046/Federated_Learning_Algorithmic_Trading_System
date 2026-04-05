import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate a brief network delay for realism
        await new Promise(r => setTimeout(r, 800));

        const result = login(username, password);
        if (result.success) {
            navigate('/dashboard', { replace: true });
        } else {
            setError(result.error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center relative overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(129,140,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.3) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Glow orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

            <Motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                {/* Card */}
                <div className="bg-[rgba(6,14,32,0.8)] backdrop-blur-2xl border border-[rgba(99,102,241,0.15)] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.5)] overflow-hidden">

                    {/* Header */}
                    <div className="px-10 pt-10 pb-6 text-center border-b border-[rgba(99,102,241,0.1)]">
                        <Motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.05)] mb-6">
                                <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>lock</span>
                                <span className="text-[10px] uppercase tracking-[0.15em] text-primary">Secure Access</span>
                            </div>
                            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#818cf8] to-[#60a5fa]" style={{ fontFamily: 'Manrope' }}>
                                Nexus Intelligence
                            </h1>
                            <p className="text-on-surface-variant text-sm mt-2">Federated Learning Control Center</p>
                        </Motion.div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-10 py-8 space-y-5">
                        <Motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2">Username</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>person</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[rgba(15,23,42,0.6)] border border-[rgba(99,102,241,0.15)] rounded-xl py-3 pl-10 pr-4 text-on-surface text-sm focus:outline-none focus:border-primary focus:shadow-[0_0_12px_rgba(99,102,241,0.2)] transition-all placeholder:text-[#475569]"
                                    placeholder="Enter username"
                                    required
                                    autoFocus
                                />
                            </div>
                        </Motion.div>

                        <Motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2">Password</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>key</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[rgba(15,23,42,0.6)] border border-[rgba(99,102,241,0.15)] rounded-xl py-3 pl-10 pr-4 text-on-surface text-sm focus:outline-none focus:border-primary focus:shadow-[0_0_12px_rgba(99,102,241,0.2)] transition-all placeholder:text-[#475569]"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </Motion.div>

                        {error && (
                            <Motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]"
                            >
                                <span className="material-symbols-outlined text-red-400 text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>error</span>
                                <span className="text-red-400 text-xs">{error}</span>
                            </Motion.div>
                        )}

                        <Motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            type="submit"
                            disabled={isLoading}
                            className={`w-full bg-gradient-to-r from-primary to-secondary text-on-primary-fixed py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(99,102,241,0.3)] ${isLoading ? 'opacity-70 cursor-not-allowed scale-100' : ''}`}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Authenticating...
                                </span>
                            ) : 'Sign In'}
                        </Motion.button>
                    </form>

                    {/* Footer hint */}
                    <div className="px-10 pb-8 pt-2 text-center">
                        <p className="text-[10px] text-[#475569] uppercase tracking-widest">
                            Demo: admin / nexus2026
                        </p>
                    </div>
                </div>
            </Motion.div>
        </div>
    );
};

export default LoginPage;
