import React from 'react';
import type { Car } from '@tgperekup/shared';
import { TIER_CONFIG } from '../../config/ui';

interface CarCardProps {
  car: Car;
  /** Optional click handler — e.g. select car for action. */
  onClick?: () => void;
  /** Show a subtle selected ring when true. */
  selected?: boolean;
  /** Compact mode: smaller card for list views. */
  compact?: boolean;
}

/** Tier emoji fallback when no SVG asset is available. */
const TIER_EMOJI: Record<string, string> = {
  Bucket:   '🪣',
  Scrap:    '🔨',
  Business: '💼',
  Premium:  '⭐',
  Rarity:   '👑',
};

const healthColor = (hp: number) =>
  hp >= 80 ? 'text-emerald-400' : hp >= 50 ? 'text-yellow-400' : 'text-red-400';

/**
 * Visual car card component.
 *
 * Uses car.imageId to load /assets/cars/{imageId}.svg when available.
 * Falls back to tier emoji when imageId is absent or the asset fails to load.
 * Border and glow intensity scale with tier rarity — Rarity gets golden frame.
 *
 * This component is the foundation for the TCG-style inventory (Phase 6).
 * Full glassmorphism styling will be layered on top once SVG assets are ready.
 */
export const CarCard: React.FC<CarCardProps> = ({ car, onClick, selected = false, compact = false }) => {
  const cfg = TIER_CONFIG[car.tier];
  const [imgFailed, setImgFailed] = React.useState(false);
  const showImg = !!car.imageId && !imgFailed;

  const unrepairedCount = car.defects.filter(d => !d.isRepaired).length;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        'relative flex flex-col rounded-2xl border bg-white/5 backdrop-blur-sm',
        'transition-all duration-200 cursor-pointer select-none overflow-hidden',
        cfg.border,
        `shadow-lg ${cfg.glow}`,
        selected ? 'ring-2 ring-white/60 scale-[1.02]' : 'hover:scale-[1.01]',
        compact ? 'p-3 gap-2' : 'p-4 gap-3',
        onClick ? 'active:scale-[0.98]' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Tier gradient accent — top-right glow blob */}
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${cfg.color} opacity-15 blur-2xl pointer-events-none`}
      />

      {/* Car image or emoji fallback */}
      <div className={`flex items-center justify-center ${compact ? 'h-12' : 'h-20'} rounded-xl bg-white/5`}>
        {showImg ? (
          <img
            src={`/assets/cars/${car.imageId}.svg`}
            alt={car.name}
            className={compact ? 'h-10 w-auto' : 'h-16 w-auto'}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className={compact ? 'text-3xl' : 'text-5xl'}>{TIER_EMOJI[car.tier] ?? '🚗'}</span>
        )}
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <span className={`font-bold text-white truncate leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>
            {car.name}
          </span>
          <span className={`text-[9px] font-black uppercase tracking-wider shrink-0 ${TIER_CONFIG[car.tier].border.replace('border-', 'text-').replace('/40', '').replace('/50', '').replace('/60', '')}`}>
            {cfg.label}
          </span>
        </div>

        {/* Health bar */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${cfg.color} transition-all`}
              style={{ width: `${car.health}%` }}
            />
          </div>
          <span className={`text-[9px] font-black tabular-nums ${healthColor(car.health)}`}>
            {car.health}%
          </span>
        </div>
      </div>

      {/* Defect badge */}
      {unrepairedCount > 0 && (
        <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
          <span className="text-[8px] font-black text-white">{unrepairedCount}</span>
        </div>
      )}

      {/* Lock badge */}
      {car.isLocked && (
        <div className="absolute top-2 left-2 text-[10px]">🔒</div>
      )}
    </div>
  );
};
