import React from 'react';
import { motion } from 'framer-motion';
import WebApp from '@twa-dev/sdk';
import type { ActiveTab } from '../store/uiStore';
import { useGameStore } from '../store/gameStore';

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const BottomNavigation: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const pendingChallenge = useGameStore((s) => s.pendingRaceChallenge);
  const activeDebts = useGameStore((s) => s.activeDebts);
  const player = useGameStore((s) => s.player);

  const pendingDebtCount = activeDebts.filter(
    d => d.status === 'pending' && d.lenderId !== player.id,
  ).length;

  const dealsBadge: number | boolean | undefined = pendingChallenge ? true : (pendingDebtCount > 0 ? pendingDebtCount : undefined);

  const navItems: { id: ActiveTab; label: string; icon: string; badge?: number | boolean }[] = [
    { id: 'garage',  label: 'Гараж',    icon: '🚗' },
    { id: 'market',  label: 'Рынок',    icon: '🏪' },
    { id: 'board',   label: 'Игра',     icon: '🎲' },
    ...(dealsBadge !== undefined
      ? [{ id: 'deals' as ActiveTab, label: 'Сделки', icon: '💼', badge: dealsBadge }]
      : [{ id: 'deals' as ActiveTab, label: 'Сделки', icon: '💼' }]),
  ];

  const handleTabChange = (id: ActiveTab) => {
    if (activeTab === id) return;
    try { if (WebApp.isExpanded) WebApp.HapticFeedback.impactOccurred('light'); } catch { /* noop */ }
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
                isActive ? 'text-cyan-300 bg-white/5' : 'text-white/40 hover:text-white/80'
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
              {/* Badge */}
              {item.badge && (
                <span className={`absolute top-1 ${typeof item.badge === 'number' ? 'right-1 w-4 h-4 text-[9px] flex items-center justify-center' : 'right-3 w-2.5 h-2.5'} bg-rose-500 rounded-full shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse z-20 text-white font-bold`}>
                  {typeof item.badge === 'number' ? item.badge : ''}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
