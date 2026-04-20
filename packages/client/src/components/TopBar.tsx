import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import Decimal from 'decimal.js';

export const TopBar: React.FC = () => {
  const player = useGameStore((s) => s.player);
  
  const formattedBalance = new Decimal(player.balance).toNumber().toLocaleString('ru-RU');

  return (
    <div className="bg-tg-header text-tg-text p-4 border-b border-tg-hint/20 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-tg-button rounded-full flex items-center justify-center text-tg-button-text font-bold">
          {player.id.substring(0, 1).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-tg-hint leading-none">Игрок</span>
          <span className="text-sm font-semibold truncate max-w-[100px]">{player.id.substring(0, 8)}</span>
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-tg-hint uppercase tracking-wider">Баланс</span>
          <span className="text-sm font-bold text-tg-accent">${formattedBalance}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-tg-hint uppercase tracking-wider">Энергия</span>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-4 rounded-sm ${i < player.energy ? 'bg-yellow-400' : 'bg-tg-hint/30'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
