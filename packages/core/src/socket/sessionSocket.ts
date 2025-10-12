import { io, Socket } from 'socket.io-client';
import type { Session } from '../types';

export type SessionSocket = {
  subscribe: (sessionId: string, cb: (session: Session | null) => void) => void;
  unsubscribe: (sessionId: string) => void;
  disconnect: () => void;
};

export function createSessionSocket(baseUrl: string): SessionSocket {
  const socket: Socket = io(`${baseUrl}/sessions`, { transports: ['websocket'] });

  const listeners = new Map<string, (session: Session | null) => void>();

  socket.on('session:update', (payload: Session | null) => {
    if (!payload) return;
    const handler = listeners.get(payload.id);
    if (handler) handler(payload);
  });

  return {
    subscribe(sessionId, cb) {
      listeners.set(sessionId, cb);
      socket.emit('session:subscribe', { sessionId });
    },
    unsubscribe(sessionId) {
      listeners.delete(sessionId);
      socket.emit('session:unsubscribe', { sessionId });
    },
    disconnect() {
      socket.disconnect();
      listeners.clear();
    },
  };
}

