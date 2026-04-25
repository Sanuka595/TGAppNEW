import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SyncActionPayload,
} from '@tgperekup/shared';
import * as roomManager from './roomManager.js';

const BLOCKED_ACTIONS = new Set<string>([
  'devAddMoney',
  'devClearGarage',
  'devSetEnergy',
  'devTeleport',
]);

type SyncResultData = { playerId: string } & SyncActionPayload;

export const registerSocketHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void => {
  let activePlayerId: string | null = null;

  socket.on('create_room', ({ player, winCondition }, callback) => {
    activePlayerId = player.id;
    const roomId = roomManager.createRoom(socket.id, player, winCondition);
    socket.join(roomId);
    const room = roomManager.getRoom(roomId);
    if (room !== undefined) io.to(roomId).emit('room_updated', room);
    callback({ success: true, roomId });
  });

  socket.on('join_room', ({ roomId, player }, callback) => {
    activePlayerId = player.id;
    const result = roomManager.joinRoom(socket.id, roomId, player);
    if (!result.success) {
      callback({ success: false, error: result.error });
      return;
    }
    socket.join(roomId);
    io.to(roomId).emit('room_updated', result.room);
    callback({ success: true });
  });

  socket.on('dice_roll', ({ roomId, playerId }) => {
    if (!roomManager.validateTurn(roomId, playerId)) {
      socket.emit('room_error', 'Сейчас не ваш ход!');
      return;
    }

    const diceValue = Math.floor(Math.random() * 6) + 1;
    const room = roomManager.getRoom(roomId);
    if (room === undefined) return;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    const player = playerIndex !== -1 ? room.players[playerIndex] : undefined;
    if (player !== undefined) {
      player.position = (player.position + diceValue) % 12;
    }

    // 1. Broadcast result first — race-condition fix (pass_turn only after this)
    io.to(roomId).emit('dice_roll_result', {
      playerId,
      diceValue,
      newPosition: player !== undefined ? player.position : 0,
    });

    // 2. Advance turn only after result is broadcast
    const updated = roomManager.passTurn(roomId);
    if (updated !== null) io.to(roomId).emit('room_updated', updated);
  });

  socket.on('pass_turn', ({ roomId, playerId }) => {
    if (!roomManager.validateTurn(roomId, playerId)) return;
    const updated = roomManager.passTurn(roomId);
    if (updated !== null) io.to(roomId).emit('room_updated', updated);
  });

  socket.on('sync_action', (data) => {
    if (BLOCKED_ACTIONS.has(data.action)) return;

    // Forward to other room members; strip roomId from the broadcast payload
    const syncResult: SyncResultData = buildSyncResult(data);
    socket.to(data.roomId).emit('sync_action_result', syncResult);

    // Server-side state updates for market mutations
    let updated = null;
    if (data.action === 'updateMarket') {
      updated = roomManager.updateMarket(data.roomId, data.payload);
    } else if (data.action === 'buyCar') {
      const room = roomManager.getRoom(data.roomId);
      const car = room?.market.find(c => c.id === data.payload);
      const player = room?.players.find(p => p.id === data.playerId);

      if (car && player) {
        const newBalance = (BigInt(player.balance) - BigInt(car.basePrice)).toString();
        roomManager.updatePlayer(data.roomId, data.playerId, {
          balance: newBalance,
          garage: [...player.garage, car],
        });
      }
      updated = roomManager.removeCarFromMarket(data.roomId, data.payload);
    } else if (data.action === 'sellCar') {
      const room = roomManager.getRoom(data.roomId);
      const player = room?.players.find(p => p.id === data.playerId);
      const car = player?.garage.find(c => c.id === data.payload);

      if (car && player) {
        const newBalance = (BigInt(player.balance) + BigInt(car.basePrice)).toString();
        updated = roomManager.updatePlayer(data.roomId, data.playerId, {
          balance: newBalance,
          garage: player.garage.filter(c => c.id !== data.payload),
        });
      }
    }

    if (updated !== null) io.to(data.roomId).emit('room_updated', updated);
  });

  socket.on('leave_room', (roomId, playerId) => {
    const result = roomManager.leaveRoom(socket.id, playerId);
    socket.leave(roomId);
    if (result !== null && result.room.players.length > 0) {
      io.to(result.roomId).emit('room_updated', result.room);
    }
  });

  socket.on('disconnect', () => {
    if (activePlayerId === null) return;
    const result = roomManager.leaveRoom(socket.id, activePlayerId);
    if (result !== null && result.room.players.length > 0) {
      io.to(result.roomId).emit('room_updated', result.room);
    }
  });
};

/**
 * Strips roomId from the incoming sync_action data to produce a valid
 * sync_action_result payload.  The explicit per-variant mapping preserves
 * the discriminated union so TypeScript can verify type safety end-to-end.
 */
function buildSyncResult(
  data: { roomId: string; playerId: string } & SyncActionPayload,
): SyncResultData {
  const { playerId } = data;
  switch (data.action) {
    case 'buyCar':             return { playerId, action: data.action, payload: data.payload };
    case 'sellCar':            return { playerId, action: data.action, payload: data.payload };
    case 'repairCar':          return { playerId, action: data.action, payload: data.payload };
    case 'rentCar':            return { playerId, action: data.action, payload: data.payload };
    case 'manualMove':         return { playerId, action: data.action, payload: data.payload };
    case 'buyEnergy':          return { playerId, action: data.action, payload: data.payload };
    case 'diagnoseCar':        return { playerId, action: data.action, payload: data.payload };
    case 'updateMarket':       return { playerId, action: data.action, payload: data.payload };
    case 'newsUpdate':         return { playerId, action: data.action, payload: data.payload };
    case 'victory':            return { playerId, action: data.action, payload: data.payload };
    case 'loanOffer':          return { playerId, action: data.action, payload: data.payload };
    case 'loanAccepted':       return { playerId, action: data.action, payload: data.payload };
    case 'repayDebt':          return { playerId, action: data.action, payload: data.payload };
    case 'confiscateCar':      return { playerId, action: data.action, payload: data.payload };
    case 'raceLobbyOpen':      return { playerId, action: data.action, payload: data.payload };
    case 'raceChallengeInitiated': return { playerId, action: data.action, payload: data.payload };
    case 'raceJoin':           return { playerId, action: data.action, payload: data.payload };
    case 'raceResults':        return { playerId, action: data.action, payload: data.payload };
  }
}
