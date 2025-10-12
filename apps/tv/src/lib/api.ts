import type { Session, QuizState } from '@pkg/core';
import { getApiBaseUrl } from './config';

async function request<T>(path: string): Promise<T> {
  const base = await getApiBaseUrl();
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function fetchSessionByCode(code: string) {
  const sessions = await request<Session[]>('/sessions');
  return sessions.find((session) => session.code.toUpperCase() === code.toUpperCase()) ?? null;
}

export async function fetchQuizState(sessionId: string) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz`);
}
