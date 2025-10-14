import type { Session, QuizState } from '@pkg/core';
import { getApiBaseUrl } from './config';

async function request<T>(path: string): Promise<T> {
  const base = await getApiBaseUrl();
  console.log('API Request:', `${base}${path}`);
  const response = await fetch(`${base}${path}`);
  console.log('API Response status:', response.status);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    throw new Error(errorText);
  }
  const data = await response.json();
  console.log('API Response data:', data);
  return data;
}

export async function fetchSessionByCode(code: string) {
  console.log('Fetching sessions, looking for code:', code);
  const sessions = await request<Session[]>('/sessions');
  console.log('All sessions:', sessions);
  const found = sessions.find((session) => session.code.toUpperCase() === code.toUpperCase());
  console.log('Found session:', found);
  return found ?? null;
}

export async function fetchQuizState(sessionId: string) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz`);
}

export async function fetchSessionScores(sessionId: string) {
  try {
    const data = await request<any>(`/sessions/${sessionId}/scores`);
    return data;
  } catch (error) {
    console.error('Failed to fetch scores:', error);
    return { teams: [], players: [] };
  }
}
