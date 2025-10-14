import { io, Socket } from 'socket.io-client';
import type { Session, QuizState, BuzzerState } from '../types';

export type BuzzerOpenedEvent = {
  sessionId: string;
  buzzerState: {
    isOpen: boolean;
    buzzerOpenedAt: string | null;
    timerDuration: number;
  };
  timestamp: string;
};

export type BuzzerPressedEvent = {
  sessionId: string;
  buzzerPress: {
    participantId: string;
    participantName: string;
    teamId: string | null;
    teamName: string | null;
    teamColor: string | null;
    timestamp: string;
  };
  buzzerState: {
    isOpen: boolean;
    buzzPresses: Array<any>;
    firstBuzzerId: string | null;
    lockedForParticipantId: string | null;
  };
  timestamp: string;
};

export type BuzzerClosedEvent = {
  sessionId: string;
  buzzerState: {
    isOpen: boolean;
    lockedForParticipantId: string | null;
  };
  timestamp: string;
};

export type BuzzerResetEvent = {
  sessionId: string;
  timestamp: string;
};

export type BuzzerOverrideEvent = {
  sessionId: string;
  participantId: string;
  buzzerState: {
    lockedForParticipantId: string | null;
  };
  timestamp: string;
};

export type SessionSocket = {
  subscribe: (sessionId: string, cb: (session: Session | null) => void) => void;
  unsubscribe: (sessionId: string) => void;
  onQuiz: (sessionId: string, cb: (state: QuizState | null) => void) => void;
  offQuiz: (sessionId: string) => void;
  onBuzzerOpened: (sessionId: string, cb: (event: BuzzerOpenedEvent) => void) => void;
  offBuzzerOpened: (sessionId: string) => void;
  onBuzzerPressed: (sessionId: string, cb: (event: BuzzerPressedEvent) => void) => void;
  offBuzzerPressed: (sessionId: string) => void;
  onBuzzerClosed: (sessionId: string, cb: (event: BuzzerClosedEvent) => void) => void;
  offBuzzerClosed: (sessionId: string) => void;
  onBuzzerReset: (sessionId: string, cb: (event: BuzzerResetEvent) => void) => void;
  offBuzzerReset: (sessionId: string) => void;
  onBuzzerOverride: (sessionId: string, cb: (event: BuzzerOverrideEvent) => void) => void;
  offBuzzerOverride: (sessionId: string) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb?: (...args: unknown[]) => void) => void;
  disconnect: () => void;
};

export function createSessionSocket(baseUrl: string): SessionSocket {
  const socket: Socket = io(`${baseUrl}/sessions`, { transports: ['websocket'] });

  const listeners = new Map<string, (session: Session | null) => void>();
  const quizListeners = new Map<string, (state: QuizState | null) => void>();
  const buzzerOpenedListeners = new Map<string, (event: BuzzerOpenedEvent) => void>();
  const buzzerPressedListeners = new Map<string, (event: BuzzerPressedEvent) => void>();
  const buzzerClosedListeners = new Map<string, (event: BuzzerClosedEvent) => void>();
  const buzzerResetListeners = new Map<string, (event: BuzzerResetEvent) => void>();
  const buzzerOverrideListeners = new Map<string, (event: BuzzerOverrideEvent) => void>();

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

  // Buzzer mode events
  socket.on('buzzer:opened', (payload: BuzzerOpenedEvent) => {
    console.log('[SessionSocket] Received buzzer:opened event:', payload);
    const handler = buzzerOpenedListeners.get(payload.sessionId);
    if (handler) handler(payload);
  });

  socket.on('buzzer:pressed', (payload: BuzzerPressedEvent) => {
    console.log('[SessionSocket] Received buzzer:pressed event:', payload);
    const handler = buzzerPressedListeners.get(payload.sessionId);
    if (handler) handler(payload);
  });

  socket.on('buzzer:closed', (payload: BuzzerClosedEvent) => {
    console.log('[SessionSocket] Received buzzer:closed event:', payload);
    const handler = buzzerClosedListeners.get(payload.sessionId);
    if (handler) handler(payload);
  });

  socket.on('buzzer:reset', (payload: BuzzerResetEvent) => {
    console.log('[SessionSocket] Received buzzer:reset event:', payload);
    const handler = buzzerResetListeners.get(payload.sessionId);
    if (handler) handler(payload);
  });

  socket.on('buzzer:override', (payload: BuzzerOverrideEvent) => {
    console.log('[SessionSocket] Received buzzer:override event:', payload);
    const handler = buzzerOverrideListeners.get(payload.sessionId);
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
      console.log('[SessionSocket] Registering quiz listener for session:', sessionId);
      quizListeners.set(sessionId, cb);
    },
    offQuiz(sessionId) {
      console.log('[SessionSocket] Unregistering quiz listener for session:', sessionId);
      quizListeners.delete(sessionId);
    },
    onBuzzerOpened(sessionId, cb) {
      console.log('[SessionSocket] Registering buzzer:opened listener for session:', sessionId);
      buzzerOpenedListeners.set(sessionId, cb);
    },
    offBuzzerOpened(sessionId) {
      console.log('[SessionSocket] Unregistering buzzer:opened listener for session:', sessionId);
      buzzerOpenedListeners.delete(sessionId);
    },
    onBuzzerPressed(sessionId, cb) {
      console.log('[SessionSocket] Registering buzzer:pressed listener for session:', sessionId);
      buzzerPressedListeners.set(sessionId, cb);
    },
    offBuzzerPressed(sessionId) {
      console.log('[SessionSocket] Unregistering buzzer:pressed listener for session:', sessionId);
      buzzerPressedListeners.delete(sessionId);
    },
    onBuzzerClosed(sessionId, cb) {
      console.log('[SessionSocket] Registering buzzer:closed listener for session:', sessionId);
      buzzerClosedListeners.set(sessionId, cb);
    },
    offBuzzerClosed(sessionId) {
      console.log('[SessionSocket] Unregistering buzzer:closed listener for session:', sessionId);
      buzzerClosedListeners.delete(sessionId);
    },
    onBuzzerReset(sessionId, cb) {
      console.log('[SessionSocket] Registering buzzer:reset listener for session:', sessionId);
      buzzerResetListeners.set(sessionId, cb);
    },
    offBuzzerReset(sessionId) {
      console.log('[SessionSocket] Unregistering buzzer:reset listener for session:', sessionId);
      buzzerResetListeners.delete(sessionId);
    },
    onBuzzerOverride(sessionId, cb) {
      console.log('[SessionSocket] Registering buzzer:override listener for session:', sessionId);
      buzzerOverrideListeners.set(sessionId, cb);
    },
    offBuzzerOverride(sessionId) {
      console.log('[SessionSocket] Unregistering buzzer:override listener for session:', sessionId);
      buzzerOverrideListeners.delete(sessionId);
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
      buzzerOpenedListeners.clear();
      buzzerPressedListeners.clear();
      buzzerClosedListeners.clear();
      buzzerResetListeners.clear();
      buzzerOverrideListeners.clear();
    },
  };
}
