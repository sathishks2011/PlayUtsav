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

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

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
  onConnectionChange: (cb: (state: ConnectionState) => void) => void;
  offConnectionChange: (cb: (state: ConnectionState) => void) => void;
  getConnectionState: () => ConnectionState;
  isConnected: () => boolean;
  disconnect: () => void;
  reconnect: () => void;
};

export function createSessionSocket(baseUrl: string): SessionSocket {
  const socket: Socket = io(`${baseUrl}/sessions`, { 
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Prevent unhandled errors from crashing the process
  socket.io.on('error', (error) => {
    console.error('[SessionSocket] Socket.IO engine error:', error);
  });

  // Handle low-level engine errors (TCP, network)
  socket.io.engine.on('error', (error: any) => {
    console.error('[SessionSocket] Engine error:', error.code || error.message);
    // These errors will be handled by reconnection logic, don't crash
  });

  // Catch any other socket errors to prevent process crash
  if (typeof socket.on === 'function') {
    (socket as any).on('error', (error: any) => {
      console.error('[SessionSocket] Socket error:', error);
    });
  }

  const listeners = new Map<string, (session: Session | null) => void>();
  const quizListeners = new Map<string, (state: QuizState | null) => void>();
  const buzzerOpenedListeners = new Map<string, (event: BuzzerOpenedEvent) => void>();
  const buzzerPressedListeners = new Map<string, (event: BuzzerPressedEvent) => void>();
  const buzzerClosedListeners = new Map<string, (event: BuzzerClosedEvent) => void>();
  const buzzerResetListeners = new Map<string, (event: BuzzerResetEvent) => void>();
  const buzzerOverrideListeners = new Map<string, (event: BuzzerOverrideEvent) => void>();
  const connectionChangeListeners = new Set<(state: ConnectionState) => void>();
  
  let connectionState: ConnectionState = 'connecting';
  const subscribedSessions = new Set<string>();

  // Connection state management
  const notifyConnectionChange = (state: ConnectionState) => {
    connectionState = state;
    console.log('[SessionSocket] Connection state changed:', state);
    connectionChangeListeners.forEach(cb => {
      try {
        cb(state);
      } catch (error) {
        console.error('[SessionSocket] Error in connection change listener:', error);
      }
    });
  };

  // Socket.IO connection events
  socket.on('connect', () => {
    console.log('[SessionSocket] Connected to server');
    notifyConnectionChange('connected');
    
    // Resubscribe to all sessions after reconnection
    subscribedSessions.forEach(sessionId => {
      console.log('[SessionSocket] Resubscribing to session:', sessionId);
      try {
        socket.emit('session:subscribe', { sessionId });
      } catch (error) {
        console.error('[SessionSocket] Error resubscribing to session:', sessionId, error);
      }
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('[SessionSocket] Disconnected from server:', reason);
    notifyConnectionChange('disconnected');
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('[SessionSocket] Reconnected after', attemptNumber, 'attempts');
    notifyConnectionChange('connected');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('[SessionSocket] Reconnection attempt:', attemptNumber);
    notifyConnectionChange('reconnecting');
  });

  socket.on('reconnect_error', (error) => {
    console.error('[SessionSocket] Reconnection error:', error);
    notifyConnectionChange('error');
  });

  socket.on('reconnect_failed', () => {
    console.error('[SessionSocket] Reconnection failed');
    notifyConnectionChange('error');
  });

  socket.on('connect_error', (error) => {
    console.error('[SessionSocket] Connection error:', error);
    notifyConnectionChange('error');
  });

  // Session events
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
      console.log('[SessionSocket] Subscribing to session:', sessionId);
      listeners.set(sessionId, cb);
      subscribedSessions.add(sessionId);
      if (socket.connected) {
        socket.emit('session:subscribe', { sessionId });
      }
    },
    unsubscribe(sessionId) {
      console.log('[SessionSocket] Unsubscribing from session:', sessionId);
      listeners.delete(sessionId);
      subscribedSessions.delete(sessionId);
      if (socket.connected) {
        socket.emit('session:unsubscribe', { sessionId });
      }
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
    onConnectionChange(cb) {
      connectionChangeListeners.add(cb);
    },
    offConnectionChange(cb) {
      connectionChangeListeners.delete(cb);
    },
    getConnectionState() {
      return connectionState;
    },
    isConnected() {
      return socket.connected && connectionState === 'connected';
    },
    reconnect() {
      console.log('[SessionSocket] Manual reconnect triggered. Current state:', {
        socketConnected: socket.connected,
        connectionState,
      });
      
      // Always disconnect first to ensure clean reconnection
      if (socket.connected) {
        console.log('[SessionSocket] Disconnecting before reconnect...');
        socket.disconnect();
      }
      
      // Wait a moment then reconnect
      setTimeout(() => {
        console.log('[SessionSocket] Connecting to server...');
        notifyConnectionChange('connecting');
        socket.connect();
      }, 100);
    },
    disconnect() {
      console.log('[SessionSocket] Disconnecting socket');
      socket.disconnect();
      listeners.clear();
      quizListeners.clear();
      buzzerOpenedListeners.clear();
      buzzerPressedListeners.clear();
      buzzerClosedListeners.clear();
      buzzerResetListeners.clear();
      buzzerOverrideListeners.clear();
      subscribedSessions.clear();
      connectionChangeListeners.clear();
    },
  };
}
