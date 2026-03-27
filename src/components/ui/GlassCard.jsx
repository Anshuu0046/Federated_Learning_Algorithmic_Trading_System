import { motion as Motion } from 'framer-motion';

export default function GlassCard({ children, className = '', delay = 0, onClick, hover = true }) {
    return (
        <Motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
            whileHover={hover ? {
                y: -3,
                scale: 1.005,
                transition: { duration: 0.25, ease: 'easeOut' }
            } : {}}
            onClick={onClick}
            className={`glass rounded-2xl p-6 transition-all duration-300 card-hover-border ${hover ? 'cursor-pointer' : ''
                } ${className}`}
        >
            {children}
        </Motion.div>
    );
}
