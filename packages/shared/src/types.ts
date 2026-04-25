// ─── Union Types ──────────────────────────────────────────────────────────────

export type SeverityLevel = 'Light' | 'Medium' | 'Serious' | 'Critical';

export type CarTier = 'Bucket' | 'Scrap' | 'Business' | 'Premium' | 'Rarity';

export type DefectCategory = 'Engine' | 'Electrical' | 'Suspension' | 'Body';

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

export type LogType = 'bot' | 'system' | 'debt' | 'quest' | 'success' | 'error' | 'info';

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

/** A concrete defect instance attached to a specific car. */
export interface DefectInstance {
  /** Unique instance ID generated via Math.random. */
  id: string;
  defectTypeId: string;
  /** Severity is denormalised here so Car objects are self-contained for price/health calculations. */
  severity: SeverityLevel;
  /** Hidden defects are not visible to the buyer at purchase time (Rarity/Premium). */
  isHidden: boolean;
  /** Repair cost stored as Decimal string to avoid floating-point errors. */
  repairCost: string;
  isRepaired: boolean;
}

// ─── Car ─────────────────────────────────────────────────────────────────────

export interface Car {
  /** Unique ID generated via Math.random. */
  id: string;
  name: string;
  tier: CarTier;
  /** Base market price stored as Decimal string. */
  basePrice: string;
  defects: DefectInstance[];
  history: string[];
  /**
   * Condition score 0–100.
   * Calculated as: `100 - sum(HEALTH_PENALTIES[defect.severity])` for all unrepaired defects.
   * Clamped to a minimum of 0.
   */
  health: number;
  /** true if the car was rented out this turn. */
  isRented?: boolean;
  /** true if the car is locked as debt collateral. */
  isLocked?: boolean;
  /** Purchase price as Decimal string — used for P&L calculations. */
  boughtFor?: string;
  /** Odometer reading in km — increments on each rental turn. */
  mileage?: number;
  /** Typed event log for this car — structured replacement for free-form history[]. Phase 2: migrate fully. */
  auditLog?: CarHistoryEntry[];
}

// ─── Car History ──────────────────────────────────────────────────────────────

/** A typed ownership/event entry for a specific car. Replaces free-form history[] in Phase 2. */
export interface CarHistoryEntry {
  /** Unix timestamp in ms. */
  timestamp: number;
  event: 'acquired' | 'repaired' | 'diagnosed' | 'rented' | 'defect_revealed' | 'sold';
  /** Human-readable description, e.g. 'Куплен за ₽5,000 на рынке Вёдра'. */
  description: string;
  /** Monetary amount involved, as Decimal string. */
  amount?: string;
  /** ID of the player who triggered this event. */
  actorId?: string;
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

// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  /** Persistent ID stored in localStorage — must survive reconnects. */
  id: string;
  name?: string;
  /** Current balance as Decimal string. Starting value: '2000'. */
  balance: string;
  /** @deprecated Unused fuel mechanic — kept for backwards compatibility. */
  fuel: number;
  /** Current board position, 0–11. */
  position: number;
  /** Reputation score — reserved for penalty mechanics. Starting value: 100. */
  reputation: number;
  /** Player's owned cars. Optional because RoomState may omit it. */
  garage?: Car[];
  /** Tactical energy 0–3. Starting value: 3. */
  energy: number;
  /**
   * Counter for energy regeneration, range 0–1.
   * Every 2 D6 turns this counter rolls over and grants +1 energy.
   */
  energyRegenCounter: number;
}

// ─── Debt (P2P Lending) ───────────────────────────────────────────────────────

export interface Debt {
  id: string;
  lenderId: string;
  /** undefined means this is an open offer not yet accepted by anyone. */
  borrowerId?: string;
  /** Loan principal as Decimal string. */
  amount: string;
  /** Interest rate as a percentage string, e.g. '20' means 20%. */
  interest: string;
  /**
   * Total repayment amount: `amount * (1 + interest / 100)`.
   * Calculated once at creation time and stored.
   */
  totalToPay: string;
  /** Turns remaining before automatic collateral confiscation. */
  turnsLeft: number;
  /** Original term — stored for display purposes. */
  initialTurns: number;
  collateralCarId?: string;
  status: 'pending' | 'active' | 'closed' | 'confiscated';
}

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
  { id: 11, type: 'buy_business',    name: 'Бизнес',            icon: '💼', description: 'Бизнес-автомобили' },
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

// ─── Market Events ────────────────────────────────────────────────────────────

export interface GameNews {
  id: string;
  title: string;
  description: string;
  effects: {
    tierMultipliers: Partial<Record<CarTier, number>>;
    modelMultipliers: Record<string, number>;
  };
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

// ─── Room State (server-side) ─────────────────────────────────────────────────

export interface RoomState {
  /** 6-character room code, e.g. 'A3F7K2'. */
  id: string;
  players: Player[];
  market: Car[];
  hostId: string;
  currentTurnIndex: number;
  winCondition: number;
  winnerId?: string;
  /** Currently active market news event — authoritative on server, synced via room_updated. */
  activeEvent?: GameNews | null;
  /** Active P2P debt contracts — Phase 2: move from client GameState here. */
  activeDebts?: Debt[];
  /**
   * Cumulative completed turns across all players.
   * Drives server-side market refresh every 10 turns.
   */
  totalTurns?: number;
  /** Unix timestamp of last market refresh — for server-side timer logic. */
  marketRefreshedAt?: number;
}

// ─── Socket.IO Sync Actions ───────────────────────────────────────────────────

export type SyncActionPayload =
  | { action: 'buyCar';                payload: string }
  | { action: 'sellCar';               payload: string }
  | { action: 'repairCar';             payload: { carId: string; defectId: string; isDiscounted: boolean } }
  | { action: 'rentCar';               payload: string }
  | { action: 'manualMove';            payload: { steps: number; newPosition: number } }
  | { action: 'buyEnergy';             payload: null }
  | { action: 'diagnoseCar';           payload: string }
  | { action: 'updateMarket';          payload: Car[] }
  | { action: 'newsUpdate';            payload: GameNews }
  | { action: 'victory';               payload: null }
  | { action: 'loanOffer';             payload: Debt }
  | { action: 'loanAccepted';          payload: Debt }
  | { action: 'repayDebt';             payload: string }
  | { action: 'confiscateCar';         payload: string }
  | { action: 'raceLobbyOpen';         payload: { initiatorId: string; participants: string[]; bet: number; startTime: number } }
  | { action: 'raceChallengeInitiated'; payload: { initiatorId: string; participants: string[]; bet: number; startTime: number; targetId: string } }
  | { action: 'raceJoin';              payload: { initiatorId: string } }
  | { action: 'raceResults';           payload: { winnerId: string; loserId: string; bet: number } };

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
