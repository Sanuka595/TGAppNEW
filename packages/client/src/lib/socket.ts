import { io } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@tgperekup/shared';

// Singleton — created once, reused across the app.
export const socket = io({ autoConnect: true });

// Re-export the typed socket for use in store and components.
export type AppSocket = typeof socket & {
  on<Ev extends keyof ServerToClientEvents>(
    event: Ev,
    listener: ServerToClientEvents[Ev],
  ): AppSocket;
  emit<Ev extends keyof ClientToServerEvents>(
    event: Ev,
    ...args: Parameters<ClientToServerEvents[Ev]>
  ): AppSocket;
};

export const typedSocket = socket as unknown as AppSocket;
