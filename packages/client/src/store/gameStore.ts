import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Player } from '@tgperekup/shared';
import { tmaStorage } from './storage';
import { socket } from '../lib/socket';
import {
  initialPlayerState,
  type PlayerSlice,
} from './slices/playerSlice';
import {
  initialSoloState,
  type SoloSlice,
} from './slices/soloSlice';
import {
  initialMultiplayerState,
  type MultiplayerSlice,
} from './slices/multiplayerSlice';
import {
  initialUIState,
  type UISlice,
} from './slices/uiSlice';

// ─── Store interface ──────────────────────────────────────────────────────────

export interface GameStore extends PlayerSlice, SoloSlice, MultiplayerSlice, UISlice {
  player: Player;
}

// ─── Default player ───────────────────────────────────────────────────────────

function makePersistentPlayerId(): string {
  try {
    const saved = localStorage.getItem('perekup-storage');
    if (saved) {
      const parsed = JSON.parse(saved) as { state?: { player?: { id?: string } } };
      if (parsed.state?.player?.id) return parsed.state.player.id;
    }
  } catch { /* ignore */ }
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

const DEFAULT_PLAYER: Player = {
  id: makePersistentPlayerId(),
  balance: '2000',
  fuel: 0,
  position: 0,
  reputation: 100,
  garage: [],
  energy: 3,
  energyRegenCounter: 0,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // ── Seed state ──
      player: DEFAULT_PLAYER,
      ...initialPlayerState,
      ...initialSoloState,
      ...initialMultiplayerState,
      ...initialUIState,

      // ── Player actions ──
      buyCar: (_carId) => { /* TODO: Phase 3 */ },
      sellCar: (_carId) => { /* TODO: Phase 3 */ },
      repairCar: (_carId, _defectId, _isDiscounted) => { /* TODO: Phase 3 */ },
      rentCar: (_carId) => { /* TODO: Phase 3 */ },
      buyEnergy: () => { /* TODO: Phase 3 */ },
      diagnoseCar: (_carId) => { /* TODO: Phase 3 */ },
      manualMove: (_steps) => { /* TODO: Phase 3 */ },
      updateMarket: (cars) => set({ market: cars }),
      setActiveEvent: (news) => set({ activeEvent: news }),
      setCurrentEvent: (cell) => set({ currentEvent: cell }),
      addLog: (text, type) => set((s) => ({
        logs: [type !== undefined ? { text, type } : { text }, ...s.logs].slice(0, 50),
      })),
      rollDice: () => {
        const { roomId, player, players, currentTurnIndex, hasRolledThisTurn } = get();
        if (!roomId) return;
        
        // Check if it's player's turn
        const currentPlayer = players[currentTurnIndex];
        if (currentPlayer?.id !== player.id) {
          get().addLog('Сейчас не ваш ход!', 'error');
          return;
        }
        
        if (hasRolledThisTurn) {
          get().addLog('Вы уже бросили кубик!', 'error');
          return;
        }

        socket.emit('dice_roll', { roomId, playerId: player.id });
      },
      setActiveTab: (tab: any) => set({ activeTab: tab }),
      setBoardAnimationStatus: (status) => set({ boardAnimationStatus: status }),
      setIsGarageOpen: (open) => set({ isGarageOpen: open }),
      setIsRulesOpen: (open) => set({ isRulesOpen: open }),
      setIsContractsOpen: (open) => set({ isContractsOpen: open }),
      setHighlightedCellId: (id) => set({ highlightedCellId: id }),

      // ── Solo actions ──
      startSoloMode: () => { /* TODO: Phase 3 */ },
      processBotTurn: () => { /* TODO: Phase 3 */ },
      setActiveQuest: (quest) => set({ activeQuest: quest }),
      resetSoloDebt: () => set({ soloDebt: '0' }),
      resetAccount: () => set({
        player: { ...DEFAULT_PLAYER, id: get().player.id },
        garage: [],
        market: [],
        logs: [],
        ...initialSoloState,
        ...initialMultiplayerState,
      }),

      // ── Multiplayer actions ──
      createRoom: (_winCondition) => { /* TODO: Phase 3 */ },
      joinRoom: (_roomId) => { /* TODO: Phase 3 */ },
      leaveRoom: () => set({ roomId: null, players: [], isHost: false }),
      syncRoomState: (roomState) => set({
        players: roomState.players,
        market: roomState.market,
        currentTurnIndex: roomState.currentTurnIndex,
        winCondition: roomState.winCondition,
        winnerId: roomState.winnerId ?? null,
        isHost: roomState.hostId === get().player.id,
        hostId: roomState.hostId,
      }),
      handleDiceRollResult: (_playerId, diceValue, newPosition) => {
        const { player } = get();
        set({
          lastDiceRoll: diceValue,
          player: { ...player, position: newPosition },
          hasRolledThisTurn: true,
        });
      },
      handleRemoteAction: (_data) => { /* TODO: Phase 3 */ },
      passTurn: () => { /* TODO: Phase 3 */ },
      setActiveRace: (race) => set({ activeRace: race }),
      setRemoteAnimation: (anim) => set({ remoteAnimation: anim }),
      setWinnerId: (id) => set({ winnerId: id }),
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

// ─── Socket.IO listeners ──────────────────────────────────────────────────────

let listenersInitialized = false;

export function initSocketListeners(): void {
  if (listenersInitialized) return;

  socket.on('connect', () => {
    const { roomId, joinRoom } = useGameStore.getState();
    if (roomId) joinRoom(roomId);
  });

  socket.on('room_updated', (roomState) => {
    useGameStore.getState().syncRoomState(roomState);
  });

  socket.on('dice_roll_result', ({ playerId, diceValue, newPosition }) => {
    useGameStore.getState().handleDiceRollResult(playerId, diceValue, newPosition);
  });

  socket.on('room_error', (msg) => {
    useGameStore.getState().addLog(`[SERVER ERROR]: ${msg}`, 'error');
  });

  socket.on('sync_action_result', (data) => {
    useGameStore.getState().handleRemoteAction(data);
  });

  listenersInitialized = true;
}
