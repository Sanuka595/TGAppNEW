import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import type { EventFeedEntry } from '@tgperekup/shared';

const ICONS: Record<EventFeedEntry['type'], string> = {
  buy:        '🛒',
  sell:       '💰',
  race_win:   '🏆',
  race_loss:  '💀',
  loan:       '🤝',
  confiscate: '🚨',
};

const EventFeedItem: React.FC<{ entry: EventFeedEntry }> = React.memo(({ entry }) => {
  const tag = entry.playerId.substring(0, 4).toUpperCase();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1.5 text-[11px] text-white/80 max-w-[220px] shadow-lg"
    >
      <span className="text-base leading-none">{ICONS[entry.type]}</span>
      <span className="truncate">
        <span className="font-bold text-white/90">{tag}</span>{' '}{entry.text}
      </span>
    </motion.div>
  );
});
EventFeedItem.displayName = 'EventFeedItem';

export const EventFeed: React.FC = () => {
  const eventFeed = useGameStore((s) => s.eventFeed);
  const roomId = useGameStore((s) => s.roomId);

  // Only visible in multiplayer and when there are events
  if (!roomId || eventFeed.length === 0) return null;

  return (
    <div className="fixed right-3 top-16 z-30 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence initial={false} mode="popLayout">
        {eventFeed.slice(0, 5).map((entry) => (
          <EventFeedItem key={`${entry.playerId}-${entry.timestamp}`} entry={entry} />
        ))}
      </AnimatePresence>
    </div>
  );
};
