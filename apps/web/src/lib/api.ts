import type { Session, Team, QuizState } from '@pkg/core';
import { getApiBaseUrl } from './config';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await getApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
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

export function startQuiz(
  sessionId: string,
  payload: { questionId: string; prompt: string; options: string[]; duration?: number }
) {
  return request<QuizState>(`/sessions/${sessionId}/quiz/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitQuizAnswer(
  sessionId: string,
  payload: { participantId: string; answer: number }
) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function revealQuiz(
  sessionId: string,
  payload: { correctOption: number | null; awards?: { teamId: string; delta: number; reason?: string }[] }
) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz/reveal`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchQuiz(sessionId: string) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz`);
}

// Auth API
export type User = {
  id: string;
  email: string;
  role: 'ADMIN' | 'HOST';
  displayName: string | null;
  hostProfile?: {
    id: string;
    organization: string | null;
    contactEmail: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export function signup(payload: {
  email: string;
  password: string;
  displayName?: string;
  organization?: string;
  contactEmail?: string;
}) {
  return request<User>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload: { email: string; password: string }) {
  return request<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return request<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export function getProfile() {
  return request<User | null>('/auth/me');
}
