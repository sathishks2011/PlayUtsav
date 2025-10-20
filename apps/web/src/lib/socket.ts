import { createSessionSocket, SessionSocket } from '@pkg/core';
import { getWebSocketBaseUrl } from './config';

let sessionSocketPromise: Promise<SessionSocket> | null = null;

export async function getSessionSocket(): Promise<SessionSocket> {
  if (!sessionSocketPromise) {
    sessionSocketPromise = getWebSocketBaseUrl().then((base) => createSessionSocket(base));
  }
  return sessionSocketPromise;
}

// Export bioscope socket
export { getBioscopeSocket, resetBioscopeSocket } from './bioscopeSocket';
export type { BioscopeSocket, BioscopeGameState } from './bioscopeSocket';

