import { Decimal } from 'decimal.js';
import type { Car, GameNews, Player, RoomState } from '@tgperekup/shared';
import { calculateCurrentMarketValue, calculateSellPrice } from '@tgperekup/shared';

export const MAX_PLAYERS = 4;

/** Rooms with no activity longer than this are eligible for cleanup. */
const ROOM_STALE_MS = 30 * 60 * 1000; // 30 min

interface RoomMeta {
  state: RoomState;
  lastActivityAt: number;
}

/** Primary room store: roomId → { state, lastActivityAt } */
const rooms = new Map<string, RoomMeta>();

/** socket.id → roomId — cleaned up on leave or reconnect. */
const socketToRoom = new Map<string, string>();

/** playerId → current socket.id — enables stale entry cleanup on reconnect. */
const playerToSocket = new Map<string, string>();

function generateRoomId(): string {
  let id = '';
  do {
    id = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms.has(id));
  return id;
}

function touch(roomId: string): void {
  const meta = rooms.get(roomId);
  if (meta !== undefined) meta.lastActivityAt = Date.now();
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export const getRoom = (roomId: string): RoomState | undefined =>
  rooms.get(roomId)?.state;

export const getActiveRoomsCount = (): number => rooms.size;

export const validateTurn = (roomId: string, playerId: string): boolean => {
  const room = rooms.get(roomId)?.state;
  if (room === undefined || room.players.length === 0) return false;
  const current = room.players[room.currentTurnIndex];
  return current !== undefined && current.id === playerId;
};

export const isRoomHost = (roomId: string, playerId: string): boolean =>
  rooms.get(roomId)?.state.hostId === playerId;

// ─── Room lifecycle ───────────────────────────────────────────────────────────

export const createRoom = (
  socketId: string,
  player: Player,
  winCondition: number,
): string => {
  const roomId = generateRoomId();
  rooms.set(roomId, {
    state: {
      id: roomId,
      players: [player],
      market: [],
      hostId: player.id,
      currentTurnIndex: 0,
      winCondition: winCondition > 0 ? winCondition : 500000,
      activeDebts: [],
      totalTurns: 0,
      marketRefreshedAt: Date.now(),
    },
    lastActivityAt: Date.now(),
  });
  socketToRoom.set(socketId, roomId);
  playerToSocket.set(player.id, socketId);
  return roomId;
};

export const joinRoom = (
  socketId: string,
  roomId: string,
  player: Player,
): { success: false; error: string } | { success: true; room: RoomState } => {
  const meta = rooms.get(roomId);
  if (meta === undefined) return { success: false, error: 'Комната не найдена' };

  const { state: room } = meta;
  if (room.players.length >= MAX_PLAYERS) return { success: false, error: 'Комната заполнена' };

  const existingIndex = room.players.findIndex(p => p.id === player.id);
  if (existingIndex !== -1) {
    // Reconnect: refresh the player record without changing position/state
    room.players[existingIndex] = player;
  } else {
    room.players.push(player);
  }

  // Remove stale socket mapping for this player so old socketId entries don't accumulate
  const oldSocketId = playerToSocket.get(player.id);
  if (oldSocketId !== undefined && oldSocketId !== socketId) {
    socketToRoom.delete(oldSocketId);
  }

  socketToRoom.set(socketId, roomId);
  playerToSocket.set(player.id, socketId);
  touch(roomId);
  return { success: true, room };
};

export const leaveRoom = (
  socketId: string,
  playerId: string,
): { roomId: string; room: RoomState } | null => {
  const roomId = socketToRoom.get(socketId);
  if (roomId === undefined) return null;

  const meta = rooms.get(roomId);
  if (meta === undefined) {
    socketToRoom.delete(socketId);
    playerToSocket.delete(playerId);
    return null;
  }

  const { state: room } = meta;
  room.players = room.players.filter(p => p.id !== playerId);
  socketToRoom.delete(socketId);
  playerToSocket.delete(playerId);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    return null;
  }

  if (room.hostId === playerId) {
    const first = room.players[0];
    if (first !== undefined) room.hostId = first.id;
  }
  if (room.currentTurnIndex >= room.players.length) {
    room.currentTurnIndex = 0;
  }

  touch(roomId);
  return { roomId, room };
};

// ─── Turn management ──────────────────────────────────────────────────────────

export const passTurn = (roomId: string): RoomState | null => {
  const meta = rooms.get(roomId);
  if (meta === undefined || meta.state.players.length === 0) return null;
  const { state: room } = meta;
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  if (room.totalTurns !== undefined) room.totalTurns++;
  touch(roomId);
  return room;
};

// ─── Market ───────────────────────────────────────────────────────────────────

/**
 * Replaces the market. Only the current-turn player may call this —
 * they are landing on a buy cell and generating fresh lots.
 */
export const updateMarket = (
  roomId: string,
  market: Car[],
  byPlayerId: string,
): RoomState | null => {
  const meta = rooms.get(roomId);
  if (meta === undefined) return null;
  if (!validateTurn(roomId, byPlayerId)) return null;
  meta.state.market = market;
  touch(roomId);
  return meta.state;
};

export const removeCarFromMarket = (roomId: string, carId: string): RoomState | null => {
  const meta = rooms.get(roomId);
  if (meta === undefined) return null;
  meta.state.market = meta.state.market.filter(c => c.id !== carId);
  touch(roomId);
  return meta.state;
};

// ─── Player mutations ─────────────────────────────────────────────────────────

export const updatePlayer = (
  roomId: string,
  playerId: string,
  update: Partial<Player>,
): RoomState | null => {
  const meta = rooms.get(roomId);
  if (meta === undefined) return null;
  const { state: room } = meta;
  const index = room.players.findIndex(p => p.id === playerId);
  if (index === -1) return null;
  room.players[index] = { ...room.players[index]!, ...update };
  touch(roomId);
  return room;
};

// ─── Authoritative transactions ───────────────────────────────────────────────

export type TransactionError =
  | 'room_not_found'
  | 'not_your_turn'
  | 'car_not_found'
  | 'player_not_found'
  | 'insufficient_balance'
  | 'car_is_locked'
  | 'sale_blocked_legal';

export type BuyCarResult =
  | { success: true; room: RoomState }
  | { success: false; error: TransactionError };

/**
 * Server-authoritative car purchase.
 * Validates turn, player existence, car availability, and sufficient balance.
 * Uses calculateCurrentMarketValue() (basePrice minus defect penalties and news effects).
 * Atomically removes the car from market and adds it to the player's garage.
 */
export const processBuyCar = (
  roomId: string,
  playerId: string,
  carId: string,
): BuyCarResult => {
  const meta = rooms.get(roomId);
  if (meta === undefined) return { success: false, error: 'room_not_found' };
  if (!validateTurn(roomId, playerId)) return { success: false, error: 'not_your_turn' };

  const { state: room } = meta;

  const carIndex = room.market.findIndex(c => c.id === carId);
  if (carIndex === -1) return { success: false, error: 'car_not_found' };

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return { success: false, error: 'player_not_found' };

  const car = room.market[carIndex]!;
  const player = room.players[playerIndex]!;

  const price = calculateCurrentMarketValue(car, room.activeEvent ?? null);
  const balance = new Decimal(player.balance);
  if (balance.lt(price)) return { success: false, error: 'insufficient_balance' };

  room.players[playerIndex] = {
    ...player,
    balance: balance.sub(price).toFixed(0),
    garage: [...(player.garage ?? []), { ...car, boughtFor: price.toFixed(0) }],
  };
  room.market.splice(carIndex, 1);

  touch(roomId);
  return { success: true, room };
};

export type SellCarResult =
  | { success: true; room: RoomState }
  | { success: false; error: TransactionError };

/**
 * Server-authoritative car sale.
 * Validates turn, car ownership, and that the car is not locked as loan collateral.
 * Uses calculateSellPrice() (with tier margin, news multipliers, defect deductions).
 * Sets room.winnerId if the resulting balance meets the win condition.
 */
export const processSellCar = (
  roomId: string,
  playerId: string,
  carId: string,
): SellCarResult => {
  const meta = rooms.get(roomId);
  if (meta === undefined) return { success: false, error: 'room_not_found' };
  if (!validateTurn(roomId, playerId)) return { success: false, error: 'not_your_turn' };

  const { state: room } = meta;

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return { success: false, error: 'player_not_found' };

  const player = room.players[playerIndex]!;
  const garage = player.garage ?? [];
  const carIndex = garage.findIndex(c => c.id === carId);
  if (carIndex === -1) return { success: false, error: 'car_not_found' };

  const car = garage[carIndex]!;
  if (car.isLocked === true) return { success: false, error: 'car_is_locked' };

  const sellPrice = calculateSellPrice(car, room.activeEvent ?? null);
  if (sellPrice.isZero()) return { success: false, error: 'sale_blocked_legal' };

  const newBalance = new Decimal(player.balance).add(sellPrice);

  room.players[playerIndex] = {
    ...player,
    balance: newBalance.toFixed(0),
    garage: garage.filter(c => c.id !== carId),
  };

  if (newBalance.gte(room.winCondition)) {
    room.winnerId = playerId;
  }

  touch(roomId);
  return { success: true, room };
};

/** Sets the active market news event. Called when the host broadcasts a newsUpdate. */
export const updateActiveEvent = (roomId: string, news: GameNews | null): void => {
  const meta = rooms.get(roomId);
  if (meta === undefined) return;
  meta.state.activeEvent = news;
  touch(roomId);
};

// ─── Maintenance ──────────────────────────────────────────────────────────────

/** Removes rooms with no activity for longer than ROOM_STALE_MS. Returns count removed. */
export const cleanupStaleRooms = (): number => {
  const now = Date.now();
  let removed = 0;
  for (const [roomId, meta] of rooms) {
    if (now - meta.lastActivityAt > ROOM_STALE_MS) {
      for (const player of meta.state.players) {
        const sockId = playerToSocket.get(player.id);
        if (sockId !== undefined) {
          socketToRoom.delete(sockId);
          playerToSocket.delete(player.id);
        }
      }
      rooms.delete(roomId);
      removed++;
      console.log(`[CLEANUP] Stale room ${roomId} removed (inactive > 30 min)`);
    }
  }
  return removed;
};
