import { createSessionSocket, SessionSocket } from '@pkg/core';
import { getApiBaseUrl } from './config';

let sessionSocketPromise: Promise<SessionSocket> | null = null;

export async function getSessionSocket(): Promise<SessionSocket> {
  if (!sessionSocketPromise) {
    sessionSocketPromise = getApiBaseUrl().then((base) => createSessionSocket(base));
  }
  return sessionSocketPromise;
}

