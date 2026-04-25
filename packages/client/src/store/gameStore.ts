import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Player, GameNews } from '@tgperekup/shared';
import { GAME_MAP } from '@tgperekup/shared';
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

// ─── Store interface ──────────────────────────────────────────────────────────

export interface GameStore extends PlayerSlice, SoloSlice, MultiplayerSlice {
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

      // ── Player actions ──
      buyCar: (carId) => {
        const { player, market, roomId } = get();
        const car = market.find((c) => c.id === carId);
        if (!car) {
          get().addLog('Машина не найдена на рынке!', 'error');
          return;
        }

        const balance = BigInt(player.balance);
        const price = BigInt(car.basePrice);

        if (balance < price) {
          get().addLog('Недостаточно денег!', 'error');
          return;
        }

        const newBalance = (balance - price).toString();
        const newPlayer = {
          ...player,
          balance: newBalance,
          garage: [...player.garage, car],
        };

        set((state) => ({
          player: newPlayer,
          garage: [...state.garage, car],
          market: state.market.filter((c) => c.id !== carId),
        }));

        get().addLog(`Вы купили ${car.brand} ${car.model} за ${car.basePrice}`, 'success');

        if (roomId) {
          socket.emit('sync_action', {
            roomId,
            playerId: player.id,
            action: 'buyCar',
            payload: carId,
          });
        }
      },
      sellCar: (carId) => {
        const { player, roomId } = get();
        const car = player.garage.find((c) => c.id === carId);
        if (!car) {
          get().addLog('Машина не найдена в гараже!', 'error');
          return;
        }

        const balance = BigInt(player.balance);
        const price = BigInt(car.basePrice);
        const newBalance = (balance + price).toString();

        const newPlayer = {
          ...player,
          balance: newBalance,
          garage: player.garage.filter((c) => c.id !== carId),
        };

        set((state) => ({
          player: newPlayer,
          garage: state.garage.filter((c) => c.id !== carId),
        }));

        get().addLog(`Вы продали ${car.brand} ${car.model} за ${car.basePrice}`, 'success');

        if (roomId) {
          socket.emit('sync_action', {
            roomId,
            playerId: player.id,
            action: 'sellCar',
            payload: carId,
          });
        }
      },
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
        if (!roomId) {
          // Allow rolling dice in solo mode if no room is active
          if (get().isSoloMode) {
            // This is a placeholder for solo mode dice roll logic
            const diceValue = Math.floor(Math.random() * 6) + 1;
            const newPosition = (player.position + diceValue) % 12;
            get().handleDiceRollResult(player.id, diceValue, newPosition);
            get().addLog(`Вы бросили кубик: ${diceValue}`, 'info');
            return;
          }
          return; // No room, not solo mode
        }
        
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
      // ── Solo actions ──
      startSoloMode: () => {
        set({
          isSoloMode: true,
          roomId: null,
          players: [get().player], // Only current player in solo mode
          isHost: true,
          soloDebt: '2000', // Initial debt for solo mode
          botTurnsUntilAction: 3, // Bot acts every 3 turns
          activeQuest: null,
          totalTurns: 0,
          winnerId: null,
        });
        get().addLog('Начата соло-игра против Бори!', 'info');
      },
      processBotTurn: () => { /* TODO: Phase 3 */ },
      manualMove: (steps) => {
        const { roomId, player, players, currentTurnIndex, energy } = get();
        if (!roomId) { // Solo mode
          if (energy < 1) { get().addLog('Недостаточно энергии для тактического хода!', 'error'); return; }
          const newPosition = (player.position + steps) % 12;
          set((state) => ({ player: { ...state.player, energy: state.player.energy - 1, position: newPosition }, lastDiceRoll: 0, hasRolledThisTurn: true }));
          get().addLog(`Вы сделали тактический ход на ${steps} клеток.`, 'info'); return;
        }
        const currentPlayer = players[currentTurnIndex]; if (currentPlayer?.id !== player.id) { get().addLog('Сейчас не ваш ход!', 'error'); return; }
        if (energy < 1) { get().addLog('Недостаточно энергии для тактического хода!', 'error'); return; }
        const newPosition = (player.position + steps) % 12;
        set((state) => ({ player: { ...state.player, energy: state.player.energy - 1, position: newPosition }, lastDiceRoll: 0, hasRolledThisTurn: true }));
        get().addLog(`Вы сделали тактический ход на ${steps} клеток.`, 'info');
        socket.emit('sync_action', { roomId, playerId: player.id, action: 'manualMove', payload: { steps, newPosition } });
      },
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
      createRoom: (winCondition) => {
        const { player } = get();
        socket.emit('create_room', { player, winCondition }, (res) => {
          if (res.success && res.roomId) {
            set({ roomId: res.roomId, isHost: true, isSoloMode: false });
            get().addLog(`Комната ${res.roomId} создана!`, 'info');
          } else {
            get().addLog(`Ошибка создания комнаты: ${res.error}`, 'error');
          }
        });
      },
      joinRoom: (roomId) => {
        const { player } = get();
        socket.emit('join_room', { roomId, player }, (res) => {
          if (res.success) {
            set({ roomId, isHost: false, isSoloMode: false });
            get().addLog(`Вы присоединились к комнате ${roomId}`, 'info');
          } else {
            get().addLog(`Ошибка присоединения: ${res.error}`, 'error');
          }
        });
      },
      leaveRoom: () => set({ roomId: null, players: [], isHost: false }),
      syncRoomState: (roomState) => set({
        players: roomState.players,
        market: roomState.market,
        // Ensure current player's garage is updated from their own state,
        // as roomState.players might not contain full garage details for all players.
        // This assumes the client's player object is the source of truth for its own garage.
        player: {
          ...get().player,
          ...roomState.players.find(p => p.id === get().player.id),
        },
        // Update garage if it's explicitly provided in the roomState for the current player
        garage: roomState.players.find(p => p.id === get().player.id)?.garage || get().garage,
        // If the current player is not in the roomState players list, it means they left or were removed.
        // In this case, reset their room-specific state.
        roomId: roomState.players.some(p => p.id === get().player.id) ? roomState.id : null,
        // If the player is no longer in the room, reset other room-related states
        isHost: roomState.players.some(p => p.id === get().player.id) ? roomState.hostId === get().player.id : false,
        currentTurnIndex: roomState.players.some(p => p.id === get().player.id) ? roomState.currentTurnIndex : 0,
        winCondition: roomState.players.some(p => p.id === get().player.id) ? roomState.winCondition : 0,
        winnerId: roomState.players.some(p => p.id === get().player.id) ? roomState.winnerId ?? null : null,

        currentTurnIndex: roomState.currentTurnIndex,
        winCondition: roomState.winCondition,
        winnerId: roomState.winnerId ?? null,
        isHost: roomState.hostId === get().player.id,
        hostId: roomState.hostId,
      }),
      handleDiceRollResult: (playerId, diceValue, newPosition) => {
        const { player, players } = get();
        const cell = GAME_MAP.find(c => c.id === newPosition) || null;

        if (playerId === player.id) {
          set({
            lastDiceRoll: diceValue,
            player: { ...player, position: newPosition },
            hasRolledThisTurn: true,
            currentEvent: cell,
          });
        } else {
          set({
            players: players.map(p => p.id === playerId ? { ...p, position: newPosition } : p),
            remoteAnimation: { playerId, diceValue, fromPosition: players.find(p => p.id === playerId)?.position ?? 0 },
          });
        }
      },
      handleRemoteAction: (data) => {
        // For now, just log remote actions. Full implementation is Phase 3.
        get().addLog(`[REMOTE ACTION] Player ${data.playerId} performed ${data.action}`, 'info');
        // Example: if a remote player buys a car, update market
        if (data.action === 'buyCar' && typeof data.payload === 'string') {
          set((state) => ({
            market: state.market.filter((car) => car.id !== data.payload),
          }));
        }
        // Example: if a remote player moves manually
        if (data.action === 'manualMove' && typeof data.payload === 'object' && data.payload !== null && 'steps' in data.payload && 'newPosition' in data.payload) {
          const { playerId, payload } = data;
          const { steps, newPosition } = payload as { steps: number; newPosition: number };
          set((state) => ({
            players: state.players.map((p) =>
              p.id === playerId ? { ...p, position: newPosition } : p
            ),
            remoteAnimation: { playerId, diceValue: steps, fromPosition: state.players.find(p => p.id === playerId)?.position ?? 0 },
          }));
          get().addLog(`Игрок ${playerId} сделал тактический ход на ${steps} клеток.`, 'info');
        }
        // Example: news update
        if (data.action === 'newsUpdate' && typeof data.payload === 'object' && data.payload !== null && 'id' in data.payload) {
          set({ activeEvent: data.payload as GameNews });
          get().addLog(`[НОВОСТИ] ${ (data.payload as GameNews).title }`, 'info');
        }
        // Example: victory
        if (data.action === 'victory') {
          set({ winnerId: data.playerId });
          get().addLog(`Игрок ${data.playerId} победил!`, 'success');
        }
      },
      passTurn: () => {
        const { roomId, player, players, currentTurnIndex } = get();
        if (!roomId) return;

        const currentPlayer = players[currentTurnIndex];
        if (currentPlayer?.id !== player.id) {
          get().addLog('Сейчас не ваш ход!', 'error');
          return;
        }
        socket.emit('pass_turn', { roomId, playerId: player.id });
      },
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
  }); // Reconnect to room if roomId exists

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
