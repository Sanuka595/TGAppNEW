import type { SoloQuest } from '@tgperekup/shared';

export interface SoloState {
  isSoloMode: boolean;
  /** Bot's debt balance as Decimal string — grows 10% every 10 turns. */
  soloDebt: string;
  /** Turns until bot Borya takes its next action. */
  botTurnsUntilAction: number;
  activeQuest: SoloQuest | null;
}

export interface SoloActions {
  /** Start a solo game session (initialises bot state, generates first quest). */
  startSoloMode: () => void;
  /** Process one bot turn: tick counter, compound debt if needed, take action. */
  processBotTurn: () => void;
  /** Set or clear the active quest. */
  setActiveQuest: (quest: SoloQuest | null) => void;
  /** Reset the solo debt to its starting value '0'. */
  resetSoloDebt: () => void;
  /** Full account reset — clears all player and solo state. */
  resetAccount: () => void;
}

export type SoloSlice = SoloState & SoloActions;

export const initialSoloState: SoloState = {
  isSoloMode: false,
  soloDebt: '0',
  botTurnsUntilAction: 3,
  activeQuest: null,
};
