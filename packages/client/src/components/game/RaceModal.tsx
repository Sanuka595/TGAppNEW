import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button.js';

export const RaceModal: React.FC = () => {
  const challenge = useGameStore((s) => s.pendingRaceChallenge);
  const players = useGameStore((s) => s.players);
  const player = useGameStore((s) => s.player);
  const acceptRaceDuel = useGameStore((s) => s.acceptRaceDuel);
  const declineRaceDuel = useGameStore((s) => s.declineRaceDuel);

  // Also show resolved race results briefly
  const activeRace = useGameStore((s) => s.activeRace);
  const isResolved = activeRace?.status === 'resolved';
  const isMyRaceResult = isResolved && (activeRace?.winnerId === player.id || activeRace?.initiatorId === player.id || activeRace?.targetId === player.id);

  if (!challenge && !isMyRaceResult) return null;

  const initiatorName = (id: string) => {
    const p = players.find(x => x.id === id);
    return p?.name ?? id.substring(0, 4).toUpperCase();
  };

  return (
    <AnimatePresence>
      {challenge && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-full max-w-sm glass-panel rounded-[3rem] p-8 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-6xl mb-4"
            >
              🏎️
            </motion.div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Тебя вызвали!</h2>
            <p className="text-white/60 text-sm mb-1">
              <span className="text-cyan-300 font-bold">{initiatorName(challenge.initiatorId)}</span> бросает перчатку
            </p>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl py-3 px-6 mb-6 inline-block">
              <p className="text-3xl font-black text-rose-400">${challenge.bet}</p>
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Ставка</p>
            </div>
            <p className="text-xs text-white/30 italic mb-6">
              Победитель определяется броском D6 + бонус класса машины.<br/>Rarity +2 · Premium +1 · Scrap -1
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => declineRaceDuel(challenge.initiatorId)}
              >
                <X size={16} /> Слиться
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => acceptRaceDuel(challenge.initiatorId)}
              >
                <Trophy size={16} /> Принять
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {!challenge && isMyRaceResult && activeRace?.logs && (
        <div className="fixed inset-x-4 top-24 z-[150]">
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="glass-panel rounded-[2rem] p-5"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{activeRace.winnerId === player.id ? '🏆' : '💀'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm mb-1">
                  {activeRace.winnerId === player.id ? 'ПОБЕДА в гонке!' : 'Поражение в гонке'}
                </p>
                {activeRace.logs.map((log, i) => (
                  <p key={i} className="text-xs text-white/60 leading-relaxed">{log}</p>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
