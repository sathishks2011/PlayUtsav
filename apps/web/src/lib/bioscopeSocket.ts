import { io, Socket } from 'socket.io-client';
import { getWebSocketBaseUrl } from './config';

export type BioscopeGameState = {
  bioscopeId: string;
  sessionId: string;
  templateId: string;
  currentRoundId: number;
  currentImageId: number;
  status: 'idle' | 'revealing' | 'answering' | 'revealed' | 'completed';
  revealedImages: number[];
  timerStartedAt: string | null;
  timerDuration: number;
  timeRemaining: number | null;
  template: {
    name: string;
    configuration: any;
    currentRound: any | null;
  };
  answers: any[];
};

export type BioscopeSocket = {
  subscribe: (sessionId: string) => void;
  unsubscribe: (sessionId: string) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb?: (...args: unknown[]) => void) => void;
  disconnect: () => void;
  isConnected: () => boolean;
};

let bioscopeSocketPromise: Promise<BioscopeSocket> | null = null;

export async function getBioscopeSocket(): Promise<BioscopeSocket> {
  if (!bioscopeSocketPromise) {
    bioscopeSocketPromise = getWebSocketBaseUrl().then((baseUrl) => {
      const socket: Socket = io(`${baseUrl}/bioscope`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      // Error handling
      socket.io.on('error', (error) => {
        console.error('[BioscopeSocket] Socket.IO engine error:', error);
      });

      socket.io.engine.on('error', (error: any) => {
        console.error('[BioscopeSocket] Engine error:', error.code || error.message);
      });

      socket.on('error', (error) => {
        console.error('[BioscopeSocket] Socket error:', error);
      });

      // Connection events
      socket.on('connect', () => {
        console.log('[BioscopeSocket] Connected to server');
      });

      socket.on('disconnect', (reason) => {
        console.log('[BioscopeSocket] Disconnected from server:', reason);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('[BioscopeSocket] Reconnected after', attemptNumber, 'attempts');
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('[BioscopeSocket] Reconnection attempt:', attemptNumber);
      });

      socket.on('reconnect_error', (error) => {
        console.error('[BioscopeSocket] Reconnection error:', error);
      });

      socket.on('reconnect_failed', () => {
        console.error('[BioscopeSocket] Reconnection failed');
      });

      socket.on('connect_error', (error) => {
        console.error('[BioscopeSocket] Connection error:', error);
      });

      return {
        subscribe: (sessionId: string) => {
          console.log('[BioscopeSocket] Subscribing to session:', sessionId);
          socket.emit('bioscope:subscribe', { sessionId });
        },

        unsubscribe: (sessionId: string) => {
          console.log('[BioscopeSocket] Unsubscribing from session:', sessionId);
          socket.emit('bioscope:unsubscribe', { sessionId });
        },

        on: (event: string, cb: (...args: unknown[]) => void) => {
          socket.on(event, cb);
        },

        off: (event: string, cb?: (...args: unknown[]) => void) => {
          if (cb) {
            socket.off(event, cb);
          } else {
            socket.off(event);
          }
        },

        disconnect: () => {
          socket.disconnect();
        },

        isConnected: () => socket.connected,
      };
    });
  }

  return bioscopeSocketPromise;
}

// Reset the socket connection (useful for testing or forcing reconnection)
export function resetBioscopeSocket() {
  if (bioscopeSocketPromise) {
    bioscopeSocketPromise.then((socket) => socket.disconnect());
    bioscopeSocketPromise = null;
  }
}
