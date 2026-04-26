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
  deterministicMultiplier,
  calculateCarHealth,
  applyNewsEffects,
  calculateCurrentMarketValue,
  calculateSellPrice,
  calculateRentIncome,
  generateRepairCost,
} from './businessLogic.js';

export * from './carDatabase.js';
export * from './defectDatabase.js';
export { generateCar } from './businessLogic.js';
