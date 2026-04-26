import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Wallet, Zap, User, Users, Sun, Moon } from 'lucide-react';
import Decimal from 'decimal.js';
import { useUiStore } from '../store/uiStore';
import { triggerHaptic } from '../lib/tmaProvider';

export const TopBar: React.FC = () => {
  const player = useGameStore((s) => s.player);
  const roomId = useGameStore((s) => s.roomId);
  const setIsMultiplayerOpen = useUiStore((s) => s.setIsCreateRoomModalOpen);
  const setIsDevPanelOpen = useUiStore((s) => s.setIsDevPanelOpen);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  
  const clickCount = React.useRef(0);
  const lastClickTime = React.useRef(0);

  const handleAvatarClick = () => {
    const now = Date.now();
    if (now - lastClickTime.current > 1000) {
      clickCount.current = 1;
    } else {
      clickCount.current += 1;
    }
    lastClickTime.current = now;

    if (clickCount.current >= 5) {
      triggerHaptic('impact', 'heavy');
      setIsDevPanelOpen(true);
      clickCount.current = 0;
    }
  };

  const formattedBalance = new Decimal(player.balance).toNumber().toLocaleString('ru-RU');

  return (
    <div className="topbar-root bg-black/20 p-4 border-b border-white/5 flex justify-between items-center sticky top-0 z-50 backdrop-blur-lg h-20">
      <div className="flex items-center space-x-3">
        <div 
          onClick={handleAvatarClick}
          className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 active:scale-90 transition-transform cursor-pointer"
        >
          <User size={20} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-white/30 uppercase font-black tracking-widest leading-none mb-1">Перекуп</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-black truncate max-w-[80px] tracking-tighter uppercase">
              {player.id.substring(0, 4)}
            </span>
            {roomId && (
              <div className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-md border border-emerald-500/30 font-mono font-bold animate-pulse">
                К: {roomId}
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => setIsMultiplayerOpen(true)}
          className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
        >
          <Users size={18} className={roomId ? 'text-emerald-400' : 'text-white/40'} />
        </button>

        <button
          onClick={() => { triggerHaptic('selection'); toggleTheme(); }}
          className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
        >
          {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />}
        </button>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-1.5 mb-1 opacity-30">
            <Wallet size={10} />
            <span className="text-[9px] uppercase font-black tracking-widest">Баланс</span>
          </div>
          <span className="text-base font-black text-emerald-400 font-mono tracking-tighter leading-none">
            ${formattedBalance}
          </span>
        </div>

        <div className="h-8 w-[1px] bg-white/5" />

        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-1.5 mb-1 opacity-30">
            <Zap size={10} />
            <span className="text-[9px] uppercase font-black tracking-widest">Энергия</span>
          </div>
          <div className="flex space-x-1">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-3.5 rounded-full transition-all duration-500 ${
                  i < player.energy 
                    ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' 
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
