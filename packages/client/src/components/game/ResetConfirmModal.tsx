import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { triggerHaptic } from '../../lib/tmaProvider';

interface ResetConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({ open, onConfirm, onCancel }) => {
  const handleConfirm = () => {
    triggerHaptic('notification', 'warning');
    onConfirm();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-6 bg-black/80 backdrop-blur-xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-xs glass-panel rounded-[2rem] p-6 text-center shadow-2xl"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
            </div>

            <h3 className="text-xl font-black text-white tracking-tight mb-2">
              Сбросить прогресс?
            </h3>
            <p className="text-sm text-white/50 mb-6 leading-relaxed">
              Гараж, деньги и история будут уничтожены. Это действие необратимо.
            </p>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onCancel}>
                Отмена
              </Button>
              <Button
                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                onClick={handleConfirm}
              >
                Сбросить
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
