import { io, Socket } from 'socket.io-client';
import type { Session, QuizState } from '../types';

export type SessionSocket = {
  subscribe: (sessionId: string, cb: (session: Session | null) => void) => void;
  unsubscribe: (sessionId: string) => void;
  onQuiz: (sessionId: string, cb: (state: QuizState | null) => void) => void;
  offQuiz: (sessionId: string) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb?: (...args: unknown[]) => void) => void;
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
    console.log('[SessionSocket] Received quiz:update event:', payload);
    if (!payload) {
      console.warn('[SessionSocket] quiz:update payload is null or undefined');
      return;
    }
    const handler = quizListeners.get(payload.sessionId);
    if (handler) {
      console.log('[SessionSocket] Calling quiz handler for session:', payload.sessionId);
      handler(payload);
    } else {
      console.warn('[SessionSocket] No quiz handler registered for session:', payload.sessionId);
      console.log('[SessionSocket] Registered sessions:', Array.from(quizListeners.keys()));
    }
  });

  // Listen for participant removal events (player kicked by host)
  socket.on('participant:removed', (payload: { participantId: string }) => {
    console.log('[SessionSocket] Participant removed event:', payload);
    // This will be handled by custom listeners via the on() method
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
      console.log('[SessionSocket] Registering quiz listener for session:', sessionId);
      quizListeners.set(sessionId, cb);
    },
    offQuiz(sessionId) {
      console.log('[SessionSocket] Unregistering quiz listener for session:', sessionId);
      quizListeners.delete(sessionId);
    },
    on(event, cb) {
      socket.on(event, cb);
    },
    off(event, cb) {
      if (cb) {
        socket.off(event, cb);
      } else {
        socket.off(event);
      }
    },
    disconnect() {
      socket.disconnect();
      listeners.clear();
      quizListeners.clear();
    },
  };
}
