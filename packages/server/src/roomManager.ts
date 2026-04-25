import type { Car, Player, RoomState } from '@tgperekup/shared';

export const MAX_PLAYERS = 4;

const activeRooms = new Map<string, RoomState>();
const socketToRoom = new Map<string, string>();

function generateRoomId(): string {
  let id = '';
  do {
    id = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (activeRooms.has(id));
  return id;
}

export const getRoom = (roomId: string): RoomState | undefined =>
  activeRooms.get(roomId);

export const createRoom = (
  socketId: string,
  player: Player,
  winCondition: number,
): string => {
  const roomId = generateRoomId();
  activeRooms.set(roomId, {
    id: roomId,
    players: [player],
    market: [],
    hostId: player.id,
    currentTurnIndex: 0,
    winCondition: winCondition > 0 ? winCondition : 500000,
  });
  socketToRoom.set(socketId, roomId);
  return roomId;
};

export const joinRoom = (
  socketId: string,
  roomId: string,
  player: Player,
): { success: false; error: string } | { success: true; room: RoomState } => {
  const room = activeRooms.get(roomId);
  if (room === undefined) return { success: false, error: 'Комната не найдена' };
  if (room.players.length >= MAX_PLAYERS) return { success: false, error: 'Комната заполнена' };

  const existingIndex = room.players.findIndex(p => p.id === player.id);
  if (existingIndex !== -1) {
    room.players[existingIndex] = player;
  } else {
    room.players.push(player);
  }
  socketToRoom.set(socketId, roomId);
  return { success: true, room };
};

export const leaveRoom = (
  socketId: string,
  playerId: string,
): { roomId: string; room: RoomState } | null => {
  const roomId = socketToRoom.get(socketId);
  if (roomId === undefined) return null;

  const room = activeRooms.get(roomId);
  if (room === undefined) {
    socketToRoom.delete(socketId);
    return null;
  }

  room.players = room.players.filter(p => p.id !== playerId);
  socketToRoom.delete(socketId);

  if (room.players.length === 0) {
    activeRooms.delete(roomId);
  } else {
    if (room.hostId === playerId) {
      const first = room.players[0];
      if (first !== undefined) room.hostId = first.id;
    }
    if (room.currentTurnIndex >= room.players.length) {
      room.currentTurnIndex = 0;
    }
  }

  return { roomId, room };
};

export const validateTurn = (roomId: string, playerId: string): boolean => {
  const room = activeRooms.get(roomId);
  if (room === undefined || room.players.length === 0) return false;
  const current = room.players[room.currentTurnIndex];
  return current !== undefined && current.id === playerId;
};

export const passTurn = (roomId: string): RoomState | null => {
  const room = activeRooms.get(roomId);
  if (room === undefined || room.players.length === 0) return null;
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  return room;
};

export const updateMarket = (roomId: string, market: Car[]): RoomState | null => {
  const room = activeRooms.get(roomId);
  if (room === undefined) return null;
  room.market = market;
  return room;
};

export const removeCarFromMarket = (roomId: string, carId: string): RoomState | null => {
  const room = activeRooms.get(roomId);
  if (room === undefined) return null;
  room.market = room.market.filter(c => c.id !== carId);
  return room;
};

export const updatePlayer = (
  roomId: string,
  playerId: string,
  update: Partial<Player>,
): RoomState | null => {
  const room = activeRooms.get(roomId);
  if (room === undefined) return null;
  const index = room.players.findIndex(p => p.id === playerId);
  if (index === -1) return null;

  room.players[index] = { ...room.players[index]!, ...update };
  return room;
};
