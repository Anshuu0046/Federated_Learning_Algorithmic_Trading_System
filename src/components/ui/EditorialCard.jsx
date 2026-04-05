import { motion as Motion } from 'framer-motion';

const EditorialCard = ({ children, className = '', delay = 0, onClick }) => {
    return (
        <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.8,
                delay: delay,
                ease: [0.16, 1, 0.3, 1]
            }}
            onClick={onClick}
            className={`glass-card rounded-xl text-on-surface
        ${onClick ? 'cursor-none interactive' : ''} ${className}`}
        >
            {children}
        </Motion.div>
    );
};

export default EditorialCard;
