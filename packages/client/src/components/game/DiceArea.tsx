import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export const DiceArea: React.FC = () => {
  const { 
    rollDice, 
    lastDiceRoll, 
    player, 
    players, 
    currentTurnIndex, 
    hasRolledThisTurn 
  } = useGameStore();

  const currentPlayer = players[currentTurnIndex];
  const isMyTurn = currentPlayer?.id === player.id;
  const canRoll = isMyTurn && !hasRolledThisTurn;

  return (
    <div className="flex flex-col items-center justify-center p-2 w-full h-full">
      <AnimatePresence mode="wait">
        <motion.div 
          key={isMyTurn ? 'my-turn' : 'other-turn'}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-[10px] uppercase opacity-40 mb-3 font-black tracking-widest text-white text-center"
        >
          {isMyTurn 
            ? (hasRolledThisTurn ? 'Ход сделан' : 'Твой выход!') 
            : `Ждем: ${currentPlayer?.name || '...'}`}
        </motion.div>
      </AnimatePresence>
      
      <div className="relative group">
        <motion.button
          whileTap={canRoll ? { scale: 0.9, y: 2 } : {}}
          onClick={() => rollDice()}
          disabled={!canRoll}
          className={`
            w-24 h-24 rounded-3xl flex items-center justify-center text-5xl font-black
            transition-all duration-300 border-b-4 
            ${canRoll 
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-700 shadow-xl shadow-blue-500/20 cursor-pointer' 
              : 'bg-white/10 text-white/20 border-white/5 cursor-not-allowed opacity-50'
            }
          `}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={lastDiceRoll || 'initial'}
              initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              {lastDiceRoll || '🎲'}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        
        {canRoll && (
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -inset-3 bg-blue-500 rounded-[2.5rem] blur-xl -z-10"
          />
        )}
      </div>

      {lastDiceRoll && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 px-3 py-1 bg-white/5 rounded-full border border-white/10"
        >
          <span className="text-[10px] text-white/60 uppercase font-black tracking-tighter">
            Результат: {lastDiceRoll}
          </span>
        </motion.div>
      )}
    </div>
  );
};
