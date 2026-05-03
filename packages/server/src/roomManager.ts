import { Decimal } from 'decimal.js';
import type { Car, Debt, GameNews, Player, RaceDuel, RoomState } from '@tgperekup/shared';
import { calculateCurrentMarketValue, calculateSellPrice, calculateCarHealth, calculateRentIncome } from '@tgperekup/shared';

export const MAX_PLAYERS = 4;

const ROOM_STALE_MS = 30 * 60 * 1000;

interface RoomMeta {
  state: RoomState;
  lastActivityAt: number;
}

const rooms = new Map<string, RoomMeta>();
const socketToRoom = new Map<string, string>();
const playerToSocket = new Map<string, string>();

function generateRoomId(): string {
  let id = '';
  do { id = Math.random().toString(36).substring(2, 8).toUpperCase(); } while (rooms.has(id));
  return id;
}

function touch(roomId: string): void {
  const meta = rooms.get(roomId);
  if (meta !== undefined) meta.lastActivityAt = Date.now();
}

function nanoid(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export const getRoom = (roomId: string): RoomState | undefined => rooms.get(roomId)?.state;
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

export const createRoom = (socketId: string, player: Player, winCondition: number): string => {
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
      activeRace: null,
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
    room.players[existingIndex] = player;
  } else {
    room.players.push(player);
  }

  const oldSocketId = playerToSocket.get(player.id);
  if (oldSocketId !== undefined && oldSocketId !== socketId) socketToRoom.delete(oldSocketId);

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
  if (meta === undefined) { socketToRoom.delete(socketId); playerToSocket.delete(playerId); return null; }

  const { state: room } = meta;
  room.players = room.players.filter(p => p.id !== playerId);
  socketToRoom.delete(socketId);
  playerToSocket.delete(playerId);

  if (room.players.length === 0) { rooms.delete(roomId); return null; }
  if (room.hostId === playerId) { const first = room.players[0]; if (first !== undefined) room.hostId = first.id; }
  if (room.currentTurnIndex >= room.players.length) room.currentTurnIndex = 0;

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

  // ── Debt tick: decrement turnsLeft; confiscate on expiry ──
  const debts = room.activeDebts ?? [];
  for (let i = 0; i < debts.length; i++) {
    const debt = debts[i]!;
    if (debt.status !== 'active') continue;
    debts[i] = { ...debt, turnsLeft: debt.turnsLeft - 1 };

    if (debts[i]!.turnsLeft <= 0 && debt.borrowerId && debt.collateralCarId) {
      const borrowerIdx = room.players.findIndex(p => p.id === debt.borrowerId);
      const lenderIdx = room.players.findIndex(p => p.id === debt.lenderId);
      if (borrowerIdx !== -1 && lenderIdx !== -1) {
        const borrower = room.players[borrowerIdx]!;
        const lender = room.players[lenderIdx]!;
        const car = (borrower.garage ?? []).find(c => c.id === debt.collateralCarId);
        if (car) {
          room.players[borrowerIdx] = {
            ...borrower,
            garage: (borrower.garage ?? []).filter(c => c.id !== debt.collateralCarId),
          };
          room.players[lenderIdx] = {
            ...lender,
            garage: [...(lender.garage ?? []), { ...car, isLocked: false }],
          };
          debts[i] = { ...debts[i]!, status: 'confiscated' };
        }
      }
    }
  }
  room.activeDebts = debts;

  // ── Race expiry: clear stale challenges and resolved races ──
  if (room.activeRace) {
    if ((room.activeRace.status === 'pending_acceptance' && Date.now() > room.activeRace.expiresAt) || 
        room.activeRace.status === 'resolved') {
      room.activeRace = null;
    }
  }

  touch(roomId);
  return room;
};

// ─── Market ───────────────────────────────────────────────────────────────────

export const updateMarket = (roomId: string, market: Car[], byPlayerId: string): RoomState | null => {
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

export const updatePlayer = (roomId: string, playerId: string, update: Partial<Player>): RoomState | null => {
  const meta = rooms.get(roomId);
  if (meta === undefined) return null;
  const { state: room } = meta;
  const index = room.players.findIndex(p => p.id === playerId);
  if (index === -1) return null;
  room.players[index] = { ...room.players[index]!, ...update };
  touch(roomId);
  return room;
};

// ─── Transaction types ────────────────────────────────────────────────────────

export type TransactionError =
  | 'room_not_found'
  | 'not_your_turn'
  | 'car_not_found'
  | 'player_not_found'
  | 'insufficient_balance'
  | 'car_is_locked'
  | 'sale_blocked_legal'
  | 'already_rented'
  | 'defect_not_found'
  | 'already_repaired';

export type LoanError =
  | 'room_not_found'
  | 'player_not_found'
  | 'debt_not_found'
  | 'insufficient_balance'
  | 'collateral_value_too_low'
  | 'car_not_found'
  | 'car_is_locked'
  | 'debt_not_active'
  | 'debt_not_pending';

export type TxResult = { success: true; room: RoomState } | { success: false; error: TransactionError };
export type LoanResult = { success: true; room: RoomState } | { success: false; error: LoanError };

// ─── Authoritative buy ────────────────────────────────────────────────────────

export const processBuyCar = (roomId: string, playerId: string, carId: string): TxResult => {
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

// ─── Authoritative sell ───────────────────────────────────────────────────────

export const processSellCar = (roomId: string, playerId: string, carId: string): TxResult => {
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

  if (newBalance.gte(room.winCondition)) room.winnerId = playerId;

  touch(roomId);
  return { success: true, room };
};

// ─── Authoritative repair ─────────────────────────────────────────────────────

export const processRepairCar = (
  roomId: string,
  playerId: string,
  carId: string,
  defectId: string,
  isDiscounted: boolean,
): TxResult => {
  const meta = rooms.get(roomId);
  if (!meta) return { success: false, error: 'room_not_found' };

  const { state: room } = meta;
  const playerIdx = room.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return { success: false, error: 'player_not_found' };

  const player = room.players[playerIdx]!;
  const garage = player.garage ?? [];
  const car = garage.find(c => c.id === carId);
  if (!car) return { success: false, error: 'car_not_found' };

  const defect = car.defects.find(d => d.id === defectId);
  if (!defect) return { success: false, error: 'defect_not_found' };
  if (defect.isRepaired) return { success: false, error: 'already_repaired' };

  let cost = new Decimal(defect.repairCost);
  if (isDiscounted) cost = cost.mul('0.95');

  if (new Decimal(player.balance).lt(cost)) return { success: false, error: 'insufficient_balance' };

  const newDefects = car.defects.map(d => d.id === defectId ? { ...d, isRepaired: true } : d);
  const newHealth = calculateCarHealth(newDefects);
  const newGarage = garage.map(c => c.id === carId ? { ...c, defects: newDefects, health: newHealth } : c);

  room.players[playerIdx] = {
    ...player,
    balance: new Decimal(player.balance).sub(cost).toFixed(0),
    garage: newGarage,
  };

  touch(roomId);
  return { success: true, room };
};

// ─── Authoritative rent ───────────────────────────────────────────────────────

export const processRentCar = (roomId: string, playerId: string, carId: string): TxResult => {
  const meta = rooms.get(roomId);
  if (!meta) return { success: false, error: 'room_not_found' };

  const { state: room } = meta;
  const playerIdx = room.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return { success: false, error: 'player_not_found' };

  const player = room.players[playerIdx]!;
  const garage = player.garage ?? [];
  const car = garage.find(c => c.id === carId);
  if (!car) return { success: false, error: 'car_not_found' };
  if (car.isRented) return { success: false, error: 'already_rented' };

  const income = calculateRentIncome(car.tier);
  const newGarage = garage.map(c => c.id === carId ? { ...c, isRented: true } : c);

  room.players[playerIdx] = {
    ...player,
    balance: new Decimal(player.balance).add(income).toFixed(0),
    garage: newGarage,
  };

  touch(roomId);
  return { success: true, room };
};

// ─── Authoritative market ─────────────────────────────────────────────────────

export const updateActiveEvent = (roomId: string, news: GameNews | null): void => {
  const meta = rooms.get(roomId);
  if (meta === undefined) return;
  meta.state.activeEvent = news;
  touch(roomId);
};

// ─── P2P Debt / Perekup Hub ───────────────────────────────────────────────────

export const processLoanOffer = (roomId: string, lenderId: string, offer: Debt): RoomState | null => {
  const meta = rooms.get(roomId);
  if (!meta) return null;
  const { state: room } = meta;
  if (!room.players.find(p => p.id === lenderId)) return null;

  if (!room.activeDebts) room.activeDebts = [];
  room.activeDebts.push({ ...offer, id: offer.id || nanoid(), lenderId, status: 'pending' });

  touch(roomId);
  return room;
};

export const processLoanAccept = (
  roomId: string,
  borrowerId: string,
  debtId: string,
  collateralCarId: string,
): LoanResult => {
  const meta = rooms.get(roomId);
  if (!meta) return { success: false, error: 'room_not_found' };

  const { state: room } = meta;
  const debts = room.activeDebts ?? [];
  const debtIdx = debts.findIndex(d => d.id === debtId);
  if (debtIdx === -1) return { success: false, error: 'debt_not_found' };

  const debt = debts[debtIdx]!;
  if (debt.status !== 'pending') return { success: false, error: 'debt_not_pending' };

  const borrowerIdx = room.players.findIndex(p => p.id === borrowerId);
  if (borrowerIdx === -1) return { success: false, error: 'player_not_found' };

  const borrower = room.players[borrowerIdx]!;
  const car = (borrower.garage ?? []).find(c => c.id === collateralCarId);
  if (!car) return { success: false, error: 'car_not_found' };
  if (car.isLocked) return { success: false, error: 'car_is_locked' };

  // Collateral value must be >= 80% of loan principal
  const carValue = calculateSellPrice(car, room.activeEvent ?? null);
  const minRequired = new Decimal(debt.amount).mul('0.8');
  if (carValue.lt(minRequired)) return { success: false, error: 'collateral_value_too_low' };

  // Lender must have the funds to transfer
  const lenderIdx = room.players.findIndex(p => p.id === debt.lenderId);
  if (lenderIdx === -1) return { success: false, error: 'player_not_found' };
  const lender = room.players[lenderIdx]!;
  if (new Decimal(lender.balance).lt(debt.amount)) return { success: false, error: 'insufficient_balance' };

  // Execute: money to borrower, lock car, activate debt
  room.players[borrowerIdx] = {
    ...borrower,
    balance: new Decimal(borrower.balance).add(debt.amount).toFixed(0),
    garage: (borrower.garage ?? []).map(c => c.id === collateralCarId ? { ...c, isLocked: true } : c),
  };
  room.players[lenderIdx] = {
    ...lender,
    balance: new Decimal(lender.balance).sub(debt.amount).toFixed(0),
  };
  debts[debtIdx] = { ...debt, borrowerId, collateralCarId, status: 'active' };
  room.activeDebts = debts;

  touch(roomId);
  return { success: true, room };
};

export const processRepayDebt = (roomId: string, borrowerId: string, debtId: string): LoanResult => {
  const meta = rooms.get(roomId);
  if (!meta) return { success: false, error: 'room_not_found' };

  const { state: room } = meta;
  const debts = room.activeDebts ?? [];
  const debtIdx = debts.findIndex(d => d.id === debtId && d.borrowerId === borrowerId);
  if (debtIdx === -1) return { success: false, error: 'debt_not_found' };

  const debt = debts[debtIdx]!;
  if (debt.status !== 'active') return { success: false, error: 'debt_not_active' };

  const borrowerIdx = room.players.findIndex(p => p.id === borrowerId);
  if (borrowerIdx === -1) return { success: false, error: 'player_not_found' };

  const borrower = room.players[borrowerIdx]!;
  if (new Decimal(borrower.balance).lt(debt.totalToPay)) return { success: false, error: 'insufficient_balance' };

  const lenderIdx = room.players.findIndex(p => p.id === debt.lenderId);
  const newGarage = (borrower.garage ?? []).map(c =>
    c.id === debt.collateralCarId ? { ...c, isLocked: false } : c,
  );

  room.players[borrowerIdx] = {
    ...borrower,
    balance: new Decimal(borrower.balance).sub(debt.totalToPay).toFixed(0),
    garage: newGarage,
  };
  if (lenderIdx !== -1) {
    const lender = room.players[lenderIdx]!;
    room.players[lenderIdx] = {
      ...lender,
      balance: new Decimal(lender.balance).add(debt.totalToPay).toFixed(0),
    };
  }
  debts[debtIdx] = { ...debt, status: 'closed' };
  room.activeDebts = debts;

  touch(roomId);
  return { success: true, room };
};

// ─── Race Duel ────────────────────────────────────────────────────────────────

const TIER_RACE_BONUS: Record<string, number> = {
  Bucket: -1, Scrap: 0, Business: 0, Premium: 1, Rarity: 2,
};

const RACE_LOGS_WIN = [
  'Турбина чихнула, но вытянула в последний момент!',
  'Закись азота сработала в нужный момент — сопернику только пыль в лицо!',
  'Соперник зазевался на светофоре — этим всё сказано.',
  'Старый конь борозды не испортит. Победа!',
  'Механик плакал, но машина поехала. Быстро поехала.',
];
const RACE_LOGS_LOSE = [
  'Клин на полпути. Инструктор просто молча смотрит.',
  'Масло потекло прямо в повороте. Бывает.',
  'КПП переключилась куда не надо. Физика — беспощадная штука.',
  'Лопнул тормоз! Живой — уже хорошо.',
  'Противник оказался порядочным жуликом и выиграл честно.',
];

function getBestCarTier(playerId: string, room: RoomState): string {
  const player = room.players.find(p => p.id === playerId);
  if (!player?.garage?.length) return 'Bucket';
  const order = ['Bucket', 'Scrap', 'Business', 'Premium', 'Rarity'];
  return player.garage.reduce((best, car) =>
    order.indexOf(car.tier) > order.indexOf(best) ? car.tier : best, 'Bucket');
}

export const processRaceInitiate = (
  roomId: string,
  initiatorId: string,
  bet: number,
  targetId?: string,
): RoomState | null => {
  const meta = rooms.get(roomId);
  if (!meta) return null;
  const { state: room } = meta;

  const initiator = room.players.find(p => p.id === initiatorId);
  if (!initiator) return null;

  const maxBet = Math.floor(new Decimal(initiator.balance).div(2).toNumber());
  const safeBet = Math.min(Math.max(bet, 0), maxBet);

  room.activeRace = {
    id: nanoid(),
    initiatorId,
    targetId,
    bet: safeBet,
    status: targetId ? 'pending_acceptance' : 'open_lobby',
    expiresAt: Date.now() + 90_000,
  };

  touch(roomId);
  return room;
};

export type RaceResolveResult = {
  room: RoomState;
  winnerId: string;
  loserId: string;
  logs: string[];
  bet: number;
};

/**
 * Resolves the active race: rolls D6 per participant + tier bonus.
 * Initiator also gets +1 home-field bonus.
 * Transfers bet from loser to winner.
 */
export const processRaceResolve = (roomId: string): RaceResolveResult | null => {
  const meta = rooms.get(roomId);
  if (!meta?.state.activeRace) return null;

  const { state: room } = meta;
  const race = room.activeRace!;

  const participantIds: string[] = [race.initiatorId];
  if (race.targetId && race.targetId !== race.initiatorId) participantIds.push(race.targetId);

  const rolls = participantIds.map(pid => {
    const tier = getBestCarTier(pid, room);
    const bonus = (TIER_RACE_BONUS[tier] ?? 0) + (pid === race.initiatorId ? 1 : 0);
    const roll = Math.floor(Math.random() * 6) + 1;
    return { playerId: pid, total: roll + bonus, roll, bonus, tier };
  });

  rolls.sort((a, b) => b.total - a.total || Math.random() - 0.5);
  const winner = rolls[0]!;
  const loser = rolls[rolls.length - 1]!;

  const winnerIdx = room.players.findIndex(p => p.id === winner.playerId);
  const loserIdx = room.players.findIndex(p => p.id === loser.playerId);

  if (winnerIdx !== -1 && loserIdx !== -1 && winner.playerId !== loser.playerId) {
    const w = room.players[winnerIdx]!;
    const l = room.players[loserIdx]!;
    const payout = race.bet;
    room.players[winnerIdx] = { ...w, balance: new Decimal(w.balance).add(payout).toFixed(0) };
    room.players[loserIdx] = { ...l, balance: Decimal.max(0, new Decimal(l.balance).sub(payout)).toFixed(0) };
  }

  const winnerTag = `${winner.playerId.substring(0, 4).toUpperCase()} (${winner.tier}, ${winner.roll}+${winner.bonus})`;
  const loserTag = `${loser.playerId.substring(0, 4).toUpperCase()} (${loser.tier}, ${loser.roll}+${loser.bonus})`;
  const logs = [
    `🏁 Старт! ${winnerTag} vs ${loserTag}`,
    RACE_LOGS_WIN[Math.floor(Math.random() * RACE_LOGS_WIN.length)]!,
    `🏆 Победитель: ${winner.playerId.substring(0, 4).toUpperCase()} забирает $${race.bet}`,
  ];

  room.activeRace = {
    ...race,
    status: 'resolved',
    winnerId: winner.playerId,
    logs,
    participants: rolls.map(r => ({ playerId: r.playerId, roll: r.total, bonus: r.bonus, carTier: r.tier })),
  };

  touch(roomId);
  return { room, winnerId: winner.playerId, loserId: loser.playerId, logs, bet: race.bet };
};

export const clearActiveRace = (roomId: string): void => {
  const meta = rooms.get(roomId);
  if (!meta) return;
  meta.state.activeRace = null;
  touch(roomId);
};

// ─── Maintenance ──────────────────────────────────────────────────────────────

export const cleanupStaleRooms = (): number => {
  const now = Date.now();
  let removed = 0;
  for (const [roomId, meta] of rooms) {
    if (now - meta.lastActivityAt > ROOM_STALE_MS) {
      for (const player of meta.state.players) {
        const sockId = playerToSocket.get(player.id);
        if (sockId !== undefined) { socketToRoom.delete(sockId); playerToSocket.delete(player.id); }
      }
      rooms.delete(roomId);
      removed++;
      console.log(`[CLEANUP] Stale room ${roomId} removed`);
    }
  }
  return removed;
};
