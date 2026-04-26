import { 
  SeverityLevel, 
  CarTier, 
  DefectCategory, 
  DefectInstance, 
  Car, 
  CarHistoryEntry, 
  Player,
  RoomState,
  Debt,
  GameNews,
  LogType
} from './dtos/index.js';

export { SeverityLevel, CarTier, DefectCategory, DefectInstance, Car, CarHistoryEntry, Player, RoomState, Debt, GameNews, LogType };

export type CellType =
  | 'sale'
  | 'buy_bucket'
  | 'buy_scrap'
  | 'buy_business'
  | 'buy_premium'
  | 'buy_random'
  | 'buy_retro'
  | 'repair'
  | 'special_repair'
  | 'race'
  | 'rent'
  | 'fines';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Health penalty subtracted per unrepaired defect. Final health is clamped to [0, 100]. */
export const HEALTH_PENALTIES: Record<SeverityLevel, number> = {
  Light: 10,
  Medium: 25,
  Serious: 45,
  Critical: 80,
};

// ─── Defects ──────────────────────────────────────────────────────────────────

/** Static defect definition from the game database. */
export interface DefectType {
  id: string;
  name: string;
  category: DefectCategory;
  severity: SeverityLevel;
  /** true only for 'legal_block' — prevents the car from being sold. */
  preventsSale?: boolean;
}

// ─── Game Event Log (persistence layer) ──────────────────────────────────────

export type GameEventType =
  | 'buy_car'
  | 'sell_car'
  | 'repair_car'
  | 'rent_car'
  | 'race_win'
  | 'race_loss'
  | 'dice_roll'
  | 'market_refresh'
  | 'loan_created'
  | 'loan_repaid'
  | 'car_confiscated'
  | 'player_joined'
  | 'player_left'
  | 'game_won';

/**
 * Structured server-side event record designed for future persistence (Redis / DB).
 * Accumulate per room; flush to DB on game end or on a rolling window.
 */
export interface GameEventLog {
  /** Unique entry ID (crypto.randomUUID or nanoid). */
  id: string;
  roomId: string;
  /** Unix timestamp in ms. */
  timestamp: number;
  playerId: string;
  eventType: GameEventType;
  /** Arbitrary structured data — keep serialisable (no class instances). */
  payload: Record<string, unknown>;
}

// ─── Debt (P2P Lending) ───────────────────────────────────────────────────────

// ─── Board ────────────────────────────────────────────────────────────────────

export interface BoardCell {
  /** Board position index, 0–11. */
  id: number;
  type: CellType;
  name: string;
  icon: string;
  description: string;
}

export const GAME_MAP: BoardCell[] = [
  { id: 0,  type: 'sale',           name: 'Чапаевка',          icon: '💰', description: 'Продажа авто' },
  { id: 1,  type: 'buy_bucket',     name: 'Вёдра',             icon: '🪣', description: 'Покупка вёдер + дефект' },
  { id: 2,  type: 'repair',         name: 'Автосервис',        icon: '🛠️', description: 'Ремонт машин' },
  { id: 3,  type: 'race',           name: 'Гонка',             icon: '🏎️', description: 'Заезд с игроком' },
  { id: 4,  type: 'buy_random',     name: 'Автоподбор',        icon: '🚗', description: 'Авто любого уровня + дефект' },
  { id: 5,  type: 'buy_scrap',      name: 'Битьё',             icon: '🔨', description: 'Битые машины' },
  { id: 6,  type: 'sale',           name: 'Чапаевка',          icon: '💰', description: 'Продажа авто' },
  { id: 7,  type: 'buy_premium',    name: 'Премиум',           icon: '⭐', description: 'Премиум авто + дефект' },
  { id: 8,  type: 'special_repair', name: 'Автосервис Пехота', icon: '🛠️', description: 'Спец сервис' },
  { id: 9,  type: 'race',           name: 'Гонка',             icon: '🏎️', description: 'Заезд' },
  { id: 10, type: 'rent',           name: 'Прокат',            icon: '🚗', description: 'Сдача авто' },
  { id: 11, type: 'buy_retro',      name: 'Ретро',             icon: '🏎️', description: 'Редкие и ретро авто' },
];

// ─── Solo Mode ────────────────────────────────────────────────────────────────

export interface SoloQuest {
  id: string;
  targetModel: string;
  /** Minimum required health, typically 90 or 100. */
  minHealth: number;
  turnsLeft: number;
  reward: number;
}

// ─── Log ──────────────────────────────────────────────────────────────────────

export interface LogEntry {
  text: string;
  type?: LogType;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  // Player
  player: Player;
  garage: Car[];
  market: Car[];

  // Turn
  currentEvent: BoardCell | null;
  lastDiceRoll: number | null;
  lastTaxDeduction: number | null;
  boardAnimationStatus: 'idle' | 'running';
  hasRolledThisTurn: boolean;

  // Log
  logs: LogEntry[];

  // UI flags
  isGarageOpen: boolean;
  isRulesOpen: boolean;
  isContractsOpen: boolean;
  highlightedCellId: number | null;

  // Solo mode
  isSoloMode: boolean;
  /** Bot's debt balance — grows by 10% every 10 turns. */
  soloDebt: string;
  botTurnsUntilAction: number;
  activeQuest: SoloQuest | null;

  // Multiplayer
  roomId: string | null;
  players: Player[];
  activeDebts: Debt[];
  isHost: boolean;
  hostId?: string;
  currentTurnIndex: number;
  winCondition: number;
  winnerId: string | null;

  // Global
  activeEvent: GameNews | null;
  totalTurns: number;

  // Race
  activeRace: {
    initiatorId: string;
    participants: string[];
    bet: number;
    startTime: number;
  } | null;

  // Remote player animation
  remoteAnimation: {
    playerId: string;
    diceValue: number;
    fromPosition: number;
  } | null;
}

// ─── Socket.IO Sync Actions ───────────────────────────────────────────────────

export type SyncActionPayload =
  // ── Player market actions ──────────────────────────────────────────────────
  | { action: 'buyCar';                payload: string }
  | { action: 'sellCar';               payload: string }
  | { action: 'repairCar';             payload: { carId: string; defectId: string; isDiscounted: boolean } }
  | { action: 'rentCar';               payload: string }
  | { action: 'manualMove';            payload: { steps: number; newPosition: number } }
  | { action: 'buyEnergy';             payload: null }
  | { action: 'diagnoseCar';           payload: string }
  | { action: 'diagnoseMarketCar';     payload: string }
  | { action: 'refreshMarket';         payload: null }
  | { action: 'updateMarket';          payload: Car[] }
  | { action: 'newsUpdate';            payload: GameNews }
  | { action: 'victory';               payload: null }
  // ── P2P Debt / Perekup Hub ────────────────────────────────────────────────
  | { action: 'loanOffer';             payload: Debt }
  | { action: 'loanAccepted';          payload: Debt }
  | { action: 'repayDebt';             payload: string }        // debtId
  | { action: 'confiscateCar';         payload: string }        // carId
  // ── Race Duel ─────────────────────────────────────────────────────────────
  | { action: 'raceLobbyOpen';         payload: { initiatorId: string; bet: number } }
  | { action: 'raceChallengeInitiated'; payload: { initiatorId: string; targetId: string; bet: number } }
  | { action: 'raceAccept';            payload: { initiatorId: string } }
  | { action: 'raceDecline';           payload: { initiatorId: string } }
  | { action: 'raceJoin';              payload: { initiatorId: string } }
  | { action: 'raceResults';           payload: { winnerId: string; loserId: string; bet: number; logs: string[] } };

// ─── Socket.IO Events ─────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  room_error: (msg: string) => void;
  room_updated: (state: RoomState) => void;
  dice_roll_result: (data: { playerId: string; diceValue: number; newPosition: number }) => void;
  sync_action_result: (data: { playerId: string } & SyncActionPayload) => void;
}

export interface ClientToServerEvents {
  create_room: (
    data: { player: Player; winCondition: number },
    callback: (res: { success: boolean; error?: string; roomId?: string }) => void,
  ) => void;
  join_room: (
    data: { roomId: string; player: Player },
    callback: (res: { success: boolean; error?: string }) => void,
  ) => void;
  leave_room: (roomId: string, playerId: string) => void;
  dice_roll: (data: { roomId: string; playerId: string }) => void;
  pass_turn: (data: { roomId: string; playerId: string }) => void;
  sync_action: (data: { roomId: string; playerId: string } & SyncActionPayload) => void;
}
