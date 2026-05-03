import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Decimal } from 'decimal.js';
import { GAME_MAP } from '@tgperekup/shared';
import { tmaStorage } from './storage';
import type { GameStore } from './store.types';
import { createPlayerSlice, DEFAULT_PLAYER } from './slices/playerSlice';
import { createSoloSlice, initialSoloState } from './slices/soloSlice';
import { createMultiplayerSlice, initialMultiplayerState } from './slices/multiplayerSlice';

export const useGameStore = create<GameStore>()(
  persist(
    (set, get, api) => ({
      ...createPlayerSlice(set, get, api),
      ...createSoloSlice(set, get, api),
      ...createMultiplayerSlice(set, get, api),

      // ── Cross-slice reset ──────────────────────────────────────────────────
      resetAccount: () => {
        set({
          player: { ...DEFAULT_PLAYER, id: get().player.id },
          garage: [],
          market: [],
          logs: [],
          ...initialSoloState,
          ...initialMultiplayerState,
        });
      },

      // ── Dev tools ──────────────────────────────────────────────────────────
      devAddMoney: (amount) => {
        set((s) => ({ player: { ...s.player, balance: new Decimal(s.player.balance).add(amount).toFixed(0) } }));
        get().addLog(`[DEV] Добавлено $${amount}`, 'success');
      },
      devAddEnergy: (amount) => {
        set((s) => ({ player: { ...s.player, energy: Math.min(s.player.energy + amount, 10) } }));
        get().addLog(`[DEV] Добавлено ${amount} энергии`, 'info');
      },
      devTeleport: (cellId) => {
        const cell = GAME_MAP.find((c) => c.id === cellId) ?? null;
        set((s) => ({ player: { ...s.player, position: cellId }, currentEvent: cell }));
        get().executeCellAction(cell);
        get().addLog(`[DEV] Телепорт на клетку ${cellId}`, 'info');
      },
      devResetTurn: () => {
        set({ hasRolledThisTurn: false });
        get().addLog('[DEV] Ход сброшен', 'info');
      },
    }),
    {
      name: 'perekup-storage',
      storage: createJSONStorage(() => tmaStorage),
      partialize: (state) => ({
        player: state.player,
        garage: state.garage,
        roomId: state.roomId,
        players: state.players,
        activeDebts: state.activeDebts,
        isHost: state.isHost,
        currentTurnIndex: state.currentTurnIndex,
        totalTurns: state.totalTurns,
      }),
    },
  ),
);

// Re-export for backwards compatibility — App.tsx imports initSocketListeners from here
export { initSocketListeners } from './socketListeners';
