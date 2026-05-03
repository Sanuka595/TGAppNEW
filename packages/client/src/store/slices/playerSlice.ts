import { type StateCreator } from 'zustand';
import { Decimal } from 'decimal.js';
import type { Car, LogEntry, BoardCell, GameNews, Player, CellType } from '@tgperekup/shared';
import {
  GAME_MAP,
  NEWS_DB,
  calculateCurrentMarketValue,
  calculateSellPrice,
  calculateCarHealth,
  calculateRentIncome,
  calculateSoloRaceWinChance,
  generateMarketForCell,
  resolveRandomEncounter,
  DIAGNOSTICS_COST,
  MARKET_REFRESH_COST,
  ENERGY_PURCHASE_COST,
  MAX_ENERGY,
  SPECIAL_REPAIR_DISCOUNT,
} from '@tgperekup/shared';
import { triggerHaptic } from '../../lib/tmaProvider';
import { socket } from '../../lib/socket';
import type { GameStore } from '../store.types';

// ─── Persistent player ID ─────────────────────────────────────────────────────

export function makePersistentPlayerId(): string {
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

export const DEFAULT_PLAYER: Player = {
  id: makePersistentPlayerId(),
  balance: '2000',
  fuel: 0,
  position: 0,
  reputation: 100,
  garage: [],
  energy: 3,
  energyRegenCounter: 0,
  totalEarned: '0',
};

// ─── Slice types ──────────────────────────────────────────────────────────────

export interface PlayerState {
  player: Player;
  garage: Car[];
  market: Car[];
  currentEvent: BoardCell | null;
  lastDiceRoll: number | null;
  lastTaxDeduction: number | null;
  hasRolledThisTurn: boolean;
  logs: LogEntry[];
  activeEvent: GameNews | null;
  totalTurns: number;
}

export interface PlayerActions {
  buyCar: (carId: string) => void;
  sellCar: (carId: string) => void;
  repairCar: (carId: string, defectId: string, isDiscounted?: boolean) => void;
  diagnoseCar: (carId: string) => void;
  diagnoseMarketCar: (carId: string) => void;
  rentCar: (carId: string) => void;
  buyEnergy: () => void;
  startRace: (bet: number) => void;
  refreshMarket: () => void;
  updateNews: (forcedNews?: GameNews) => void;
  executeCellAction: (cell: BoardCell | null) => void;
  manualMove: (steps: number) => void;
  rollDice: () => void;
  updateMarket: (cars: Car[]) => void;
  setActiveEvent: (news: GameNews | null) => void;
  setCurrentEvent: (cell: BoardCell | null) => void;
  addLog: (text: string, type?: LogEntry['type']) => void;
}

export type PlayerSlice = PlayerState & PlayerActions;

export const initialPlayerState: PlayerState = {
  player: DEFAULT_PLAYER,
  garage: [],
  market: [],
  currentEvent: null,
  lastDiceRoll: null,
  lastTaxDeduction: null,
  hasRolledThisTurn: false,
  logs: [],
  activeEvent: null,
  totalTurns: 0,
};

// ─── Slice factory ────────────────────────────────────────────────────────────

export const createPlayerSlice: StateCreator<GameStore, [['zustand/persist', unknown]], [], PlayerSlice> = (set, get) => ({
  ...initialPlayerState,

  addLog: (text, type) => set((s) => ({
    logs: [type !== undefined ? { text, type } : { text }, ...s.logs].slice(0, 50),
  })),

  updateMarket: (cars) => set({ market: cars }),
  setActiveEvent: (news) => set({ activeEvent: news }),
  setCurrentEvent: (cell) => set({ currentEvent: cell }),

  buyCar: (carId) => {
    const { player, market, roomId, activeEvent } = get();
    const car = market.find((c) => c.id === carId);
    if (!car) { get().addLog('Машина не найдена на рынке!', 'error'); return; }

    const price = calculateCurrentMarketValue(car, activeEvent);
    const balance = new Decimal(player.balance);
    if (balance.lt(price)) { get().addLog('Недостаточно денег!', 'error'); return; }

    const newBalance = balance.sub(price).toFixed(0);
    const carWithBoughtFor = { ...car, boughtFor: price.toFixed(0) };
    set((state) => ({
      player: { ...state.player, balance: newBalance, garage: [...(state.player.garage ?? []), carWithBoughtFor] },
      garage: [...state.garage, carWithBoughtFor],
      market: state.market.filter((c) => c.id !== carId),
    }));
    get().addLog(`Сделка века! Вы купили ${car.name}. Теперь это твоя головная боль за $${price.toFixed(0)}.`, 'success');

    if (roomId) {
      socket.emit('sync_action', { roomId, playerId: player.id, action: 'buyCar', payload: carId });
    }
  },

  sellCar: (carId) => {
    const { player, roomId, activeEvent } = get();
    const car = (player.garage ?? []).find((c) => c.id === carId);
    if (!car) { get().addLog('Машина не найдена в гараже!', 'error'); return; }
    if (car.isLocked === true) { get().addLog('Автомобиль заложен по долговому договору!', 'error'); return; }

    const sellPrice = calculateSellPrice(car, activeEvent);
    if (sellPrice.isZero()) {
      get().addLog('Продажа запрещена: у авто юридический запрет регистрационных действий!', 'error');
      return;
    }

    const newBalance = new Decimal(player.balance).add(sellPrice).toFixed(0);
    set((state) => ({
      player: { ...state.player, balance: newBalance, garage: (state.player.garage ?? []).filter((c) => c.id !== carId) },
      garage: state.garage.filter((c) => c.id !== carId),
    }));
    get().addLog(`Лох найден! Продали ${car.name} за $${sellPrice.toFixed(0)}. Деньги не пахнут!`, 'success');

    if (roomId) {
      socket.emit('sync_action', { roomId, playerId: player.id, action: 'sellCar', payload: carId });
    }
  },

  repairCar: (carId, defectId, isDiscounted) => {
    const { player, roomId } = get();
    const garage = player.garage ?? [];
    const car = garage.find((c) => c.id === carId);
    if (!car) return;
    const defect = car.defects.find((d) => d.id === defectId);
    if (!defect || defect.isRepaired) return;

    let cost = new Decimal(defect.repairCost);
    if (isDiscounted) cost = cost.mul(SPECIAL_REPAIR_DISCOUNT);

    if (new Decimal(player.balance).lt(cost)) { get().addLog('Недостаточно денег на ремонт!', 'error'); return; }

    const newDefects = car.defects.map((d) => d.id === defectId ? { ...d, isRepaired: true } : d);
    const newHealth = calculateCarHealth(newDefects);
    const newGarage = garage.map((c) => c.id === carId ? { ...c, defects: newDefects, health: newHealth } : c);

    set((state) => ({
      player: { ...state.player, balance: new Decimal(state.player.balance).sub(cost).toFixed(0), garage: newGarage },
    }));
    get().addLog(`Мастер сплюнул и сказал: "${defect.name}" исправлено. С тебя $${cost.toFixed(0)}.`, 'success');

    if (roomId) {
      socket.emit('sync_action', { roomId, playerId: player.id, action: 'repairCar', payload: { carId, defectId, isDiscounted: isDiscounted ?? false } });
    }
  },

  diagnoseCar: (carId) => {
    const { player, roomId } = get();
    const garage = player.garage ?? [];
    const car = garage.find((c) => c.id === carId);
    if (!car) return;

    if (new Decimal(player.balance).lt(DIAGNOSTICS_COST)) { get().addLog('Недостаточно денег на диагностику!', 'error'); return; }

    const newDefects = car.defects.map((d) => ({ ...d, isHidden: false }));
    const newGarage = garage.map((c) => c.id === carId ? { ...c, defects: newDefects } : c);

    set((state) => ({
      player: { ...state.player, balance: new Decimal(state.player.balance).sub(DIAGNOSTICS_COST).toFixed(0), garage: newGarage },
    }));
    get().addLog(`Диагностика ${car.name} в гараже завершена. Вскрыли все "сюрпризы" от прошлого владельца!`, 'success');

    if (roomId) {
      socket.emit('sync_action', { roomId, playerId: player.id, action: 'diagnoseCar', payload: carId });
    }
  },

  diagnoseMarketCar: (carId) => {
    const { player, market, roomId } = get();
    const car = market.find((c) => c.id === carId);
    if (!car) return;

    if (new Decimal(player.balance).lt(DIAGNOSTICS_COST)) { get().addLog('Недостаточно денег на диагностику!', 'error'); return; }

    set((state) => ({
      player: { ...state.player, balance: new Decimal(state.player.balance).sub(DIAGNOSTICS_COST).toFixed(0) },
      market: state.market.map((c) => c.id !== carId ? c : { ...c, defects: c.defects.map((d) => ({ ...d, isHidden: false })) }),
    }));
    get().addLog(`Диагностика лота ${car.name} завершена. Толщиномер не врет — теперь мы знаем правду!`, 'success');
    triggerHaptic('impact', 'light');

    if (roomId) {
      socket.emit('sync_action', { roomId, playerId: player.id, action: 'diagnoseMarketCar', payload: carId });
    }
  },

  rentCar: (carId) => {
    const { player, roomId } = get();
    const garage = player.garage ?? [];
    const car = garage.find((c) => c.id === carId);
    if (!car) return;
    if (car.isRented) { get().addLog('Машина уже сдана в прокат в этом ходу!', 'error'); return; }

    const income = calculateRentIncome(car.tier);
    const newGarage = garage.map((c) => c.id === carId ? { ...c, isRented: true } : c);

    set((state) => ({
      player: { ...state.player, balance: new Decimal(state.player.balance).add(income).toFixed(0), garage: newGarage },
    }));
    get().addLog(`Сдано в прокат: ${car.name}. Получено $${income.toFixed(0)}`, 'success');

    if (roomId) {
      socket.emit('sync_action', { roomId, playerId: player.id, action: 'rentCar', payload: carId });
    }
  },

  buyEnergy: () => {
    const { player, roomId } = get();
    if (player.energy >= MAX_ENERGY) { get().addLog('Энергия уже на максимуме!', 'error'); return; }
    if (new Decimal(player.balance).lt(ENERGY_PURCHASE_COST)) { get().addLog('Недостаточно денег для покупки энергии!', 'error'); return; }

    set((state) => ({
      player: { ...state.player, balance: new Decimal(state.player.balance).sub(ENERGY_PURCHASE_COST).toFixed(0), energy: state.player.energy + 1 },
    }));
    get().addLog('Закинулся энергетиком. Теперь можно и пару лишних клеток проскочить!', 'success');

    if (roomId) {
      socket.emit('sync_action', { roomId, playerId: player.id, action: 'buyEnergy', payload: null });
    }
  },

  startRace: (bet) => {
    const { player, garage, roomId } = get();
    if (garage.length === 0) { get().addLog('Для гонки нужна хотя бы одна машина в гараже!', 'error'); return; }
    if (new Decimal(player.balance).lt(bet)) { get().addLog('Недостаточно денег для ставки!', 'error'); return; }

    const bestCar = [...garage].sort((a, b) => b.health - a.health)[0];
    if (!bestCar) return;

    const won = Math.random() < calculateSoloRaceWinChance(bestCar);

    if (won) {
      const reward = bet * 2;
      set((s) => ({ player: { ...s.player, balance: new Decimal(s.player.balance).add(reward).toFixed(0) } }));
      get().addLog(`🏎️ ПОБЕДА! Ваш ${bestCar.name} пришел первым. Выигрыш: $${reward}`, 'success');
      triggerHaptic('notification', 'success');
    } else {
      set((s) => ({ player: { ...s.player, balance: new Decimal(s.player.balance).sub(bet).toFixed(0) } }));
      get().addLog(`🏎️ Поражение! ${bestCar.name} не вытянул. Потеряно: $${bet}`, 'error');
      triggerHaptic('notification', 'error');
    }

    if (roomId) {
      socket.emit('sync_action', {
        roomId, playerId: player.id, action: 'raceResults',
        payload: { winnerId: won ? player.id : 'bot', loserId: won ? 'bot' : player.id, bet, logs: [] },
      });
    }
  },

  refreshMarket: () => {
    const { player, currentEvent, roomId } = get();
    if (!currentEvent || !currentEvent.type.startsWith('buy_')) {
      get().addLog('Обновить рынок можно только на клетке покупки!', 'error');
      return;
    }
    if (new Decimal(player.balance).lt(MARKET_REFRESH_COST)) {
      get().addLog('Недостаточно денег для обновления рынка!', 'error');
      return;
    }

    const newMarket = generateMarketForCell(currentEvent.type as CellType);

    set((state) => ({
      player: { ...state.player, balance: new Decimal(state.player.balance).sub(MARKET_REFRESH_COST).toFixed(0) },
      market: newMarket,
    }));
    get().addLog('Рынок обновлен! Пригнали свежую партию, налетай!', 'success');
    triggerHaptic('impact', 'medium');

    if (roomId) {
      socket.emit('sync_action', { roomId, playerId: player.id, action: 'refreshMarket', payload: null });
    }
  },

  updateNews: (forcedNews) => {
    const { roomId, player, isHost } = get();
    const news = forcedNews ?? NEWS_DB[Math.floor(Math.random() * NEWS_DB.length)];
    if (!news) return;

    set({ activeEvent: news });
    get().addLog(`[НОВОСТИ] ${news.title}: ${news.description}`, 'info');
    triggerHaptic('notification', 'info' as Parameters<typeof triggerHaptic>[1]);

    if (roomId && isHost) {
      socket.emit('sync_action', { roomId, playerId: player.id, action: 'newsUpdate', payload: news });
    }
  },

  executeCellAction: (cell) => {
    if (!cell) return;
    const { roomId, player, addLog } = get();

    const newCars = generateMarketForCell(cell.type);

    switch (cell.type) {
      case 'buy_bucket':   addLog('Приехал на разборку к дяде Васе. Тут одни вёдра, зато дешево!', 'info'); break;
      case 'buy_scrap':    addLog('Вижу битьё! Немного шпаклевки, и будет как новая (нет).', 'info'); break;
      case 'buy_business': addLog('Опа, солидные аппараты для серьезных людей. Главное — не смотреть на пробег.', 'info'); break;
      case 'buy_premium':  addLog('Зашел в элитный салон. Менеджер смотрит на меня как на нищеброда...', 'info'); break;
      case 'buy_random':   addLog('Автоподборщик прислал варианты. Говорит "не бита, не крашена", верим?', 'info'); break;
      case 'buy_retro':    addLog('Нашел капсулу времени! Владелец — дедушка, ездил только в церковь.', 'info'); break;
      case 'race':         addLog('Тут пахнет жженой резиной. Кто рискнет заехать на интерес?', 'info'); break;
      case 'rent':         addLog('Площадка проката. Можно сдать свой хлам в аренду таксистам.', 'info'); break;
      case 'sale':         addLog('Чапаевка! Место, где сбываются мечты и продаются "идеальные" машины.', 'info'); break;
      case 'repair':       addLog('Заехал в сервис. Мастера уже потирают руки, видя твой кошелек.', 'info'); break;
      case 'special_repair': addLog('Сервис "Пехота". Тут делают быстро, дешево и со скидкой для своих.', 'info'); break;
      default:             addLog(`Вы притопали на клетку: ${cell.name}.`, 'info'); break;
    }

    if (newCars.length > 0) {
      set({ market: newCars });
      if (roomId) {
        socket.emit('sync_action', { roomId, playerId: player.id, action: 'updateMarket', payload: newCars });
      }
    }
  },

  rollDice: () => {
    const { roomId, player, players, currentTurnIndex, hasRolledThisTurn } = get();
    if (!roomId) {
      const diceValue = Math.floor(Math.random() * 6) + 1;
      const newPosition = (player.position + diceValue) % 12;
      get().handleDiceRollResult(player.id, diceValue, newPosition);
      get().addLog(`Кости брошены! Выпало: ${diceValue}. Газуем!`, 'info');
      return;
    }

    const currentPlayer = players[currentTurnIndex];
    if (currentPlayer?.id !== player.id) { get().addLog('Сейчас не ваш ход!', 'error'); return; }
    if (hasRolledThisTurn) { get().addLog('Вы уже бросили кубик!', 'error'); return; }
    socket.emit('dice_roll', { roomId, playerId: player.id });
  },

  manualMove: (steps) => {
    const { roomId, player, players, currentTurnIndex } = get();

    if (!roomId) {
      if (player.energy < 1) { get().addLog('Недостаточно энергии для тактического хода!', 'error'); return; }
      const newPosition = (player.position + steps) % 12;
      const cell = GAME_MAP.find((c) => c.id === newPosition) ?? null;
      set((state) => ({
        player: { ...state.player, energy: state.player.energy - 1, position: newPosition },
        lastDiceRoll: 0,
        hasRolledThisTurn: true,
        currentEvent: cell,
      }));
      get().executeCellAction(cell);
      get().addLog(`Тактический маневр! Проползли на ${steps} клеток. Энергия на исходе.`, 'info');
      return;
    }

    const currentPlayer = players[currentTurnIndex];
    if (currentPlayer?.id !== player.id) { get().addLog('Сейчас не ваш ход!', 'error'); return; }
    if (player.energy < 1) { get().addLog('Недостаточно энергии для тактического хода!', 'error'); return; }

    const newPosition = (player.position + steps) % 12;
    const cell = GAME_MAP.find((c) => c.id === newPosition) ?? null;
    set((state) => ({
      player: { ...state.player, energy: state.player.energy - 1, position: newPosition },
      lastDiceRoll: 0,
      hasRolledThisTurn: true,
      currentEvent: cell,
    }));
    get().executeCellAction(cell);
    get().addLog(`Тактический маневр! Продвинулись на ${steps} клеток. Соперники кусают локти.`, 'info');
    socket.emit('sync_action', { roomId, playerId: player.id, action: 'manualMove', payload: { steps, newPosition } });
  },
});
