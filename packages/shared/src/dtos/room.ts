import { z } from 'zod';
import { PlayerSchema } from './player.js';
import { CarSchema } from './car.js';
import { CarTierSchema } from './common.js';

// ─── Market Statistics ────────────────────────────────────────────────────────

/** Accumulated per-session market activity. Used by Smart Event Director to weight news. */
export const MarketStatsSchema = z.object({
  boughtByTier: z.record(CarTierSchema, z.number()),
  repairsDone: z.number(),
  carsRented: z.number(),
  racesWon: z.number(),
});

// ─── Event Feed ───────────────────────────────────────────────────────────────

export const EventFeedEntryTypeSchema = z.enum([
  'buy', 'sell', 'race_win', 'race_loss', 'loan', 'confiscate',
]);

/** Single entry in the server-authoritative global event feed. */
export const EventFeedEntrySchema = z.object({
  playerId: z.string(),
  playerName: z.string().optional(),
  type: EventFeedEntryTypeSchema,
  text: z.string(),
  timestamp: z.number(),
});

export const GameNewsSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  effects: z.object({
    tierMultipliers: z.record(z.string(), z.number()),
    modelMultipliers: z.record(z.string(), z.number()),
  }),
});

export const DebtSchema = z.object({
  id: z.string(),
  lenderId: z.string(),
  borrowerId: z.string().optional(),
  amount: z.string(),
  interest: z.string(),
  totalToPay: z.string(),
  turnsLeft: z.number(),
  initialTurns: z.number(),
  collateralCarId: z.string().optional(),
  status: z.enum(['pending', 'active', 'closed', 'confiscated']),
});

// ─── Race Duel ────────────────────────────────────────────────────────────────

export const RaceParticipantSchema = z.object({
  playerId: z.string(),
  roll: z.number(),
  bonus: z.number(),
  carTier: z.string(),
});

export const RaceDuelSchema = z.object({
  id: z.string(),
  initiatorId: z.string(),
  targetId: z.string().optional(),
  participants: z.array(RaceParticipantSchema).optional(),
  bet: z.number(),
  /** pending_acceptance = waiting for targetId to confirm; open_lobby = anyone can join; resolved = done */
  status: z.enum(['pending_acceptance', 'open_lobby', 'resolved']),
  winnerId: z.string().optional(),
  logs: z.array(z.string()).optional(),
  expiresAt: z.number(),
});

// ─── Room State ───────────────────────────────────────────────────────────────

export const RoomStateSchema = z.object({
  id: z.string(),
  players: z.array(PlayerSchema),
  market: z.array(CarSchema),
  hostId: z.string(),
  currentTurnIndex: z.number(),
  winCondition: z.number(),
  winnerId: z.string().optional(),
  activeEvent: GameNewsSchema.nullable().optional(),
  activeDebts: z.array(DebtSchema).optional(),
  activeRace: RaceDuelSchema.nullable().optional(),
  totalTurns: z.number().optional(),
  marketRefreshedAt: z.number().optional(),
  /** Per-session market activity — drives Smart Event Director. */
  marketStats: MarketStatsSchema.optional(),
  /** Server-authoritative global event feed (max 20 entries). */
  eventFeed: z.array(EventFeedEntrySchema).optional(),
});

export type GameNews = z.infer<typeof GameNewsSchema>;
export type Debt = z.infer<typeof DebtSchema>;
export type RaceParticipant = z.infer<typeof RaceParticipantSchema>;
export type RaceDuel = z.infer<typeof RaceDuelSchema>;
export type RoomState = z.infer<typeof RoomStateSchema>;
export type MarketStats = z.infer<typeof MarketStatsSchema>;
export type EventFeedEntry = z.infer<typeof EventFeedEntrySchema>;
export type EventFeedEntryType = z.infer<typeof EventFeedEntryTypeSchema>;
