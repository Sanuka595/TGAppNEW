import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Decimal } from 'decimal.js';
import type { Player, GameNews } from '@tgperekup/shared';
import { GAME_MAP, calculateCurrentMarketValue, calculateSellPrice, generateCar, calculateCarHealth, calculateRentIncome, type BoardCell } from '@tgperekup/shared';
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
  executeCellAction: (cell: BoardCell | null) => void;
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
        const { player, market, roomId, activeEvent } = get();
        const car = market.find((c) => c.id === carId);
        if (!car) {
          get().addLog('Машина не найдена на рынке!', 'error');
          return;
        }

        const price = calculateCurrentMarketValue(car, activeEvent);
        const balance = new Decimal(player.balance);

        if (balance.lt(price)) {
          get().addLog('Недостаточно денег!', 'error');
          return;
        }

        const newBalance = balance.sub(price).toFixed(0);
        const carWithBoughtFor = { ...car, boughtFor: price.toFixed(0) };
        const newPlayer = {
          ...player,
          balance: newBalance,
          garage: [...(player.garage ?? []), carWithBoughtFor],
        };

        set((state) => ({
          player: newPlayer,
          garage: [...state.garage, carWithBoughtFor],
          market: state.market.filter((c) => c.id !== carId),
        }));

        get().addLog(`Вы купили ${car.name} за $${price.toFixed(0)}`, 'success');

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
        const { player, roomId, activeEvent } = get();
        const car = (player.garage ?? []).find((c) => c.id === carId);
        if (!car) {
          get().addLog('Машина не найдена в гараже!', 'error');
          return;
        }

        if (car.isLocked === true) {
          get().addLog('Автомобиль заложен по долговому договору!', 'error');
          return;
        }

        const sellPrice = calculateSellPrice(car, activeEvent);
        if (sellPrice.isZero()) {
          get().addLog('Продажа запрещена: у авто юридический запрет регистрационных действий!', 'error');
          return;
        }

        const newBalance = new Decimal(player.balance).add(sellPrice).toFixed(0);
        const newPlayer = {
          ...player,
          balance: newBalance,
          garage: (player.garage ?? []).filter((c) => c.id !== carId),
        };

        set((state) => ({
          player: newPlayer,
          garage: state.garage.filter((c) => c.id !== carId),
        }));

        get().addLog(`Вы продали ${car.name} за $${sellPrice.toFixed(0)}`, 'success');

        if (roomId) {
          socket.emit('sync_action', {
            roomId,
            playerId: player.id,
            action: 'sellCar',
            payload: carId,
          });
        }
      },
      repairCar: (carId, defectId, isDiscounted) => {
        const { player, roomId } = get();
        const garage = player.garage ?? [];
        const car = garage.find(c => c.id === carId);
        if (!car) return;
        const defect = car.defects.find(d => d.id === defectId);
        if (!defect || defect.isRepaired) return;

        let cost = new Decimal(defect.repairCost);
        if (isDiscounted) cost = cost.mul(0.95); // 5% discount on Special Repair

        const balance = new Decimal(player.balance);
        if (balance.lt(cost)) {
          get().addLog('Недостаточно денег на ремонт!', 'error');
          return;
        }

        const newBalance = balance.sub(cost).toFixed(0);
        const newDefects = car.defects.map(d => 
          d.id === defectId ? { ...d, isRepaired: true } : d
        );
        const newHealth = calculateCarHealth(newDefects);
        const newCar = { ...car, defects: newDefects, health: newHealth };

        const newGarage = garage.map(c => c.id === carId ? newCar : c);

        set((state) => ({
          player: { ...state.player, balance: newBalance, garage: newGarage },
        }));

        get().addLog(`Отремонтировано: ${defect.name} за $${cost.toFixed(0)}`, 'success');

        if (roomId) {
          socket.emit('sync_action', {
            roomId,
            playerId: player.id,
            action: 'repairCar',
            payload: { carId, defectId, isDiscounted },
          });
        }
      },
      diagnoseCar: (carId) => {
        const { player, roomId } = get();
        const garage = player.garage ?? [];
        const car = garage.find(c => c.id === carId);
        if (!car) return;

        const cost = 200; // Standard diagnostics fee
        const balance = new Decimal(player.balance);
        if (balance.lt(cost)) {
          get().addLog('Недостаточно денег на диагностику!', 'error');
          return;
        }

        const newBalance = balance.sub(cost).toFixed(0);
        const newDefects = car.defects.map(d => ({ ...d, isHidden: false }));
        const newCar = { ...car, defects: newDefects };
        const newGarage = garage.map(c => c.id === carId ? newCar : c);

        set((state) => ({
          player: { ...state.player, balance: newBalance, garage: newGarage },
        }));

        get().addLog(`Диагностика ${car.name} завершена. Скрытые дефекты обнаружены!`, 'success');

        if (roomId) {
          socket.emit('sync_action', {
            roomId,
            playerId: player.id,
            action: 'diagnoseCar',
            payload: carId,
          });
        }
      },
      rentCar: (carId) => {
        const { player, roomId } = get();
        const garage = player.garage ?? [];
        const car = garage.find(c => c.id === carId);
        if (!car) return;
        if (car.isRented) {
          get().addLog('Машина уже сдана в прокат в этом ходу!', 'error');
          return;
        }

        const income = calculateRentIncome(car.tier);
        const newBalance = new Decimal(player.balance).add(income).toFixed(0);
        const newGarage = garage.map(c => c.id === carId ? { ...c, isRented: true } : c);

        set((state) => ({
          player: { ...state.player, balance: newBalance, garage: newGarage },
        }));

        get().addLog(`Сдано в прокат: ${car.name}. Получено $${income.toFixed(0)}`, 'success');

        if (roomId) {
          socket.emit('sync_action', {
            roomId,
            playerId: player.id,
            action: 'rentCar',
            payload: carId,
          });
        }
      },
      buyEnergy: () => {
        const { player, roomId } = get();
        if (player.energy >= 3) {
          get().addLog('Энергия уже на максимуме!', 'error');
          return;
        }
        const cost = 500;
        const balance = new Decimal(player.balance);
        if (balance.lt(cost)) {
          get().addLog('Недостаточно денег для покупки энергии!', 'error');
          return;
        }
        const newBalance = balance.sub(cost).toFixed(0);
        set((state) => ({
          player: { ...state.player, balance: newBalance, energy: state.player.energy + 1 },
        }));
        get().addLog('Куплена 1 ед. энергии.', 'success');
        if (roomId) {
          socket.emit('sync_action', {
            roomId,
            playerId: player.id,
            action: 'buyEnergy',
            payload: null,
          });
        }
      },
      // manualMove is defined below with full implementation
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
        const { roomId, player, players, currentTurnIndex } = get();
        const energy = player.energy;
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
        socket.emit('create_room', { player, winCondition }, (res: { success: boolean; error?: string; roomId?: string }) => {
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
        const normalizedId = roomId.toUpperCase().trim();
        socket.emit('join_room', { roomId: normalizedId, player }, (res: { success: boolean; error?: string }) => {
          if (res.success) {
            set({ roomId: normalizedId, isHost: false, isSoloMode: false });
            get().addLog(`Вы присоединились к комнате ${normalizedId}`, 'info');
          } else {
            get().addLog(`Ошибка присоединения: ${res.error}`, 'error');
          }
        });
      },
      leaveRoom: () => set({ roomId: null, players: [], isHost: false }),
      syncRoomState: (roomState) => {
        const myId = get().player.id;
        const inRoom = roomState.players.some(p => p.id === myId);
        const me = roomState.players.find(p => p.id === myId);
        
        const myIndex = roomState.players.findIndex(p => p.id === myId);
        const isNowMyTurn = inRoom && roomState.currentTurnIndex === myIndex;
        const wasMyTurn = get().currentTurnIndex === get().players.findIndex(p => p.id === myId);
        const turnChangedToMe = isNowMyTurn && !wasMyTurn;

        set((state) => ({
          players: roomState.players,
          market: roomState.market,
          player: {
            ...state.player,
            ...me,
          },
          garage: me?.garage ?? state.garage,
          roomId: inRoom ? roomState.id : null,
          isHost: inRoom ? roomState.hostId === myId : false,
          currentTurnIndex: inRoom ? roomState.currentTurnIndex : 0,
          winCondition: inRoom ? roomState.winCondition : 0,
          winnerId: inRoom ? roomState.winnerId ?? null : null,
          hostId: roomState.hostId,
          hasRolledThisTurn: turnChangedToMe ? false : state.hasRolledThisTurn,
          lastDiceRoll: turnChangedToMe ? 0 : state.lastDiceRoll,
        }));
      },
      executeCellAction: (cell: BoardCell | null) => {
        if (!cell) return;
        const { isSoloMode } = get();

        // Car spawning logic
        let newCars: any[] = [];
        switch (cell.type) {
          case 'buy_bucket':
            newCars = [generateCar('Bucket'), generateCar('Bucket'), generateCar('Bucket')];
            break;
          case 'buy_scrap':
            newCars = [generateCar('Scrap'), generateCar('Scrap'), generateCar('Scrap')];
            break;
          case 'buy_premium':
            newCars = [generateCar('Premium'), generateCar('Premium')];
            break;
          case 'buy_random':
            const tiers: any[] = ['Bucket', 'Scrap', 'Business', 'Premium', 'Rarity'];
            newCars = [
              generateCar(tiers[Math.floor(Math.random() * tiers.length)]),
              generateCar(tiers[Math.floor(Math.random() * tiers.length)]),
              generateCar(tiers[Math.floor(Math.random() * tiers.length)]),
            ];
            break;
          case 'buy_retro':
            newCars = [generateCar('Rarity')];
            break;
        }

        if (newCars.length > 0) {
          set({ market: newCars });
          get().addLog(`Рынок обновлен: появилось ${newCars.length} новых лотов.`, 'info');
        }

        // TODO: Implement other cell types (repair, race, rent, etc.)
      },
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
          // Execute cell action immediately in solo/host mode
          get().executeCellAction(cell);
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
