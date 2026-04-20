import type { Player, Debt, RoomState, SyncActionPayload } from '@tgperekup/shared';

export interface RaceState {
  initiatorId: string;
  participants: string[];
  bet: number;
  startTime: number;
}

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
  activeRace: RaceState | null;
  remoteAnimation: RemoteAnimationState | null;
}

export interface MultiplayerActions {
  /** Create a new room and become the host. */
  createRoom: (winCondition: number) => void;
  /** Join an existing room by its 6-char code. */
  joinRoom: (roomId: string) => void;
  /** Leave the current room and reset multiplayer state. */
  leaveRoom: () => void;
  /** Sync the full room state received from the server. */
  syncRoomState: (roomState: RoomState) => void;
  /** Apply a dice roll result from the server (own or remote player). */
  handleDiceRollResult: (playerId: string, diceValue: number, newPosition: number) => void;
  /** Apply a sync_action broadcast from a remote player. */
  handleRemoteAction: (data: { playerId: string } & SyncActionPayload) => void;
  /** Advance currentTurnIndex to the next player in the room. */
  passTurn: () => void;
  setActiveRace: (race: RaceState | null) => void;
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
};
