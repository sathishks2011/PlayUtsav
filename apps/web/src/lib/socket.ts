import { createSessionSocket, SessionSocket } from '@pkg/core';
import { getWebSocketBaseUrl } from './config';

let sessionSocketPromise: Promise<SessionSocket> | null = null;

export async function getSessionSocket(): Promise<SessionSocket> {
  if (!sessionSocketPromise) {
    sessionSocketPromise = getWebSocketBaseUrl().then((base) => createSessionSocket(base));
  }
  return sessionSocketPromise;
}

