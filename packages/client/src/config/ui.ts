import type { CarTier } from '@tgperekup/shared';

export const TIER_COLORS: Record<CarTier, string> = {
  Bucket: 'text-gray-400',
  Scrap: 'text-orange-400',
  Business: 'text-blue-400',
  Premium: 'text-purple-400',
  Rarity: 'text-amber-400',
};

export const TIER_CONFIG: Record<CarTier, { color: string; label: string }> = {
  Bucket: { color: 'from-gray-400 to-gray-600', label: 'Вёдро' },
  Scrap: { color: 'from-orange-500 to-red-600', label: 'Битьё' },
  Business: { color: 'from-blue-500 to-indigo-600', label: 'Бизнес' },
  Premium: { color: 'from-purple-500 to-fuchsia-600', label: 'Премиум' },
  Rarity: { color: 'from-amber-400 to-yellow-600', label: 'Раритет' },
};
