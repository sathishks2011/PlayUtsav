import { io, Socket } from 'socket.io-client';
import type { Session, QuizState } from '../types';

export type SessionSocket = {
  subscribe: (sessionId: string, cb: (session: Session | null) => void) => void;
  unsubscribe: (sessionId: string) => void;
  onQuiz: (sessionId: string, cb: (state: QuizState | null) => void) => void;
  offQuiz: (sessionId: string) => void;
  disconnect: () => void;
};

export function createSessionSocket(baseUrl: string): SessionSocket {
  const socket: Socket = io(`${baseUrl}/sessions`, { transports: ['websocket'] });

  const listeners = new Map<string, (session: Session | null) => void>();
  const quizListeners = new Map<string, (state: QuizState | null) => void>();

  socket.on('session:update', (payload: Session | null) => {
    if (!payload) return;
    const handler = listeners.get(payload.id);
    if (handler) handler(payload);
  });

  socket.on('quiz:update', (payload: QuizState | null) => {
    if (!payload) return;
    const handler = quizListeners.get(payload.sessionId);
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
    onQuiz(sessionId, cb) {
      quizListeners.set(sessionId, cb);
    },
    offQuiz(sessionId) {
      quizListeners.delete(sessionId);
    },
    disconnect() {
      socket.disconnect();
      listeners.clear();
      quizListeners.clear();
    },
  };
}
