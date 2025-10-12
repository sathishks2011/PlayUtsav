import { createSessionSocket, SessionSocket } from '@pkg/core';
import { getApiBaseUrl } from './config';

let socketPromise: Promise<SessionSocket> | null = null;

export async function getSessionSocket() {
  if (!socketPromise) {
    socketPromise = getApiBaseUrl().then((base) => createSessionSocket(base));
  }
  return socketPromise;
}
