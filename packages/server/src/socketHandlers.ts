import type { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SyncActionPayload,
  PlayerSchema,
} from '@tgperekup/shared';
import * as rm from './roomManager.js';

const BLOCKED_ACTIONS = new Set<string>(['devAddMoney', 'devClearGarage', 'devSetEnergy', 'devTeleport']);

type SyncResultData = { playerId: string } & SyncActionPayload;

export const registerSocketHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void => {
  let activePlayerId: string | null = null;

  // ── Room lifecycle ─────────────────────────────────────────────────────────

  socket.on('create_room', ({ player, winCondition }, callback) => {
    try {
      const p = PlayerSchema.parse(player);
      activePlayerId = p.id;
      const roomId = rm.createRoom(socket.id, p, winCondition);
      socket.join(roomId);
      const room = rm.getRoom(roomId);
      if (room !== undefined) io.to(roomId).emit('room_updated', room);
      callback({ success: true, roomId });
    } catch { callback({ success: false, error: 'Invalid player data' }); }
  });

  socket.on('join_room', ({ roomId, player }, callback) => {
    try {
      const p = PlayerSchema.parse(player);
      const id = roomId.toUpperCase().trim();
      activePlayerId = p.id;
      const result = rm.joinRoom(socket.id, id, p);
      if (!result.success) { callback({ success: false, error: result.error }); return; }
      socket.join(id);
      io.to(id).emit('room_updated', result.room);
      callback({ success: true });
    } catch { callback({ success: false, error: 'Invalid player data' }); }
  });

  socket.on('dice_roll', ({ roomId, playerId }) => {
    if (!rm.validateTurn(roomId, playerId)) { socket.emit('room_error', 'Сейчас не ваш ход!'); return; }
    const diceValue = Math.floor(Math.random() * 6) + 1;
    const room = rm.getRoom(roomId);
    if (!room) return;
    const playerIdx = room.players.findIndex(p => p.id === playerId);
    const player = playerIdx !== -1 ? room.players[playerIdx] : undefined;
    if (player !== undefined) player.position = (player.position + diceValue) % 12;
    io.to(roomId).emit('dice_roll_result', { playerId, diceValue, newPosition: player?.position ?? 0 });
  });

  socket.on('pass_turn', ({ roomId, playerId }) => {
    if (!rm.validateTurn(roomId, playerId)) return;
    const updated = rm.passTurn(roomId);
    if (updated !== null) io.to(roomId).emit('room_updated', updated);
  });

  socket.on('leave_room', (roomId, playerId) => {
    const result = rm.leaveRoom(socket.id, playerId);
    socket.leave(roomId);
    if (result !== null && result.room.players.length > 0) io.to(result.roomId).emit('room_updated', result.room);
  });

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] ${socket.id} (player: ${activePlayerId ?? 'unknown'})`);
  });

  // ── Sync action dispatcher ─────────────────────────────────────────────────

  socket.on('sync_action', (data) => {
    if (BLOCKED_ACTIONS.has(data.action)) return;

    let updated: RoomState | null = null;

    // ── Server-authoritative transactions ──────────────────────────────────
    if (data.action === 'buyCar') {
      const r = rm.processBuyCar(data.roomId, data.playerId, data.payload);
      if (!r.success) { socket.emit('room_error', txMsg(r.error)); return; }
      updated = r.room;

    } else if (data.action === 'sellCar') {
      const r = rm.processSellCar(data.roomId, data.playerId, data.payload);
      if (!r.success) { socket.emit('room_error', txMsg(r.error)); return; }
      updated = r.room;

    } else if (data.action === 'repairCar') {
      const { carId, defectId, isDiscounted } = data.payload;
      const r = rm.processRepairCar(data.roomId, data.playerId, carId, defectId, isDiscounted ?? false);
      if (!r.success) { socket.emit('room_error', txMsg(r.error)); return; }
      updated = r.room;

    } else if (data.action === 'rentCar') {
      const r = rm.processRentCar(data.roomId, data.playerId, data.payload);
      if (!r.success) { socket.emit('room_error', txMsg(r.error)); return; }
      updated = r.room;

    } else if (data.action === 'updateMarket') {
      updated = rm.updateMarket(data.roomId, data.payload, data.playerId);
      if (updated === null) { socket.emit('room_error', 'Рынок можно обновить только в свой ход'); return; }

    } else if (data.action === 'newsUpdate') {
      if (!rm.isRoomHost(data.roomId, data.playerId)) {
        socket.emit('room_error', 'Только хост может публиковать рыночные события'); return;
      }
      rm.updateActiveEvent(data.roomId, data.payload);

    // ── Debt actions ──────────────────────────────────────────────────────
    } else if (data.action === 'loanOffer') {
      const r = rm.processLoanOffer(data.roomId, data.playerId, data.payload);
      if (!r) { socket.emit('room_error', 'Не удалось разместить оффер. Проверь данные.'); return; }
      updated = r;

    } else if (data.action === 'loanAccepted') {
      const debt = data.payload;
      if (!debt.collateralCarId || !debt.borrowerId) {
        socket.emit('room_error', 'Укажи залог и заёмщика!'); return;
      }
      const r = rm.processLoanAccept(data.roomId, debt.borrowerId, debt.id, debt.collateralCarId);
      if (!r.success) { socket.emit('room_error', loanMsg(r.error)); return; }
      updated = r.room;

    } else if (data.action === 'repayDebt') {
      const r = rm.processRepayDebt(data.roomId, data.playerId, data.payload);
      if (!r.success) { socket.emit('room_error', loanMsg(r.error)); return; }
      updated = r.room;

    // ── Race actions ──────────────────────────────────────────────────────
    } else if (data.action === 'raceChallengeInitiated') {
      const { initiatorId, targetId, bet } = data.payload;
      const r = rm.processRaceInitiate(data.roomId, initiatorId, bet, targetId);
      if (!r) { socket.emit('room_error', 'Не удалось начать гонку. Проверь баланс.'); return; }
      updated = r;

    } else if (data.action === 'raceLobbyOpen') {
      const { initiatorId, bet } = data.payload;
      const r = rm.processRaceInitiate(data.roomId, initiatorId, bet, undefined);
      if (!r) { socket.emit('room_error', 'Не удалось открыть лобби гонки.'); return; }
      updated = r;

    } else if (data.action === 'raceAccept') {
      const room = rm.getRoom(data.roomId);
      if (!room?.activeRace) { socket.emit('room_error', 'Нет активной гонки.'); return; }
      // Resolve immediately when target accepts
      const result = rm.processRaceResolve(data.roomId);
      if (!result) { socket.emit('room_error', 'Ошибка при разрешении гонки.'); return; }
      updated = result.room;
      // Announce results to the room
      io.to(data.roomId).emit('sync_action_result', {
        playerId: data.playerId,
        action: 'raceResults',
        payload: { winnerId: result.winnerId, loserId: result.loserId, bet: result.bet, logs: result.logs },
      });

    } else if (data.action === 'raceDecline') {
      rm.clearActiveRace(data.roomId);
      updated = rm.getRoom(data.roomId) ?? null;

    } else if (data.action === 'raceJoin') {
      // Other players join open lobby — just broadcast to let everyone know; resolve happens on raceAccept
      // For now just relay and keep room state as-is

    }

    // Relay the action to other room members
    const syncResult: SyncResultData = buildSyncResult(data);
    socket.to(data.roomId).emit('sync_action_result', syncResult);

    if (updated !== null) io.to(data.roomId).emit('room_updated', updated);
  });
};

// ─── Error messages ───────────────────────────────────────────────────────────

function txMsg(error: rm.TransactionError): string {
  switch (error) {
    case 'not_your_turn':        return 'Куда прёшь? Сейчас не твой черёд!';
    case 'insufficient_balance': return 'В карманах ветер. Денег не хватает.';
    case 'car_is_locked':        return 'Машина под залогом. Не трогай!';
    case 'car_not_found':        return 'Такой тачки нет. Призрак?';
    case 'player_not_found':     return 'Ты кто? Игрок не найден.';
    case 'room_not_found':       return 'Комната испарилась. Лавочку прикрыли.';
    case 'sale_blocked_legal':   return 'Юридический запрет! На учёт не поставить.';
    case 'already_rented':       return 'Уже в прокате, жди следующего хода.';
    case 'defect_not_found':     return 'Дефект не найден.';
    case 'already_repaired':     return 'Уже починено, не жульничай!';
  }
}

function loanMsg(error: rm.LoanError): string {
  switch (error) {
    case 'room_not_found':           return 'Комната не найдена.';
    case 'player_not_found':         return 'Игрок не найден.';
    case 'debt_not_found':           return 'Долг не найден. Уже погашен?';
    case 'insufficient_balance':     return 'Денег у кредитора не хватает на займ.';
    case 'collateral_value_too_low': return 'Залог дешевле займа. Минимум 80% от суммы!';
    case 'car_not_found':            return 'Машина-залог не найдена в гараже.';
    case 'car_is_locked':            return 'Машина уже под другим залогом.';
    case 'debt_not_active':          return 'Долг не активен — нечего погашать.';
    case 'debt_not_pending':         return 'Оффер уже принят или закрыт.';
  }
}

// ─── Type-safe sync relay ─────────────────────────────────────────────────────

type RoomState = ReturnType<typeof rm.getRoom> extends (infer T | undefined) ? T : never;

function buildSyncResult(data: { roomId: string; playerId: string } & SyncActionPayload): SyncResultData {
  const { playerId } = data;
  switch (data.action) {
    case 'buyCar':                 return { playerId, action: data.action, payload: data.payload };
    case 'sellCar':                return { playerId, action: data.action, payload: data.payload };
    case 'repairCar':              return { playerId, action: data.action, payload: data.payload };
    case 'rentCar':                return { playerId, action: data.action, payload: data.payload };
    case 'manualMove':             return { playerId, action: data.action, payload: data.payload };
    case 'buyEnergy':              return { playerId, action: data.action, payload: data.payload };
    case 'diagnoseCar':            return { playerId, action: data.action, payload: data.payload };
    case 'diagnoseMarketCar':      return { playerId, action: data.action, payload: data.payload };
    case 'refreshMarket':          return { playerId, action: data.action, payload: data.payload };
    case 'updateMarket':           return { playerId, action: data.action, payload: data.payload };
    case 'newsUpdate':             return { playerId, action: data.action, payload: data.payload };
    case 'victory':                return { playerId, action: data.action, payload: data.payload };
    case 'loanOffer':              return { playerId, action: data.action, payload: data.payload };
    case 'loanAccepted':           return { playerId, action: data.action, payload: data.payload };
    case 'repayDebt':              return { playerId, action: data.action, payload: data.payload };
    case 'confiscateCar':          return { playerId, action: data.action, payload: data.payload };
    case 'raceLobbyOpen':          return { playerId, action: data.action, payload: data.payload };
    case 'raceChallengeInitiated': return { playerId, action: data.action, payload: data.payload };
    case 'raceAccept':             return { playerId, action: data.action, payload: data.payload };
    case 'raceDecline':            return { playerId, action: data.action, payload: data.payload };
    case 'raceJoin':               return { playerId, action: data.action, payload: data.payload };
    case 'raceResults':            return { playerId, action: data.action, payload: data.payload };
  }
}
