import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench,
  Zap,
  Trophy,
  Car,
  DollarSign,
  AlertTriangle,
  History,
  Star,
  Hammer,
  Truck,
} from 'lucide-react';
import { GAME_MAP, type CellType } from '@tgperekup/shared';
import { useGameStore } from '../../store/gameStore';
import { DiceArea } from './DiceArea';

const GRID_POSITIONS: Record<number, { row: number; col: number }> = {
  0: { row: 1, col: 1 },
  1: { row: 1, col: 2 },
  2: { row: 1, col: 3 },
  3: { row: 1, col: 4 },
  4: { row: 2, col: 4 },
  5: { row: 3, col: 4 },
  6: { row: 4, col: 4 },
  7: { row: 4, col: 3 },
  8: { row: 4, col: 2 },
  9: { row: 4, col: 1 },
  10: { row: 3, col: 1 },
  11: { row: 2, col: 1 },
};

const CELL_ICONS: Record<CellType, React.ReactNode> = {
  sale: <DollarSign size={20} />,
  buy_bucket: <Car size={20} />,
  buy_scrap: <Hammer size={20} />,
  buy_business: <Car size={20} />,
  buy_premium: <Star size={20} />,
  buy_random: <Zap size={20} />,
  buy_retro: <History size={20} />,
  repair: <Wrench size={20} />,
  special_repair: <Wrench size={20} />,
  race: <Trophy size={20} />,
  rent: <Truck size={20} />,
  fines: <AlertTriangle size={20} />,
};

const CELL_STYLES: Record<CellType, string> = {
  sale: 'from-emerald-500/20 to-emerald-600/30 border-emerald-500/50 text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.15)]',
  buy_bucket: 'from-blue-400/20 to-blue-500/30 border-blue-400/50 text-blue-300 shadow-[0_4px_12px_rgba(59,130,246,0.15)]',
  buy_scrap: 'from-orange-600/20 to-orange-700/30 border-orange-600/50 text-orange-400 shadow-[0_4px_12px_rgba(234,88,12,0.15)]',
  buy_business: 'from-indigo-500/20 to-indigo-600/30 border-indigo-500/50 text-indigo-400 shadow-[0_4px_12px_rgba(99,102,241,0.15)]',
  buy_premium: 'from-purple-500/20 to-purple-600/30 border-purple-500/50 text-purple-400 shadow-[0_4px_12px_rgba(168,85,247,0.15)]',
  buy_random: 'from-cyan-500/20 to-cyan-600/30 border-cyan-500/50 text-cyan-400 shadow-[0_4px_12px_rgba(6,182,212,0.15)]',
  buy_retro: 'from-amber-600/20 to-amber-700/30 border-amber-600/50 text-amber-400 shadow-[0_4px_12px_rgba(217,119,6,0.15)]',
  repair: 'from-blue-500/20 to-blue-600/30 border-blue-500/50 text-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.15)]',
  special_repair: 'from-rose-500/20 to-rose-600/30 border-rose-500/50 text-rose-400 shadow-[0_4px_12px_rgba(225,29,72,0.15)]',
  race: 'from-yellow-500/20 to-yellow-600/30 border-yellow-500/50 text-yellow-400 shadow-[0_4px_12px_rgba(234,179,8,0.15)]',
  rent: 'from-teal-500/20 to-teal-600/30 border-teal-500/50 text-teal-400 shadow-[0_4px_12px_rgba(20,184,166,0.15)]',
  fines: 'from-red-600/20 to-red-700/30 border-red-600/50 text-red-500 shadow-[0_4px_12px_rgba(220,38,38,0.15)]',
};

export const RadialBoard: React.FC = () => {
  const { players, player: localPlayer } = useGameStore();

  return (
    <div className="w-full max-w-[min(94vw,400px)] aspect-square mx-auto relative select-none">
      <div className="grid grid-cols-4 grid-rows-4 gap-1.5 w-full h-full p-1">
        {/* Render Cells */}
        {GAME_MAP.map((cell) => {
          const pos = GRID_POSITIONS[cell.id];
          if (!pos) return null;
          
          const style = CELL_STYLES[cell.type] || 'from-gray-500/10 to-gray-600/10 border-white/10';
          
          return (
            <motion.div
              key={cell.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: cell.id * 0.02 }}
              style={{
                gridRow: pos.row,
                gridColumn: pos.col,
              }}
              className={`
                relative flex flex-col items-center justify-center p-1 rounded-2xl border-[1.5px]
                bg-gradient-to-br backdrop-blur-md transition-transform active:scale-95 overflow-hidden
                ${style}
              `}
            >
              <div className="mb-0.5 opacity-90 drop-shadow-md">{CELL_ICONS[cell.type]}</div>
              <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-tight text-center leading-[1.1] max-w-full break-words line-clamp-2 px-0.5">
                {cell.name}
              </span>

              {/* Player Markers Container */}
              <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 p-2 pointer-events-none">
                {/* We render tokens separately for shared layout animation */}
              </div>
            </motion.div>
          );
        })}

        {/* Center Area (Dice) */}
        <div 
          style={{ gridArea: '2 / 2 / 4 / 4' }}
          className="flex items-center justify-center p-1"
        >
          <DiceArea />
        </div>
      </div>

      {/* Animated Player Tokens */}
      <AnimatePresence mode="popLayout">
        {players.map((p, idx) => {
          const pos = GRID_POSITIONS[p.position];
          if (!pos) return null;
          const isLocal = p.id === localPlayer.id;

          return (
            <motion.div
              key={p.id}
              layout
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 25,
                layout: { duration: 0.4 }
              }}
              style={{
                position: 'absolute',
                top: `${(pos.row - 1) * 25}%`,
                left: `${(pos.col - 1) * 25}%`,
                width: '25%',
                height: '25%',
                // Смещаем фишки от центра, чтобы они не перекрывали текст (отступ в зависимости от индекса)
                paddingTop: `${idx === 0 ? '4px' : idx === 1 ? 'auto' : 'auto'}`,
                paddingBottom: `${idx === 0 ? 'auto' : idx === 1 ? '4px' : '4px'}`,
                paddingLeft: `${idx === 0 ? '4px' : idx === 1 ? '4px' : 'auto'}`,
                paddingRight: `${idx === 0 ? 'auto' : idx === 1 ? 'auto' : '4px'}`,
              }}
              className={`flex pointer-events-none z-20 
                ${idx === 0 ? 'items-start justify-start' : idx === 1 ? 'items-end justify-start' : 'items-end justify-end'}
              `}
            >
              <div
                className={`
                  w-6 h-6 rounded-full border-2 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center
                  ${isLocal 
                    ? 'bg-white border-blue-500 scale-125 z-30' 
                    : 'bg-blue-600 border-white'
                  }
                `}
              >
                {isLocal && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
