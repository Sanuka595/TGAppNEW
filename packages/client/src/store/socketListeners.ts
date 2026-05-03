import { socket } from '../lib/socket';
import { useGameStore } from './gameStore';

let listenersInitialized = false;

export function initSocketListeners(): void {
  if (listenersInitialized) return;

  socket.on('connect', () => {
    const { roomId, joinRoom } = useGameStore.getState();
    if (roomId) joinRoom(roomId);
  });

  socket.on('room_updated', (roomState) => {
    useGameStore.getState().syncRoomState(roomState);
  });

  socket.on('dice_roll_result', ({ playerId, diceValue, newPosition }) => {
    useGameStore.getState().handleDiceRollResult(playerId, diceValue, newPosition);
  });

  socket.on('room_error', (msg) => {
    useGameStore.getState().addLog(`[SERVER ERROR]: ${msg}`, 'error');
  });

  socket.on('sync_action_result', (data) => {
    useGameStore.getState().handleRemoteAction(data);
  });

  listenersInitialized = true;
}
