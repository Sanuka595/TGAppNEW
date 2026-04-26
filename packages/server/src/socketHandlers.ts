import type { Server, Socket } from 'socket.io';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  SyncActionPayload,
  PlayerSchema 
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
    try {
      const validatedPlayer = PlayerSchema.parse(player);
      activePlayerId = validatedPlayer.id;
      const roomId = roomManager.createRoom(socket.id, validatedPlayer, winCondition);
      console.log(`[ROOM] ${roomId} created by player ${validatedPlayer.id}`);
      socket.join(roomId);
      const room = roomManager.getRoom(roomId);
      if (room !== undefined) io.to(roomId).emit('room_updated', room);
      callback({ success: true, roomId });
    } catch (e) {
      callback({ success: false, error: 'Invalid player data' });
    }
  });

  socket.on('join_room', ({ roomId, player }, callback) => {
    try {
      const validatedPlayer = PlayerSchema.parse(player);
      const normalizedId = roomId.toUpperCase().trim();
      activePlayerId = validatedPlayer.id;

      const result = roomManager.joinRoom(socket.id, normalizedId, validatedPlayer);
    if (!result.success) {
      console.log(`[JOIN_FAILED] ${player.id} in "${normalizedId}": ${result.error}`);
      callback({ success: false, error: result.error });
      return;
    }

    // FIX: was socket.join(roomId) — used the raw un-normalised ID, causing room_updated
    // to be broadcast to a different Socket.IO room than the one the client joined.
      socket.join(normalizedId);
      console.log(`[JOIN_OK] Player ${player.id} in room ${normalizedId}`);
      io.to(normalizedId).emit('room_updated', result.room);
      callback({ success: true });
    } catch (e) {
      callback({ success: false, error: 'Invalid player data' });
    }
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

    io.to(roomId).emit('dice_roll_result', {
      playerId,
      diceValue,
      newPosition: player !== undefined ? player.position : 0,
    });

    // Turn is passed manually via pass_turn (player needs time to buy/sell on the cell)
  });

  socket.on('pass_turn', ({ roomId, playerId }) => {
    if (!roomManager.validateTurn(roomId, playerId)) return;
    const updated = roomManager.passTurn(roomId);
    if (updated !== null) io.to(roomId).emit('room_updated', updated);
  });

  socket.on('sync_action', (data) => {
    if (BLOCKED_ACTIONS.has(data.action)) return;

    let updated: ReturnType<typeof roomManager.getRoom> | null = null;

    // Server-authoritative financial transactions — validate FIRST, relay only on success.
    // This prevents other clients from seeing actions that the server rejects.
    if (data.action === 'buyCar') {
      const result = roomManager.processBuyCar(data.roomId, data.playerId, data.payload);
      if (!result.success) {
        socket.emit('room_error', transactionErrorMessage(result.error));
        return;
      }
      updated = result.room;

    } else if (data.action === 'sellCar') {
      const result = roomManager.processSellCar(data.roomId, data.playerId, data.payload);
      if (!result.success) {
        socket.emit('room_error', transactionErrorMessage(result.error));
        return;
      }
      updated = result.room;

    } else if (data.action === 'updateMarket') {
      // Only the current-turn player may push a new market (they just landed on a buy cell)
      updated = roomManager.updateMarket(data.roomId, data.payload, data.playerId);
      if (updated === null) {
        socket.emit('room_error', 'Рынок можно обновить только в свой ход');
        return;
      }

    } else if (data.action === 'newsUpdate') {
      // Market news is triggered by the host (every 10 turns)
      if (!roomManager.isRoomHost(data.roomId, data.playerId)) {
        socket.emit('room_error', 'Только хост может публиковать события рынка');
        return;
      }
      // Persist the active event so processBuyCar/processSellCar use correct price multipliers
      roomManager.updateActiveEvent(data.roomId, data.payload);
    }

    // Relay to all OTHER players in the room after successful server-side validation
    const syncResult: SyncResultData = buildSyncResult(data);
    socket.to(data.roomId).emit('sync_action_result', syncResult);

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
    console.log(`[DISCONNECT] Socket ${socket.id} (Player: ${activePlayerId ?? 'unknown'})`);
    // Player is intentionally NOT removed from the room on disconnect.
    // Mobile Telegram clients switch apps frequently; the player re-joins via join_room
    // with their persisted playerId and the server restores them to the existing slot.
  });
};

function transactionErrorMessage(error: roomManager.TransactionError): string {
  switch (error) {
    case 'not_your_turn':        return 'Куда прёшь? Сейчас не твой черёд кости бросать!';
    case 'insufficient_balance': return 'В карманах ветер свистит! Не хватает денег на этот аппарат.';
    case 'car_is_locked':        return 'Машина «в стопе» — заложена под долги. Не трогай!';
    case 'car_not_found':        return 'Такой тачки нет ни на рынке, ни в гараже. Призрак?';
    case 'player_not_found':     return 'Ты кто такой? Игрок не найден в этой тусовке.';
    case 'room_not_found':       return 'Комната испарилась. Похоже, лавочку прикрыли.';
    case 'sale_blocked_legal':   return 'Юридический запрет! Эту колымагу на учет не поставить.';
  }
}

/**
 * Strips roomId from the incoming sync_action data to produce a valid
 * sync_action_result payload. The explicit per-variant mapping preserves
 * the discriminated union so TypeScript can verify type safety end-to-end.
 */
function buildSyncResult(
  data: { roomId: string; playerId: string } & SyncActionPayload,
): SyncResultData {
  const { playerId } = data;
  switch (data.action) {
    case 'buyCar':                    return { playerId, action: data.action, payload: data.payload };
    case 'sellCar':                   return { playerId, action: data.action, payload: data.payload };
    case 'repairCar':                 return { playerId, action: data.action, payload: data.payload };
    case 'rentCar':                   return { playerId, action: data.action, payload: data.payload };
    case 'manualMove':                return { playerId, action: data.action, payload: data.payload };
    case 'buyEnergy':                 return { playerId, action: data.action, payload: data.payload };
    case 'diagnoseCar':               return { playerId, action: data.action, payload: data.payload };
    case 'updateMarket':              return { playerId, action: data.action, payload: data.payload };
    case 'newsUpdate':                return { playerId, action: data.action, payload: data.payload };
    case 'victory':                   return { playerId, action: data.action, payload: data.payload };
    case 'loanOffer':                 return { playerId, action: data.action, payload: data.payload };
    case 'loanAccepted':              return { playerId, action: data.action, payload: data.payload };
    case 'repayDebt':                 return { playerId, action: data.action, payload: data.payload };
    case 'confiscateCar':             return { playerId, action: data.action, payload: data.payload };
    case 'raceLobbyOpen':             return { playerId, action: data.action, payload: data.payload };
    case 'raceChallengeInitiated':    return { playerId, action: data.action, payload: data.payload };
    case 'raceJoin':                  return { playerId, action: data.action, payload: data.payload };
    case 'raceResults':               return { playerId, action: data.action, payload: data.payload };
  }
}
