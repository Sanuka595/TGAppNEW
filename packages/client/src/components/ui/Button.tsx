import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import WebApp from '@twa-dev/sdk';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'glass';
  hapticFeedback?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'glass', 
  hapticFeedback = 'light',
  className = '', 
  onClick,
  children,
  ...props 
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      if (WebApp.isExpanded) WebApp.HapticFeedback.impactOccurred(hapticFeedback);
    } catch { /* haptic not available outside TMA */ }
    if (onClick) onClick(e);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300/30';
      case 'secondary':
        return 'bg-white/10 border border-white/20 hover:bg-white/20';
      case 'glass':
      default:
        return 'glass-button';
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95, y: 1 }}
      className={`px-6 py-3 rounded-full font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 backdrop-blur-md transition-all ${getVariantStyles()} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};
