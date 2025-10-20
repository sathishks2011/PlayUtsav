import { transformSession, type Session, type QuizState } from '@pkg/core';
import { getApiBaseUrl } from './config';

async function request<T>(path: string): Promise<T> {
  const base = await getApiBaseUrl();
  const url = `${base}${path}`;
  console.log('[TV API] Request:', url);
  const response = await fetch(url);
  console.log('[TV API] Response status:', response.status);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[TV API] Error body:', errorText);
    throw new Error(errorText);
  }
  const data = await response.json();
  console.log('[TV API] Response data:', data);
  return data;
}

export async function fetchSessionByCode(code: string) {
  console.log('[TV API] Fetching sessions, looking for code:', code);
  const sessions = await request<any[]>('/sessions');
  const transformed = sessions.map((session) => transformSession(session));
  const found = transformed.find((session) => session.code.toUpperCase() === code.toUpperCase());
  console.log('[TV API] Session match:', found);
  return found ?? null;
}

export async function fetchQuizState(sessionId: string) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz`);
}

export async function fetchBioscopeState(sessionId: string) {
  return request<any>(`/bioscope/sessions/${sessionId}/state`);
}

export async function fetchSessionScores(sessionId: string) {
  try {
    return await request<any>(`/sessions/${sessionId}/scores`);
  } catch (error) {
    console.error('[TV API] Failed to fetch scores:', error);
    return { teams: [], players: [] };
  }
}
