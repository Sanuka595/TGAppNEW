import type { PlayerSlice } from './slices/playerSlice';
import type { SoloSlice } from './slices/soloSlice';
import type { MultiplayerSlice } from './slices/multiplayerSlice';

/** Full Zustand store type — intersection of all domain slices + cross-cutting actions. */
export interface GameStore extends PlayerSlice, SoloSlice, MultiplayerSlice {
  /** Wipe all progress and return to default state (cross-slice reset). */
  resetAccount: () => void;
  // ── Dev tools ──
  devAddMoney: (amount: string) => void;
  devAddEnergy: (amount: number) => void;
  devTeleport: (cellId: number) => void;
  devResetTurn: () => void;
}
