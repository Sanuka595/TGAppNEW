import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Info } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export const ActionModal: React.FC = () => {
  const currentEvent = useGameStore((s) => s.currentEvent);
  const setCurrentEvent = useGameStore((s) => s.setCurrentEvent);

  if (!currentEvent) return null;

  const handleClose = () => {
    setCurrentEvent(null);
  };

  const renderContent = () => {
    switch (currentEvent.type) {
      case 'buy_bucket':
      case 'buy_random':
      case 'buy_scrap':
      case 'buy_premium':
      case 'buy_business':
      case 'buy_retro':
        return (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
              <div className="flex items-center space-x-3 mb-2">
                <ShoppingCart className="text-emerald-400" size={20} />
                <h3 className="font-bold text-white uppercase tracking-tighter">Покупка авто</h3>
              </div>
              <p className="text-sm text-white/60">Вы находитесь на клетке "{currentEvent.name}". Здесь можно выкупить новые автомобили для своего гаража.</p>
            </div>
            <button 
              onClick={handleClose}
              className="w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-tighter"
            >
              Перейти к рынку
            </button>
          </div>
        );
      case 'sale':
        return (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
              <div className="flex items-center space-x-3 mb-2">
                <Info className="text-blue-400" size={20} />
                <h3 className="font-bold text-white uppercase tracking-tighter">Продажа авто</h3>
              </div>
              <p className="text-sm text-white/60">На клетке "{currentEvent.name}" вы можете выгодно продать свои автомобили. Перейдите в гараж, чтобы выбрать машину на продажу.</p>
            </div>
            <button 
              onClick={handleClose}
              className="w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-tighter"
            >
              Ок
            </button>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
              <div className="text-4xl mb-4">{currentEvent.icon}</div>
              <h3 className="text-xl font-black text-white uppercase mb-2">{currentEvent.name}</h3>
              <p className="text-sm text-white/40">{currentEvent.description}</p>
            </div>
            <button 
              onClick={handleClose}
              className="w-full bg-white/10 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-tighter"
            >
              Понятно
            </button>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {currentEvent && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[3rem] p-8 shadow-2xl relative"
          >
            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-white/40 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <div className="mb-8">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2 block">Событие на клетке</span>
               <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{currentEvent.name}</h2>
            </div>

            {renderContent()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
