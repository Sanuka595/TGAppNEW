import type { Car, LogEntry, BoardCell, GameNews } from '@tgperekup/shared';

export interface PlayerState {
  // ── Core player fields (mirrored from GameState for convenience) ──
  garage: Car[];
  market: Car[];

  // ── Turn state ──
  currentEvent: BoardCell | null;
  lastDiceRoll: number | null;
  lastTaxDeduction: number | null;
  hasRolledThisTurn: boolean;

  // ── Log ──
  logs: LogEntry[];

  // ── UI flags ──
  activeEvent: GameNews | null;
  totalTurns: number;
}

export interface PlayerActions {
  /** Buy a car from the market and add it to the garage. */
  buyCar: (carId: string) => void;
  /** Sell a car from the garage. */
  sellCar: (carId: string) => void;
  /** Repair a specific defect on a car. */
  repairCar: (carId: string, defectId: string, isDiscounted: boolean) => void;
  /** Rent a car out this turn. */
  rentCar: (carId: string) => void;
  /** Buy one energy unit. */
  buyEnergy: () => void;
  /** Reveal all hidden defects on a car (diagnosis). */
  diagnoseCar: (carId: string) => void;
  /** Move the player a fixed number of steps (tactical move). */
  manualMove: (steps: number) => void;
  /** Replace the entire market with a new lot list. */
  updateMarket: (cars: Car[]) => void;
  /** Set an active market news event. */
  setActiveEvent: (news: GameNews | null) => void;
  /** Set the current board cell event (opens ActionModal). */
  setCurrentEvent: (cell: BoardCell | null) => void;
  /** Append a log entry (max 50 kept). */
  addLog: (text: string, type?: LogEntry['type']) => void;
  /** Roll D6 and move the player. */
  rollDice: () => void;
}

export type PlayerSlice = PlayerState & PlayerActions;

export const initialPlayerState: PlayerState = {
  garage: [],
  market: [],
  currentEvent: null,
  lastDiceRoll: null,
  lastTaxDeduction: null,
  hasRolledThisTurn: false,
  logs: [],
  activeEvent: null,
  totalTurns: 0,
};
