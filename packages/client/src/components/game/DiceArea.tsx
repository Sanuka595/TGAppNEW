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
  const hasEnergy = player.energy > 0;
  const canRoll = isMyTurn && !hasRolledThisTurn && hasEnergy;

  return (
    <div className="flex items-center justify-center w-full h-full relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={isMyTurn ? 'my-turn' : 'other-turn'}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="absolute top-[calc(22px)] left-0 right-0 text-[9px] uppercase opacity-60 font-black tracking-widest text-white text-center drop-shadow-md"
        >
          {isMyTurn
            ? (hasRolledThisTurn ? 'Действуй' : (hasEnergy ? 'Твой выход!' : 'Нет энергии!'))
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
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center bg-rose-500/10 backdrop-blur-xl border border-rose-400/30 text-rose-300 shadow-[inset_0_0_20px_rgba(244,63,94,0.2),_0_0_20px_rgba(244,63,94,0.3)] transition-all overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-rose-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-2xl sm:text-3xl font-black mb-0.5 sm:mb-1 drop-shadow-md relative z-10">{lastDiceRoll}</span>
            <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-tighter leading-[1.1] text-center px-1 relative z-10">Завершить<br />ход</span>
          </motion.button>
        ) : (
          <motion.button
            key="dice-btn"
            whileTap={canRoll ? { scale: 0.9, y: 2 } : {}}
            onClick={() => rollDice()}
            disabled={!canRoll}
            className={`
              w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl font-black
              transition-all duration-300 backdrop-blur-xl relative group overflow-hidden border
              ${canRoll
                ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-300 shadow-[inset_0_0_20px_rgba(6,182,212,0.2),_0_0_20px_rgba(6,182,212,0.4)] cursor-pointer'
                : 'bg-white/5 border-white/10 text-white/20 shadow-none cursor-not-allowed'
              }
            `}
          >
            {canRoll && <div className="absolute inset-0 bg-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
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
