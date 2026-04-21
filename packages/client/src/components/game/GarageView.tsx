import React from 'react';
import { motion } from 'framer-motion';
import { Car as CarIconComponent, Gauge as GaugeIconComponent, ShieldCheck as ShieldCheckIconComponent, Banknote as BanknoteIconComponent } from 'lucide-react';
const CarIcon = CarIconComponent as any;
const Gauge = GaugeIconComponent as any;
const ShieldCheck = ShieldCheckIconComponent as any;
const Banknote = BanknoteIconComponent as any;
import { useGameStore } from '../../store/gameStore';
import { type CarTier } from '@tgperekup/shared';

const TIER_CONFIG: Record<CarTier, { color: string; label: string }> = {
  Bucket: { color: 'from-gray-400 to-gray-600', label: 'Вёдро' },
  Scrap: { color: 'from-orange-500 to-red-600', label: 'Битьё' },
  Business: { color: 'from-blue-500 to-indigo-600', label: 'Бизнес' },
  Premium: { color: 'from-purple-500 to-fuchsia-600', label: 'Премиум' },
  Rarity: { color: 'from-amber-400 to-yellow-600', label: 'Раритет' },
};

export const GarageView: React.FC = () => {
  const garage = useGameStore((s) => s.player.garage) || [];

  if (garage.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[70vh] text-center p-8"
      >
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-2xl">
          <CarIcon size={48} className="text-white/20" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Гараж пуст</h2>
        <p className="text-sm text-white/40 max-w-[200px] leading-relaxed">
          Здесь будут стоять твои тачки. Купи первую на рынке!
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-5 pb-24 overflow-y-auto h-full scrollbar-hide">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
          Мой Гараж
        </h2>
        <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-white/60 border border-white/10">
          {garage.length} авто
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {garage.map((car, index) => (
          <motion.div 
            key={car.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-[2rem] p-5 flex flex-col shadow-2xl relative overflow-hidden group"
          >
            {/* Background Accent */}
            <div className={`absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br ${TIER_CONFIG[car.tier].color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${TIER_CONFIG[car.tier].color} shadow-lg shadow-black/20`}>
                  <CarIcon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white leading-tight">{car.name}</h3>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-[10px] uppercase font-black tracking-widest text-white/40">
                      {TIER_CONFIG[car.tier].label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-white/30 uppercase font-black mb-1">P&L</span>
                <span className="text-sm font-mono font-bold text-green-400">+$1,200</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col">
                <div className="flex items-center space-x-1.5 mb-2">
                  <ShieldCheck size={12} className="text-blue-400" />
                  <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Состояние</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${car.health}%` }}
                      className={`h-full rounded-full ${car.health > 70 ? 'bg-green-500' : car.health > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-white/80">{car.health}%</span>
                </div>
              </div>

              <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col justify-center">
                <div className="flex items-center space-x-1.5 mb-1">
                  <Banknote size={12} className="text-emerald-400" />
                  <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Куплено</span>
                </div>
                <span className="text-sm font-mono font-bold text-white">${car.boughtFor || '0'}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
