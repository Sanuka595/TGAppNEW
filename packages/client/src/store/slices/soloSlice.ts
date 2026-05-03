import { type StateCreator } from 'zustand';
import type { SoloQuest } from '@tgperekup/shared';
import type { GameStore } from '../store.types';

// ─── Slice types ──────────────────────────────────────────────────────────────

export interface SoloState {
  isSoloMode: boolean;
  /** Bot's debt balance as Decimal string — grows 10% every 10 turns. */
  soloDebt: string;
  /** Turns until bot Borya takes its next action. */
  botTurnsUntilAction: number;
  activeQuest: SoloQuest | null;
}

export interface SoloActions {
  startSoloMode: () => void;
  processBotTurn: () => void;
  setActiveQuest: (quest: SoloQuest | null) => void;
  resetSoloDebt: () => void;
}

export type SoloSlice = SoloState & SoloActions;

export const initialSoloState: SoloState = {
  isSoloMode: false,
  soloDebt: '0',
  botTurnsUntilAction: 3,
  activeQuest: null,
};

// ─── Slice factory ────────────────────────────────────────────────────────────

export const createSoloSlice: StateCreator<GameStore, [['zustand/persist', unknown]], [], SoloSlice> = (set, get) => ({
  ...initialSoloState,

  startSoloMode: () => {
    set({
      isSoloMode: true,
      roomId: null,
      players: [get().player],
      isHost: true,
      soloDebt: '2000',
      botTurnsUntilAction: 3,
      activeQuest: null,
      totalTurns: 0,
      winnerId: null,
    });
    get().addLog('Начата соло-игра против Бори!', 'info');
  },

  processBotTurn: () => { /* TODO: Phase 3 — Bot Borya AI */ },

  setActiveQuest: (quest) => set({ activeQuest: quest }),

  resetSoloDebt: () => set({ soloDebt: '0' }),
});
