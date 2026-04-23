import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Search, ShieldAlert, Tag } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { type CarTier } from '@tgperekup/shared';

const TIER_COLORS: Record<CarTier, string> = {
  Bucket: 'text-gray-400',
  Scrap: 'text-orange-400',
  Business: 'text-blue-400',
  Premium: 'text-purple-400',
  Rarity: 'text-amber-400',
};

export const MarketView: React.FC = () => {
  const market = useGameStore((s) => s.market) || [];

  if (market.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-[70vh] text-center p-8"
      >
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 opacity-20">
          <Search size={48} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-white/30 mb-2 uppercase tracking-tighter">Рынок пуст</h2>
        <p className="text-sm text-white/20 max-w-[220px]">
          Новые лоты появятся, когда игроки наступят на клетки покупки.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-5 pb-24 overflow-y-auto h-full scrollbar-hide">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
          Рынок Авто
        </h2>
        <span className="bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-bold text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5">
          <ShoppingBag size={12} />
          <span>{market.length} лотов</span>
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-5">
        {market.map((car, index) => (
          <motion.div 
            key={car.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-white/[0.07] to-transparent border border-white/10 rounded-[2.5rem] p-6 flex flex-col shadow-2xl relative group"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                  <Tag size={20} className={TIER_COLORS[car.tier]} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white leading-none mb-1">{car.name}</h3>
                  <span className={`text-[10px] uppercase font-black tracking-widest ${TIER_COLORS[car.tier]}`}>
                    {car.tier} Class
                  </span>
                </div>
              </div>
              <div className="bg-emerald-500 text-black px-4 py-1.5 rounded-2xl shadow-[0_4px_15px_rgba(16,185,129,0.3)]">
                <span className="text-sm font-black font-mono">${car.basePrice}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <span className="text-[9px] text-white/30 uppercase font-black mb-1.5 block tracking-widest">Тех-состояние</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-black ${car.health > 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {car.health}%
                  </span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-current opacity-30" style={{ width: `${car.health}%` }} />
                  </div>
                </div>
              </div>
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                <span className="text-[9px] text-white/30 uppercase font-black mb-1.5 block tracking-widest">Проблемы</span>
                <div className="flex items-center space-x-2">
                  <ShieldAlert size={14} className={car.defects.length > 0 ? 'text-rose-400' : 'text-emerald-400'} />
                  <span className="text-sm text-white font-black">{car.defects.length} шт.</span>
                </div>
              </div>
            </div>

            <button className="w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.1)] hover:bg-emerald-400 hover:text-black uppercase tracking-tighter text-sm">
              Выкупить лот
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
