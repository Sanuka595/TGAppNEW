import React from 'react';
import { motion } from 'framer-motion';
import WebApp from '@twa-dev/sdk';
import type { ActiveTab } from '../store/uiStore';

type NavItem = ActiveTab;

interface Props {
  activeTab: NavItem;
  onTabChange: (tab: NavItem) => void;
}

export const BottomNavigation: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const navItems: { id: NavItem; label: string; icon: string }[] = [
    { id: 'garage', label: 'Гараж', icon: '🚗' },
    { id: 'market', label: 'Рынок', icon: '🏪' },
    { id: 'board', label: 'Игра', icon: '🎲' },
  ];

  const handleTabChange = (id: NavItem) => {
    if (activeTab === id) return;
    try {
      if (WebApp.isExpanded) WebApp.HapticFeedback.impactOccurred('light');
    } catch (e) {}
    onTabChange(id);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pb-safe">
      <div className="glass-panel rounded-[2rem] flex justify-between items-center px-2 py-2 w-full max-w-sm">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center w-full py-2 rounded-[1.5rem] transition-all duration-300 ${
                isActive ? 'text-cyan-300 bg-white/5 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]' : 'text-white/40 hover:text-white/80'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-cyan-500/10 rounded-[1.5rem] border border-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}
              <span className="text-xl relative z-10 drop-shadow-md mb-0.5">{item.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
