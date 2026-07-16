import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '', glowColor = 'none', delay = 0 }) => {
  const getGlowStyles = () => {
    if (glowColor === 'blue') return 'hover:shadow-[0_0_25px_rgba(56,189,248,0.15)] focus-within:shadow-[0_0_25px_rgba(56,189,248,0.15)]';
    if (glowColor === 'purple') return 'hover:shadow-[0_0_25px_rgba(192,132,252,0.15)] focus-within:shadow-[0_0_25px_rgba(192,132,252,0.15)]';
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        // Spring physics = natural 60fps feel, no jank
        type: 'spring',
        stiffness: 320,
        damping: 28,
        delay: delay,
      }}
      // Only animate GPU-composited properties (transform + opacity).
      // Never animate width/height/padding/margin — those force layout recalc.
      style={{ willChange: 'transform, opacity' }}
      className={`glass-panel rounded-2xl p-6 ${getGlowStyles()} transition-shadow duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
