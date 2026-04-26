import React from 'react';
import { motion } from 'framer-motion';
import { Car as CarIcon, ShieldCheck, Banknote } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { type CarTier, calculateSellPrice } from '@tgperekup/shared';
import { Button } from '../ui/Button.js';

const TIER_CONFIG: Record<CarTier, { color: string; label: string }> = {
  Bucket: { color: 'from-gray-400 to-gray-600', label: 'Вёдро' },
  Scrap: { color: 'from-orange-500 to-red-600', label: 'Битьё' },
  Business: { color: 'from-blue-500 to-indigo-600', label: 'Бизнес' },
  Premium: { color: 'from-purple-500 to-fuchsia-600', label: 'Премиум' },
  Rarity: { color: 'from-amber-400 to-yellow-600', label: 'Раритет' },
};

export const GarageView: React.FC = () => {
  const garage = useGameStore((s) => s.player.garage) || [];
  const activeEvent = useGameStore((s) => s.activeEvent);

  if (garage.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[70vh] text-center p-8 relative"
      >
        <div className="relative w-85 h-85 flex items-center justify-center mb-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"
          />
          <img
            src="/emptygarage.webp"
            alt="Empty Garage"
            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(58,123,213,0.5)] relative z-10"
          />
        </div>

        <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter drop-shadow-md">Ваш гараж пуст</h2>
        <p className="text-sm text-white/50 max-w-[240px] leading-relaxed">
          Здесь будут стоять твои спорткары. Время выйти на рынок и совершить первую сделку!
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-5 pb-24 overflow-y-auto h-full scrollbar-hide">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white drop-shadow-md">
          Мой Гараж
        </h2>
        <span className="bg-white/5 px-3 py-1 rounded-full text-xs font-bold text-white/60 border border-white/10 backdrop-blur-md">
          {garage.length} авто
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {garage.map((car, index) => {
          const sellPrice = calculateSellPrice(car, activeEvent).toNumber();
          const pnl = sellPrice - Number(car.boughtFor || 0);
          const isProfit = pnl >= 0;

          return (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel rounded-[2rem] p-5 flex flex-col relative overflow-hidden group"
            >
              {/* Background Accent */}
              <div className={`absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br ${TIER_CONFIG[car.tier].color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${TIER_CONFIG[car.tier].color} shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/10`}>
                    <CarIcon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight drop-shadow-sm">{car.name}</h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] uppercase font-black tracking-widest text-white/40">
                        {TIER_CONFIG[car.tier].label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-white/30 uppercase font-black mb-1">P&L</span>
                  <span className={`text-sm font-mono font-bold ${isProfit ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]'}`}>
                    {isProfit ? '+' : '-'}${Math.abs(pnl).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col shadow-inner backdrop-blur-sm">
                  <div className="flex items-center space-x-1.5 mb-2">
                    <ShieldCheck size={12} className="text-blue-400" />
                    <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Состояние</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${car.health}%` }}
                        className={`h-full rounded-full ${car.health > 70 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : car.health > 30 ? 'bg-yellow-500 shadow-[0_0_8px_#eab308]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-white/80">{car.health}%</span>
                  </div>
                </div>

                <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col justify-center shadow-inner backdrop-blur-sm">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Banknote size={12} className="text-emerald-400" />
                    <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Куплено</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-white drop-shadow-md">${car.boughtFor || '0'}</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  );
};
