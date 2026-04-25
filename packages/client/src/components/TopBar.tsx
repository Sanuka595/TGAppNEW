import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Wallet, Zap, User } from 'lucide-react';
import Decimal from 'decimal.js';

export const TopBar: React.FC = () => {
  const player = useGameStore((s) => s.player);
  const roomId = useGameStore((s) => s.roomId);
  
  const formattedBalance = new Decimal(player.balance).toNumber().toLocaleString('ru-RU');

  return (
    <div className="bg-black/20 text-white p-4 border-b border-white/5 flex justify-between items-center sticky top-0 z-50 backdrop-blur-lg h-20">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
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
