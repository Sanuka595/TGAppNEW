import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export const DiceArea: React.FC = () => {
  const { 
    rollDice, 
    passTurn,
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
    <div className="flex items-center justify-center w-full h-full relative">
      <AnimatePresence mode="wait">
        <motion.div 
          key={isMyTurn ? 'my-turn' : 'other-turn'}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="absolute -top-5 left-0 right-0 text-[9px] uppercase opacity-60 font-black tracking-widest text-white text-center drop-shadow-md"
        >
          {isMyTurn 
            ? (hasRolledThisTurn ? 'Действуй' : 'Твой выход!') 
            : `Ждем: ${currentPlayer?.name || '...'}`}
        </motion.div>
      </AnimatePresence>
      
      <div className="relative group flex flex-col items-center justify-center">
        {isMyTurn && hasRolledThisTurn ? (
          <motion.button
            key="end-turn-btn"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => passTurn()}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center justify-center bg-gradient-to-br from-rose-500 to-red-600 text-white border-b-[3px] border-red-800 shadow-[0_10px_20px_rgba(225,29,72,0.3)] active:border-b-0 active:translate-y-[3px] transition-all"
          >
            <span className="text-2xl sm:text-3xl font-black mb-0.5 sm:mb-1 drop-shadow-md">{lastDiceRoll}</span>
            <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-tighter leading-[1.1] text-center px-1">Завершить<br/>ход</span>
          </motion.button>
        ) : (
          <motion.button
            key="dice-btn"
            whileTap={canRoll ? { scale: 0.9, y: 2 } : {}}
            onClick={() => rollDice()}
            disabled={!canRoll}
            className={`
              w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-4xl sm:text-5xl font-black
              transition-all duration-300 border-b-[3px]
              ${canRoll 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-700 shadow-[0_10px_20px_rgba(59,130,246,0.3)] cursor-pointer hover:brightness-110 active:border-b-0 active:translate-y-[3px]' 
                : 'bg-white/5 text-white/20 border-white/10 cursor-not-allowed backdrop-blur-sm shadow-inner'
              }
            `}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={lastDiceRoll || 'initial'}
                initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                className="drop-shadow-lg"
              >
                {lastDiceRoll || '🎲'}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        )}
        
        {canRoll && (
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute -inset-2 bg-blue-500 rounded-full blur-xl -z-10"
          />
        )}
      </div>
    </div>
  );
};
