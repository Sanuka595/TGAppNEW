import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Zap, Trophy, Car, DollarSign,
  AlertTriangle, History, Star, Hammer, Truck
} from 'lucide-react';
import { GAME_MAP, type CellType } from '@tgperekup/shared';
import { useGameStore } from '../../store/gameStore';
import { DiceArea } from './DiceArea';
import { triggerHaptic } from '../../lib/tmaProvider';

const GRID_POSITIONS: Record<number, { row: number; col: number }> = {
  0: { row: 1, col: 1 }, 1: { row: 1, col: 2 }, 2: { row: 1, col: 3 }, 3: { row: 1, col: 4 },
  4: { row: 2, col: 4 }, 5: { row: 3, col: 4 }, 6: { row: 4, col: 4 }, 7: { row: 4, col: 3 },
  8: { row: 4, col: 2 }, 9: { row: 4, col: 1 }, 10: { row: 3, col: 1 }, 11: { row: 2, col: 1 },
};

const CELL_ICONS: Record<CellType, React.ReactNode> = {
  sale: <DollarSign size={22} />,
  buy_bucket: <Car size={22} />,
  buy_scrap: <Hammer size={22} />,
  buy_business: <Car size={22} />,
  buy_premium: <Star size={22} />,
  buy_random: <Zap size={22} />,
  buy_retro: <History size={22} />,
  repair: <Wrench size={22} />,
  special_repair: <Wrench size={22} />,
  race: <Trophy size={22} />,
  rent: <Truck size={22} />,
  fines: <AlertTriangle size={22} />,
};

// Premium Dark Glassmorphism Styles
const CELL_STYLES: Record<CellType, string> = {
  sale: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300 shadow-[inset_0_0_15px_rgba(16,185,129,0.15)]',
  buy_bucket: 'bg-blue-500/10 border-blue-400/30 text-blue-300 shadow-[inset_0_0_15px_rgba(59,130,246,0.15)]',
  buy_scrap: 'bg-orange-500/10 border-orange-400/30 text-orange-300 shadow-[inset_0_0_15px_rgba(249,115,22,0.15)]',
  buy_business: 'bg-indigo-500/10 border-indigo-400/30 text-indigo-300 shadow-[inset_0_0_15px_rgba(99,102,241,0.15)]',
  buy_premium: 'bg-purple-500/10 border-purple-400/30 text-purple-300 shadow-[inset_0_0_15px_rgba(168,85,247,0.15)]',
  buy_random: 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300 shadow-[inset_0_0_15px_rgba(6,182,212,0.15)]',
  buy_retro: 'bg-amber-500/10 border-amber-400/30 text-amber-300 shadow-[inset_0_0_15px_rgba(245,158,11,0.15)]',
  repair: 'bg-sky-500/10 border-sky-400/30 text-sky-300 shadow-[inset_0_0_15px_rgba(14,165,233,0.15)]',
  special_repair: 'bg-rose-500/10 border-rose-400/30 text-rose-300 shadow-[inset_0_0_15px_rgba(244,63,94,0.15)]',
  race: 'bg-yellow-500/10 border-yellow-400/30 text-yellow-300 shadow-[inset_0_0_15px_rgba(234,179,8,0.15)]',
  rent: 'bg-teal-500/10 border-teal-400/30 text-teal-300 shadow-[inset_0_0_15px_rgba(20,184,166,0.15)]',
  fines: 'bg-red-500/10 border-red-400/30 text-red-300 shadow-[inset_0_0_15px_rgba(239,68,68,0.15)]',
};

export const RadialBoard: React.FC = () => {
  const { players, player: localPlayer, currentTurnIndex, hasRolledThisTurn, manualMove } = useGameStore();

  const isMyTurn = players[currentTurnIndex]?.id === localPlayer.id;
  const canUseEnergy = isMyTurn && !hasRolledThisTurn && localPlayer.energy > 0;

  const handleCellClick = (cellId: number) => {
    if (!canUseEnergy) return;
    const steps = (cellId - localPlayer.position + 12) % 12;
    if (steps === 0) return;
    triggerHaptic('impact', 'medium');
    manualMove(steps);
  };

  return (
    <div className="w-full max-w-[min(96vw,420px)] max-h-full aspect-square mx-auto relative select-none p-1.5">
      {/* Background Decor - Мягкое свечение под полем */}
      <div className="absolute inset-0 bg-blue-500/5 blur-[80px] rounded-full" />

      <div className="grid grid-cols-4 grid-rows-4 gap-2 w-full h-full relative z-10">
        {GAME_MAP.map((cell) => {
          const pos = GRID_POSITIONS[cell.id];
          if (!pos) return null;

          const style = CELL_STYLES[cell.type] || 'from-gray-500/10 to-gray-800/40 border-white/10';

          return (
            <motion.div
              key={cell.id}
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                delay: cell.id * 0.03,
                type: 'spring',
                stiffness: 200
              }}
              style={{ gridRow: pos.row, gridColumn: pos.col }}
              onClick={() => handleCellClick(cell.id)}
              className={`
                relative flex flex-col items-center justify-center p-1.5 rounded-[20px] 
                border-t-[1px] border-l-[1px] bg-gradient-to-br backdrop-blur-xl
                transition-all duration-300 active:scale-95 group
                ${style}
                ${canUseEnergy ? 'cursor-pointer hover:ring-2 hover:ring-white/50 hover:-translate-y-1' : 'cursor-default'}
              `}
            >
              {/* Inner Glow Effect */}
              <div className="absolute inset-0 rounded-[20px] bg-white/5 opacity-0 group-active:opacity-100 transition-opacity" />

              <div className="mb-1 transition-transform group-hover:scale-110 duration-300">
                {CELL_ICONS[cell.type]}
              </div>

              <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest text-center leading-tight opacity-80 group-hover:opacity-100 transition-opacity">
                {cell.name}
              </span>
            </motion.div>
          );
        })}

        {/* Center Area (Dice) - Визуальный фокус */}
        <div
          style={{ gridArea: '2 / 2 / 4 / 4' }}
          className="flex items-center justify-center relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl border border-white/5 blur-[1px]" />
          <DiceArea />
        </div>
      </div>

      {/* Animated Player Tokens */}
      <AnimatePresence>
        {players.map((p, idx) => {
          const pos = GRID_POSITIONS[p.position];
          if (!pos) return null;
          const isLocal = p.id === localPlayer.id;

          // Динамический расчет смещения, чтобы фишки не слипались
          const offset = 8;
          const translate = {
            0: `translate(-${offset}px, -${offset}px)`,
            1: `translate(${offset}px, -${offset}px)`,
            2: `translate(-${offset}px, ${offset}px)`,
            3: `translate(${offset}px, ${offset}px)`,
          }[idx % 4];

          return (
            <motion.div
              key={p.id}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                layout: { duration: 0.35, ease: "easeOut" }
              }}
              style={{
                position: 'absolute',
                top: `${(pos.row - 1) * 25 + 12.5}%`,
                left: `${(pos.col - 1) * 25 + 12.5}%`,
                width: '0px',
                height: '0px',
                zIndex: isLocal ? 50 : 40,
              }}
              className="flex items-center justify-center pointer-events-none"
            >
              <div
                style={{ transform: translate }}
                className={`
                  relative w-7 h-7 rounded-full flex items-center justify-center
                  backdrop-blur-md transition-all duration-300
                  ${isLocal
                    ? 'bg-blue-500 border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110'
                    : 'bg-zinc-800 border-2 border-zinc-400 shadow-xl'
                  }
                `}
              >
                {/* Аватар или Иконка игрока */}
                <span className="text-[10px] font-black text-white italic">
                  {isLocal ? 'ME' : 'P' + (idx + 1)}
                </span>

                {isLocal && (
                  <div className="absolute -inset-1 rounded-full border border-blue-400 animate-ping opacity-20" />
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};