import type { Debt, Player, RaceDuel, RoomState, SyncActionPayload } from '@tgperekup/shared';

export interface RemoteAnimationState {
  playerId: string;
  diceValue: number;
  fromPosition: number;
}

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
  /** Set when server sends a pending race challenge targeting THIS player. */
  pendingRaceChallenge: RaceDuel | null;
}

export interface MultiplayerActions {
  createRoom: (winCondition: number) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  syncRoomState: (roomState: RoomState) => void;
  handleDiceRollResult: (playerId: string, diceValue: number, newPosition: number) => void;
  handleRemoteAction: (data: { playerId: string } & SyncActionPayload) => void;
  passTurn: () => void;
  setActiveRace: (race: RaceDuel | null) => void;
  setPendingRaceChallenge: (race: RaceDuel | null) => void;
  setRemoteAnimation: (anim: RemoteAnimationState | null) => void;
  setWinnerId: (id: string | null) => void;
  /** Post a P2P loan offer to the room's offer board. */
  offerLoan: (amount: string, interestPct: number, turns: number) => void;
  /** Accept a pending loan offer using a garage car as collateral. */
  acceptLoan: (debtId: string, collateralCarId: string) => void;
  /** Repay an active debt early. */
  repayDebt: (debtId: string) => void;
  /** Initiate a race duel against a specific opponent. */
  initiateRaceDuel: (targetId: string, bet: number) => void;
  /** Accept an incoming race challenge — server resolves immediately. */
  acceptRaceDuel: (initiatorId: string) => void;
  /** Decline an incoming race challenge. */
  declineRaceDuel: (initiatorId: string) => void;
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
};
