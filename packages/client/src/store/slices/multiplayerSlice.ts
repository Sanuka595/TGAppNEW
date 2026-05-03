import { type StateCreator } from 'zustand';
import { Decimal } from 'decimal.js';
import type { Debt, EventFeedEntry, Player, RaceDuel, RoomState, SyncActionPayload } from '@tgperekup/shared';
import { GAME_MAP, resolveRandomEncounter } from '@tgperekup/shared';
import { triggerHaptic } from '../../lib/tmaProvider';
import { socket } from '../../lib/socket';
import type { GameStore } from '../store.types';

// ─── Local types ──────────────────────────────────────────────────────────────

export interface RemoteAnimationState {
  playerId: string;
  diceValue: number;
  fromPosition: number;
}

// ─── Slice types ──────────────────────────────────────────────────────────────

export interface MultiplayerState {
  roomId: string | null;
  players: Player[];
  activeDebts: Debt[];
  isHost: boolean;
  hostId?: string;
  currentTurnIndex: number;
  winCondition: number;
  winnerId: string | null;
  activeRace: RaceDuel | null;
  remoteAnimation: RemoteAnimationState | null;
  pendingRaceChallenge: RaceDuel | null;
  /** Server-authoritative global event feed. Populated by room_updated. */
  eventFeed: EventFeedEntry[];
}

export interface MultiplayerActions {
  createRoom: (winCondition: number) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  syncRoomState: (roomState: RoomState) => void;
  handleDiceRollResult: (playerId: string, diceValue: number, newPosition: number) => void;
  handleRemoteAction: (data: { playerId: string } & SyncActionPayload) => void;
  passTurn: () => void;
  offerLoan: (amount: string, interestPct: number, turns: number) => void;
  acceptLoan: (debtId: string, collateralCarId: string) => void;
  repayDebt: (debtId: string) => void;
  initiateRaceDuel: (targetId: string, bet: number) => void;
  acceptRaceDuel: (initiatorId: string) => void;
  declineRaceDuel: (initiatorId: string) => void;
  setActiveRace: (race: RaceDuel | null) => void;
  setPendingRaceChallenge: (race: RaceDuel | null) => void;
  setRemoteAnimation: (anim: RemoteAnimationState | null) => void;
  setWinnerId: (id: string | null) => void;
}

export type MultiplayerSlice = MultiplayerState & MultiplayerActions;

export const initialMultiplayerState: Omit<MultiplayerState, 'hostId'> = {
  roomId: null,
  players: [],
  activeDebts: [],
  isHost: false,
  currentTurnIndex: 0,
  winCondition: 500_000,
  winnerId: null,
  activeRace: null,
  remoteAnimation: null,
  pendingRaceChallenge: null,
  eventFeed: [],
};

// ─── Slice factory ────────────────────────────────────────────────────────────

export const createMultiplayerSlice: StateCreator<GameStore, [['zustand/persist', unknown]], [], MultiplayerSlice> = (set, get) => ({
  ...initialMultiplayerState,

  setActiveRace: (race) => set({ activeRace: race }),
  setPendingRaceChallenge: (race) => set({ pendingRaceChallenge: race }),
  setRemoteAnimation: (anim) => set({ remoteAnimation: anim }),
  setWinnerId: (id) => set({ winnerId: id }),

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
    const inRoom = roomState.players.some((p) => p.id === myId);
    const me = roomState.players.find((p) => p.id === myId);

    const myIndex = roomState.players.findIndex((p) => p.id === myId);
    const isNowMyTurn = inRoom && roomState.currentTurnIndex === myIndex;
    const wasMyTurn = get().currentTurnIndex === get().players.findIndex((p) => p.id === myId);
    const turnChangedToMe = isNowMyTurn && !wasMyTurn;

    const incomingRace = roomState.activeRace ?? null;
    const isPendingForMe = incomingRace?.status === 'pending_acceptance' && incomingRace.targetId === myId;

    set((state) => ({
      players: roomState.players,
      market: roomState.market,
      player: { ...state.player, ...me },
      garage: me?.garage ?? state.garage,
      roomId: inRoom ? roomState.id : null,
      isHost: inRoom ? roomState.hostId === myId : false,
      currentTurnIndex: inRoom ? roomState.currentTurnIndex : 0,
      winCondition: inRoom ? roomState.winCondition : 0,
      winnerId: inRoom ? roomState.winnerId ?? null : null,
      hostId: roomState.hostId,
      hasRolledThisTurn: turnChangedToMe ? false : state.hasRolledThisTurn,
      lastDiceRoll: turnChangedToMe ? 0 : state.lastDiceRoll,
      activeDebts: roomState.activeDebts ?? state.activeDebts,
      activeRace: incomingRace,
      pendingRaceChallenge: isPendingForMe ? incomingRace : null,
      eventFeed: roomState.eventFeed ?? state.eventFeed,
    }));

    if (roomState.winnerId) {
      get().addLog(`🏆 ПОБЕДА! Игрок ${roomState.winnerId.substring(0, 4).toUpperCase()} достиг цели!`, 'success');
      triggerHaptic('notification', 'success');
    }
  },

  handleDiceRollResult: (playerId, diceValue, newPosition) => {
    const { player, players } = get();
    const cell = GAME_MAP.find((c) => c.id === newPosition) ?? null;

    if (playerId === player.id) {
      set({
        lastDiceRoll: diceValue,
        player: { ...player, position: newPosition },
        hasRolledThisTurn: true,
        currentEvent: cell,
      });

      const encounter = resolveRandomEncounter();
      if (encounter !== null) {
        if (encounter.type === 'fine') {
          set((s) => ({ player: { ...s.player, balance: Decimal.max(0, new Decimal(s.player.balance).sub(encounter.amount)).toFixed(0) } }));
          get().addLog(`🚓 ГАИ! Товарищ лейтенант углядел тонировку. Штраф: $${encounter.amount}`, 'error');
          triggerHaptic('notification', 'error');
        } else {
          set((s) => ({ player: { ...s.player, balance: new Decimal(s.player.balance).add(encounter.amount).toFixed(0) } }));
          get().addLog(`🍀 Удача! Перекупская чуйка не подвела — нашел заначку в бардачке: +$${encounter.amount}`, 'success');
          triggerHaptic('notification', 'success');
        }
      }

      get().executeCellAction(cell);
    } else {
      set({
        players: players.map((p) => p.id === playerId ? { ...p, position: newPosition } : p),
        remoteAnimation: { playerId, diceValue, fromPosition: players.find((p) => p.id === playerId)?.position ?? 0 },
      });
    }
  },

  handleRemoteAction: (data) => {
    switch (data.action) {
      case 'buyCar':
        set((s) => ({ market: s.market.filter((c) => c.id !== data.payload) }));
        break;

      case 'manualMove': {
        const { playerId, payload } = data;
        const { steps, newPosition } = payload;
        set((s) => ({
          players: s.players.map((p) => p.id === playerId ? { ...p, position: newPosition } : p),
          remoteAnimation: { playerId, diceValue: steps, fromPosition: s.players.find((p) => p.id === playerId)?.position ?? 0 },
        }));
        get().addLog(`Игрок ${playerId.substring(0, 4).toUpperCase()} сделал тактический ход.`, 'info');
        break;
      }

      case 'newsUpdate':
        set({ activeEvent: data.payload });
        get().addLog(`📰 ${data.payload.title}`, 'info');
        break;

      case 'victory':
        set({ winnerId: data.playerId });
        get().addLog(`🏆 Игрок ${data.playerId.substring(0, 4).toUpperCase()} победил!`, 'success');
        triggerHaptic('notification', 'success');
        break;

      case 'loanOffer':
        get().addLog(`💸 ${data.playerId.substring(0, 4).toUpperCase()} разместил кредитный оффер на $${data.payload.amount}`, 'info');
        break;

      case 'loanAccepted':
        get().addLog(`🤝 Займ подписан! Тачка под залогом.`, 'info');
        triggerHaptic('notification', 'success');
        break;

      case 'repayDebt':
        get().addLog(`✅ Долг погашен — залог освобождён!`, 'success');
        break;

      case 'confiscateCar':
        get().addLog(`🚨 Машина конфискована по долгу!`, 'error');
        triggerHaptic('notification', 'error');
        break;

      case 'raceChallengeInitiated':
        get().addLog(`🏎️ ${data.payload.initiatorId.substring(0, 4).toUpperCase()} вызвал ${data.payload.targetId.substring(0, 4).toUpperCase()} на дуэль! Ставка: $${data.payload.bet}`, 'info');
        break;

      case 'raceAccept':
        get().addLog(`🏁 Вызов принят! Гонка начинается...`, 'info');
        break;

      case 'raceDecline':
        set({ activeRace: null, pendingRaceChallenge: null });
        get().addLog(`❌ Гонка отклонена. Трус!`, 'info');
        break;

      case 'raceResults': {
        const { winnerId, loserId, bet, logs } = data.payload;
        const myId = get().player.id;
        logs.forEach((l) => get().addLog(l, 'info'));
        if (winnerId === myId) {
          get().addLog(`🏆 ВЫ ВЫИГРАЛИ гонку! +$${bet}`, 'success');
          triggerHaptic('notification', 'success');
        } else if (loserId === myId) {
          get().addLog(`💀 Проиграли гонку. -$${bet}`, 'error');
          triggerHaptic('notification', 'error');
        }
        set({ pendingRaceChallenge: null });
        break;
      }

      default:
        break;
    }
  },

  passTurn: () => {
    const { roomId, player, players, currentTurnIndex, totalTurns } = get();
    if (!roomId) {
      const nextTurns = (totalTurns || 0) + 1;
      set({ totalTurns: nextTurns, hasRolledThisTurn: false });
      if (nextTurns % 5 === 0) {
        get().addLog('--- НОВЫЙ ДЕНЬ НА РЫНКЕ ---', 'info');
        get().updateNews();
      }
      return;
    }

    const currentPlayer = players[currentTurnIndex];
    if (currentPlayer?.id !== player.id) { get().addLog('Сейчас не ваш ход!', 'error'); return; }

    // News selection in multiplayer is handled server-side by Smart Event Director.
    socket.emit('pass_turn', { roomId, playerId: player.id });
  },

  offerLoan: (amount, interestPct, turns) => {
    const { player, roomId } = get();
    if (!roomId) { get().addLog('Кредиты доступны только в мультиплеере!', 'error'); return; }
    const interest = new Decimal(amount).mul(interestPct / 100).toFixed(0);
    const totalToPay = new Decimal(amount).add(interest).toFixed(0);
    const debt: Debt = {
      id: Math.random().toString(36).substring(2, 9),
      lenderId: player.id,
      amount,
      interest,
      totalToPay,
      turnsLeft: turns,
      initialTurns: turns,
      status: 'pending',
    };
    socket.emit('sync_action', { roomId, playerId: player.id, action: 'loanOffer', payload: debt });
    get().addLog(`Оффер размещён: $${amount} под ${interestPct}% на ${turns} ходов.`, 'success');
    triggerHaptic('impact', 'medium');
  },

  acceptLoan: (debtId, collateralCarId) => {
    const { player, roomId, activeDebts } = get();
    if (!roomId) { get().addLog('Займы доступны только в мультиплеере!', 'error'); return; }
    const debt = activeDebts.find((d) => d.id === debtId);
    if (!debt) { get().addLog('Оффер не найден.', 'error'); return; }
    const fullDebt: Debt = { ...debt, borrowerId: player.id, collateralCarId, status: 'active' };
    socket.emit('sync_action', { roomId, playerId: player.id, action: 'loanAccepted', payload: fullDebt });
    get().addLog('Займ принят! Твоя тачка теперь в залоге. Не косячь.', 'info');
    triggerHaptic('notification', 'success');
  },

  repayDebt: (debtId) => {
    const { player, roomId } = get();
    if (!roomId) return;
    socket.emit('sync_action', { roomId, playerId: player.id, action: 'repayDebt', payload: debtId });
    get().addLog('Отправлен запрос на погашение долга.', 'info');
    triggerHaptic('impact', 'medium');
  },

  initiateRaceDuel: (targetId, bet) => {
    const { player, roomId, garage } = get();
    if (!roomId) { get().addLog('Гонки только в мультиплеере!', 'error'); return; }
    if (garage.length === 0) { get().addLog('Нужна хотя бы одна машина в гараже!', 'error'); return; }
    const maxBet = Math.floor(new Decimal(player.balance).div(2).toNumber());
    if (bet > maxBet) { get().addLog(`Максимальная ставка — половина баланса ($${maxBet})!`, 'error'); return; }
    socket.emit('sync_action', { roomId, playerId: player.id, action: 'raceChallengeInitiated', payload: { initiatorId: player.id, targetId, bet } });
    get().addLog(`Вызов брошен ${targetId.substring(0, 4).toUpperCase()}! Ставка $${bet}. Ждём ответа...`, 'info');
    triggerHaptic('impact', 'heavy');
  },

  acceptRaceDuel: (initiatorId) => {
    const { player, roomId } = get();
    if (!roomId) return;
    socket.emit('sync_action', { roomId, playerId: player.id, action: 'raceAccept', payload: { initiatorId } });
    set({ pendingRaceChallenge: null });
    get().addLog('Вызов принят! ПОЕХАЛИ!', 'success');
    triggerHaptic('impact', 'heavy');
  },

  declineRaceDuel: (initiatorId) => {
    const { player, roomId } = get();
    if (!roomId) return;
    socket.emit('sync_action', { roomId, playerId: player.id, action: 'raceDecline', payload: { initiatorId } });
    set({ pendingRaceChallenge: null, activeRace: null });
    get().addLog('Ты слился. Честно.', 'info');
  },
});

