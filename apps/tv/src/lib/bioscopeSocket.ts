import { io } from 'socket.io-client';
import { getApiBaseUrl } from './config';

export type BioscopeStatus = 'idle' | 'active' | 'revealing' | 'answering' | 'revealed' | 'completed';

export type BioscopeImage = {
  id?: string;
  file?: string;
  hint?: string;
  points_multiplier?: number;
};

export type BioscopeAnswer = {
  title: string;
  alternatives?: string[];
  reveal_sound?: string;
  reveal_effect?: string;
};

export type BioscopeRound = {
  round_id?: string;
  title?: string;
  images?: BioscopeImage[];
  answer?: BioscopeAnswer;
  scoring?: Record<string, unknown>;
};

export type BioscopeTemplateState = {
  name?: string;
  configuration?: Record<string, unknown>;
  currentRound?: BioscopeRound | null;
};

export type BioscopePlayerAnswer = {
  participantId: string;
  participantName: string;
  answer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  submittedAt: string;
  imageRevealedAt: number;
};

export type BioscopeGameState = {
  bioscopeId: string;
  sessionId: string;
  templateId: string;
  currentRoundId: number;
  currentImageId: number;
  status: BioscopeStatus;
  revealedImages: Array<number | string>;
  timerStartedAt: string | null;
  timerDuration: number;
  timeRemaining: number | null;
  template?: BioscopeTemplateState;
  answers?: BioscopePlayerAnswer[];
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
    bioscopeSocketPromise = getApiBaseUrl().then((baseUrl) => {
      const socket = io(`${baseUrl}/bioscope`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      socket.io.on('error', (error: any) => {
        console.error('[BioscopeSocket] Socket.IO engine error:', error);
      });

      socket.on('connect', () => {
        console.log('[BioscopeSocket] Connected to bioscope namespace');
      });

      socket.on('disconnect', (reason: any) => {
        console.log('[BioscopeSocket] Disconnected from bioscope namespace:', reason);
      });

      return {
        subscribe(sessionId: string) {
          console.log('[BioscopeSocket] Subscribing to session:', sessionId);
          socket.emit('bioscope:subscribe', { sessionId });
        },

        unsubscribe(sessionId: string) {
          console.log('[BioscopeSocket] Unsubscribing from session:', sessionId);
          socket.emit('bioscope:unsubscribe', { sessionId });
        },

        on(event: string, cb: (...args: unknown[]) => void) {
          socket.on(event, cb);
        },

        off(event: string, cb?: (...args: unknown[]) => void) {
          if (cb) {
            socket.off(event, cb);
          } else {
            socket.off(event);
          }
        },

        disconnect() {
          socket.disconnect();
        },

        isConnected() {
          return socket.connected;
        },
      };
    });
  }

  return bioscopeSocketPromise;
}

export function resetBioscopeSocket() {
  if (bioscopeSocketPromise) {
    bioscopeSocketPromise.then((socket) => socket.disconnect());
    bioscopeSocketPromise = null;
  }
}
