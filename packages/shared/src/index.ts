export * from './constants.js';

export type {
  CellType,
  DefectType,
  BoardCell,
  SoloQuest,
  LogEntry,
  GameState,
  SyncActionPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  GameEventType,
  GameEventLog,
} from './types.js';

export { HEALTH_PENALTIES, GAME_MAP } from './types.js';

export * from './dtos/index.js';

export {
  SEVERITY_COST_RANGES,
  OWNERSHIP_TAX_RATES,
  PROFIT_MARGINS,
  RENT_INCOME,
  TIER_RACE_BONUS,
  SOLO_RACE_TIER_MULTIPLIERS,
  deterministicMultiplier,
  calculateCarHealth,
  applyNewsEffects,
  calculateCurrentMarketValue,
  calculateSellPrice,
  calculateRentIncome,
  calculateSoloRaceWinChance,
  canUseDiagnostics,
  generateRepairCost,
  generateMarketForCell,
  resolveRandomEncounter,
  selectWeightedNews,
} from './businessLogic.js';
export type { RandomEncounter } from './businessLogic.js';

export * from './carDatabase.js';
export * from './defectDatabase.js';
export * from './newsDatabase.js';
export * from './businessLogic.js';
