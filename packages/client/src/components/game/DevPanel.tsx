import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Zap, MapPin, RefreshCw } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { GAME_MAP } from '@tgperekup/shared';

export const DevPanel: React.FC = () => {
  const isOpen = useUiStore((s) => s.isDevPanelOpen);
  const setIsOpen = useUiStore((s) => s.setIsDevPanelOpen);
  const { devAddMoney, devAddEnergy, devTeleport, devResetTurn } = useGameStore();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed inset-x-4 bottom-24 z-[100] glass-panel rounded-[2rem] p-6 shadow-2xl border border-white/20"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-tighter text-cyan-300">Dev Tools</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => devAddMoney('10000')}
            className="flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold active:scale-95 transition-transform"
          >
            <DollarSign size={18} /> +$10k
          </button>
          <button
            onClick={() => devAddEnergy(3)}
            className="flex items-center justify-center gap-2 py-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 font-bold active:scale-95 transition-transform"
          >
            <Zap size={18} /> +3 Energy
          </button>
          <button
            onClick={() => devResetTurn()}
            className="flex items-center justify-center gap-2 py-3 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-300 font-bold active:scale-95 transition-transform"
          >
            <RefreshCw size={18} /> Reset Turn
          </button>
          <button
            onClick={() => devTeleport(0)}
            className="flex items-center justify-center gap-2 py-3 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 font-bold active:scale-95 transition-transform"
          >
            <MapPin size={18} /> Go to Start
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase font-black tracking-widest px-1">Teleport to cell</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {GAME_MAP.map((cell) => (
              <button
                key={cell.id}
                onClick={() => devTeleport(cell.id)}
                className="shrink-0 w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors"
              >
                {cell.id}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
