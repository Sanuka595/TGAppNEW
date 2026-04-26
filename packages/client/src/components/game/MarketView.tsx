import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Search, ShieldAlert, Tag, Car, TrendingUp } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { type CarTier, calculateSellPrice, calculateCurrentMarketValue } from '@tgperekup/shared';
import { Button } from '../ui/Button.js';
import { triggerHaptic } from '../../lib/tmaProvider';

const TIER_COLORS: Record<CarTier, string> = {
  Bucket: 'text-gray-400',
  Scrap: 'text-orange-400',
  Business: 'text-blue-400',
  Premium: 'text-purple-400',
  Rarity: 'text-amber-400',
};

export const MarketView: React.FC = () => {
  const market = useGameStore((s) => s.market) || [];
  const buyCar = useGameStore((s) => s.buyCar);
  const diagnoseMarketCar = useGameStore((s) => s.diagnoseMarketCar);
  const refreshMarket = useGameStore((s) => s.refreshMarket);
  const activeEvent = useGameStore((s) => s.activeEvent);

  if (market.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-[70vh] text-center p-8 relative"
      >
        <div className="relative w-32 h-32 flex items-center justify-center mb-8">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full"
          />
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 opacity-50 relative z-10 backdrop-blur-md">
            <Search size={48} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter drop-shadow-md">Рынок пуст</h2>
        <p className="text-sm text-white/50 max-w-[220px] leading-relaxed mb-8">
          Новые лоты появятся, когда игроки наступят на клетки покупки.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-5 pb-4 overflow-y-auto h-full scrollbar-hide">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
          Рынок Авто
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            className="h-8 px-3 text-[10px]"
            onClick={() => { triggerHaptic('impact', 'medium'); refreshMarket(); }}
          >
            <TrendingUp size={12} className="mr-1.5" />
            Обновить ($500)
          </Button>
          <span className="bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-bold text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5 h-8">
            <ShoppingBag size={12} />
            <span>{market.length} лотов</span>
          </span>
        </div>
      </div>
      
      {activeEvent && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-1 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:scale-125 transition-transform">
            <TrendingUp size={48} className="text-amber-500" />
          </div>
          <div className="flex items-center space-x-3 relative z-10">
            <div className="text-3xl bg-amber-500/20 w-12 h-12 rounded-2xl flex items-center justify-center border border-amber-500/30">
              {activeEvent.icon}
            </div>
            <div>
              <h4 className="text-amber-400 text-xs font-black uppercase tracking-widest mb-0.5">Рыночное событие</h4>
              <h3 className="text-white font-bold text-sm">{activeEvent.title}</h3>
            </div>
          </div>
          <p className="mt-2 text-xs text-white/60 leading-relaxed relative z-10">
            {activeEvent.description}
          </p>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 gap-5">
        {market.map((car, index) => {
          // BIZ:DEAL_ANALYZER Logic
          const buyPrice = calculateCurrentMarketValue(car, activeEvent);
          const maxSellPrice = calculateSellPrice({ ...car, defects: [], health: 100 }, activeEvent);
          const potentialProfit = maxSellPrice.sub(buyPrice);
          const profitMargin = buyPrice.gt(0) ? potentialProfit.div(buyPrice).mul(100).toNumber() : 0;
          
          return (
          <motion.div 
            key={car.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel rounded-[2.5rem] p-6 flex flex-col relative group overflow-hidden"
          >
            <div className={`absolute -left-8 -bottom-8 w-32 h-32 bg-${car.health > 80 ? 'emerald' : 'yellow'}-500 opacity-5 blur-3xl group-hover:opacity-10 transition-opacity`} />

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
              <div className="bg-emerald-500 text-black px-4 py-1.5 rounded-2xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] flex flex-col items-end">
                <span className="text-[10px] uppercase font-black tracking-widest opacity-80 leading-none mb-0.5">Купить</span>
                <span className="text-sm font-black font-mono leading-none">${buyPrice.toFixed(0)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
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
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col justify-center backdrop-blur-sm">
                <span className="text-[9px] text-white/30 uppercase font-black mb-1.5 block tracking-widest">Ремонт</span>
                <div className="flex items-center space-x-2">
                  <ShieldAlert size={14} className={car.defects.length > 0 ? 'text-rose-400' : 'text-emerald-400'} />
                  <span className="text-sm text-white font-black">{car.defects.length} шт.</span>
                </div>
              </div>
            </div>

            {/* BIZ:DEAL_ANALYZER Component */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-400/50 backdrop-blur-sm relative z-10 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center space-x-1">
                  <TrendingUp size={12} className="text-blue-400" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-blue-300">Оценка сделки</span>
                </div>
                <span className={`text-[10px] uppercase font-black tracking-widest ${profitMargin > 30 ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-yellow-400'}`}>
                  Потенциал: +{profitMargin.toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed font-medium mt-1">
                Идеальное состояние позволит продать авто за <span className="text-white font-bold">${maxSellPrice.toFixed(0)}</span>. Ожидаемая маржинальность сделки: ${potentialProfit.toFixed(0)}.
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              {car.defects.some(d => d.isHidden) && (
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => { triggerHaptic('impact', 'light'); diagnoseMarketCar(car.id); }}
                >
                  Диагностика ($200)
                </Button>
              )}
              <Button
                className="flex-[2]"
                variant="primary"
                onClick={() => { triggerHaptic('notification', 'success'); buyCar(car.id); }}
              >
                Выкупить лот
              </Button>
            </div>
          </motion.div>
        )})}
      </div>
    </div>
  );
};
