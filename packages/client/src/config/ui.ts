import type { CarTier } from '@tgperekup/shared';

export const TIER_COLORS: Record<CarTier, string> = {
  Bucket: 'text-gray-400',
  Scrap: 'text-orange-400',
  Business: 'text-blue-400',
  Premium: 'text-purple-400',
  Rarity: 'text-amber-400',
};

export const TIER_CONFIG: Record<CarTier, {
  color: string;
  label: string;
  /** Border color class for card frames. */
  border: string;
  /** Glow shadow class for holographic card effect. */
  glow: string;
}> = {
  Bucket:   { color: 'from-gray-400 to-gray-600',       label: 'Вёдро',   border: 'border-gray-500/40',    glow: 'shadow-gray-500/20' },
  Scrap:    { color: 'from-orange-500 to-red-600',       label: 'Битьё',   border: 'border-orange-500/40',  glow: 'shadow-orange-500/20' },
  Business: { color: 'from-blue-500 to-indigo-600',      label: 'Бизнес',  border: 'border-blue-500/40',    glow: 'shadow-blue-500/20' },
  Premium:  { color: 'from-purple-500 to-fuchsia-600',   label: 'Премиум', border: 'border-purple-500/50',  glow: 'shadow-purple-500/30' },
  Rarity:   { color: 'from-amber-400 to-yellow-600',     label: 'Раритет', border: 'border-amber-400/60',   glow: 'shadow-amber-400/40' },
};
