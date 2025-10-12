import type { Session, Team } from '@pkg/core';
import { getApiBaseUrl } from './config';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await getApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  return response.json();
}

export function listSessions(): Promise<Session[]> {
  return request('/sessions');
}

export function createSession(payload: { hostName?: string; maxPlayers?: number; language?: string }) {
  return request<Session>('/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function joinSession(payload: { code: string; displayName: string }) {
  return request<{ session: Session; participant: { id: string } }>('/sessions/join', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addTeam(sessionId: string, payload: { name: string; color?: string }) {
  return request<Team>(`/sessions/${sessionId}/teams`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

