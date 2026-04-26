import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Info, Wrench, Truck, AlertCircle } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button.js';

export const ActionModal: React.FC = () => {
  const { 
    currentEvent, 
    setCurrentEvent, 
    player, 
    repairCar, 
    rentCar, 
    diagnoseCar 
  } = useGameStore();

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
            <Button 
              onClick={handleClose}
              variant="primary"
              className="w-full mt-2"
            >
              Перейти к рынку
            </Button>
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
            <Button 
              onClick={handleClose}
              variant="primary"
              className="w-full mt-2"
            >
              Ок
            </Button>
          </div>
        );
      case 'repair':
      case 'special_repair':
        const garage = player.garage || [];
        const repairableCars = garage.filter(c => c.defects.some(d => !d.isRepaired));
        const isDiscounted = currentEvent.type === 'special_repair';
        
        return (
          <div className="space-y-4">
            <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-2xl mb-4">
              <div className="flex items-center space-x-3 mb-2">
                <Wrench className="text-sky-400" size={20} />
                <h3 className="font-bold text-white uppercase tracking-tighter">
                  {isDiscounted ? 'Спец-Сервис (-5%)' : 'Автосервис'}
                </h3>
              </div>
              <p className="text-sm text-white/60">Здесь можно устранить поломки или провести диагностику скрытых дефектов.</p>
            </div>
            
            <div className="max-h-[30vh] overflow-y-auto space-y-3 pr-1 scrollbar-hide">
              {garage.map(car => (
                <div key={car.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-white">{car.name}</span>
                    <Button 
                      variant="secondary" 
                      className="h-7 text-[10px] px-3"
                      onClick={() => diagnoseCar(car.id)}
                    >
                      Диагностика ($200)
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {car.defects.filter(d => !d.isRepaired).map(defect => (
                      <div key={defect.id} className="flex justify-between items-center bg-black/20 p-2 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-white/80 font-medium">{defect.name}</span>
                          <span className="text-[9px] text-white/40 uppercase font-black">{defect.severity}</span>
                        </div>
                        <Button 
                          variant="primary" 
                          className="h-7 text-[10px] px-3"
                          onClick={() => repairCar(car.id, defect.id, isDiscounted)}
                        >
                          ${(isDiscounted ? Number(defect.repairCost) * 0.95 : Number(defect.repairCost)).toFixed(0)}
                        </Button>
                      </div>
                    ))}
                    {!car.defects.some(d => !d.isRepaired) && (
                      <div className="text-[10px] text-emerald-400 font-bold uppercase text-center py-1">Полностью исправна ✨</div>
                    )}
                  </div>
                </div>
              ))}
              {garage.length === 0 && (
                <div className="text-center py-8 text-white/20 uppercase font-black text-xs">Гараж пуст</div>
              )}
            </div>
          </div>
        );
      case 'rent':
        const rentGarage = player.garage || [];
        return (
          <div className="space-y-4">
            <div className="bg-teal-500/10 border border-teal-500/20 p-4 rounded-2xl mb-4">
              <div className="flex items-center space-x-3 mb-2">
                <Truck className="text-teal-400" size={20} />
                <h3 className="font-bold text-white uppercase tracking-tighter">Прокат авто</h3>
              </div>
              <p className="text-sm text-white/60">Сдайте свои машины в аренду и получите мгновенную выплату.</p>
            </div>
            
            <div className="max-h-[30vh] overflow-y-auto space-y-3 pr-1 scrollbar-hide">
              {rentGarage.map(car => (
                <div key={car.id} className="flex justify-between items-center bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div>
                    <div className="font-bold text-white leading-none mb-1">{car.name}</div>
                    <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">{car.tier}</div>
                  </div>
                  <Button 
                    disabled={car.isRented}
                    onClick={() => rentCar(car.id)}
                    variant={car.isRented ? 'secondary' : 'primary'}
                    className="h-9 px-4"
                  >
                    {car.isRented ? 'Сдана' : 'Сдать'}
                  </Button>
                </div>
              ))}
              {rentGarage.length === 0 && (
                <div className="text-center py-8 text-white/20 uppercase font-black text-xs">Нет машин для аренды</div>
              )}
            </div>
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
            <Button 
              onClick={handleClose}
              variant="secondary"
              className="w-full mt-2"
            >
              Понятно
            </Button>
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
            className="w-full max-w-md glass-panel rounded-[3rem] p-8 relative"
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
