import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, ShieldAlert, Tag, TrendingUp, Car as CarIcon, ShieldCheck, Banknote, LogOut } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { type CarTier, calculateSellPrice, calculateCurrentMarketValue, canUseDiagnostics, DIAGNOSTICS_UNLOCK_THRESHOLD } from '@tgperekup/shared';
import { Button } from '../ui/Button.js';
import { triggerHaptic } from '../../lib/tmaProvider';

import { TIER_COLORS, TIER_CONFIG } from '../../config/ui';

export const MarketView: React.FC = () => {
  const { market = [], player, activeEvent, currentEvent, buyCar, diagnoseMarketCar, refreshMarket, sellCar } = useGameStore();
  const garage = player.garage || [];
  
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  useEffect(() => {
    if (currentEvent?.type === 'sale') {
      setMode('sell');
    } else if (currentEvent?.type?.startsWith('buy_')) {
      setMode('buy');
    }
  }, [currentEvent]);

  return (
    <div className="flex flex-col space-y-5 p-5 pb-4 overflow-y-auto h-full scrollbar-hide">
      
      {/* HEADER & TOGGLE */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white drop-shadow-md">
            Торговая площадка
          </h2>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md relative">
          <motion.div
            className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 rounded-xl border border-white/10"
            animate={{ left: mode === 'buy' ? '6px' : 'calc(50%)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          <button
            onClick={() => { triggerHaptic('impact', 'light'); setMode('buy'); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest relative z-10 transition-colors ${mode === 'buy' ? 'text-white' : 'text-white/40'}`}
          >
            Купить
          </button>
          <button
            onClick={() => { triggerHaptic('impact', 'light'); setMode('sell'); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest relative z-10 transition-colors ${mode === 'sell' ? 'text-white' : 'text-white/40'}`}
          >
            Продать
          </button>
        </div>
      </div>

      {/* ACTIVE EVENT */}
      {activeEvent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
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

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        {mode === 'buy' ? (
          <motion.div
            key="buy-mode"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col space-y-4"
          >
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-sm font-bold text-white/60">Доступные лоты: {market.length}</span>
              <Button
                variant="secondary"
                className="h-8 px-3 text-[10px]"
                onClick={() => { triggerHaptic('impact', 'medium'); refreshMarket(); }}
              >
                <TrendingUp size={12} className="mr-1.5" /> Обновить ($500)
              </Button>
            </div>

            {market.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center bg-white/5 rounded-3xl border border-white/10">
                <Search size={32} className="text-emerald-400 mb-4 opacity-50" />
                <p className="text-sm text-white/50 px-8">Новые лоты появятся, когда вы или другие игроки наступят на клетки покупки.</p>
              </div>
            ) : (
              market.map((car, index) => {
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
                          <span className={`text-[10px] uppercase font-black tracking-widest ${TIER_COLORS[car.tier]}`}>{car.tier} Class</span>
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
                          <span className={`text-sm font-black ${car.health > 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>{car.health}%</span>
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
                        canUseDiagnostics(player) ? (
                          <Button className="flex-1" variant="secondary" onClick={() => { triggerHaptic('impact', 'light'); diagnoseMarketCar(car.id); }}>
                            Диагностика ($200)
                          </Button>
                        ) : (
                          <button
                            title={`Разблокировать: заработай $${DIAGNOSTICS_UNLOCK_THRESHOLD}`}
                            className="flex-1 text-[11px] rounded-xl bg-white/5 text-white/30 cursor-not-allowed border border-white/10 py-2"
                            disabled
                          >
                            🔒 Диагностика
                          </button>
                        )
                      )}
                      <Button className="flex-[2]" variant="primary" onClick={() => { triggerHaptic('notification', 'success'); buyCar(car.id); }}>
                        Выкупить лот
                      </Button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        ) : (
          <motion.div
            key="sell-mode"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col space-y-4"
          >
            {garage.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center bg-white/5 rounded-3xl border border-white/10">
                <CarIcon size={32} className="text-blue-400 mb-4 opacity-50" />
                <p className="text-sm text-white/50 px-8">В вашем гараже нет машин для продажи.</p>
              </div>
            ) : (
              garage.map((car, index) => {
                const sellPrice = calculateSellPrice(car, activeEvent);
                const pnl = sellPrice.toNumber() - Number(car.boughtFor || 0);
                const isProfit = pnl >= 0;

                return (
                  <motion.div
                    key={car.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-panel rounded-[2rem] p-5 flex flex-col relative overflow-hidden group"
                  >
                    <div className={`absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br ${TIER_CONFIG[car.tier].color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${TIER_CONFIG[car.tier].color} shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/10`}>
                          <CarIcon size={20} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white leading-tight drop-shadow-sm">{car.name}</h3>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] uppercase font-black tracking-widest text-white/40">{TIER_CONFIG[car.tier].label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/30 uppercase font-black mb-1">P&L</span>
                        <span className={`text-sm font-mono font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : '-'}${Math.abs(pnl).toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10 mb-5">
                      <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col shadow-inner backdrop-blur-sm">
                        <div className="flex items-center space-x-1.5 mb-2">
                          <ShieldCheck size={12} className="text-blue-400" />
                          <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Состояние</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${car.health > 70 ? 'bg-green-500' : car.health > 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${car.health}%` }} />
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
                    
                    <Button 
                      className="w-full relative overflow-hidden group/btn" 
                      variant={isProfit ? 'primary' : 'secondary'}
                      disabled={car.isLocked}
                      onClick={() => { triggerHaptic('notification', 'success'); sellCar(car.id); }}
                    >
                      <div className="relative z-10 flex items-center justify-center space-x-2">
                        <LogOut size={16} className="opacity-80" />
                        <span className="font-black uppercase tracking-widest">
                          {car.isLocked ? 'Машина в залоге' : `Продать за $${sellPrice.toFixed(0)}`}
                        </span>
                      </div>
                    </Button>
                  </motion.div>
                )
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
