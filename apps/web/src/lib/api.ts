import {
  transformSession,
  type Session,
  type Team,
  type QuizState,
  type QuizTemplateDTO,
  type QuizTemplateResponse,
  type UpdateQuestionDTO,
  type QuestionResponse,
  type CategoryResponse,
  type RoundInfo,
} from '@pkg/core';
import { getApiBaseUrl } from './config';

export { transformSession };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await getApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    const err: any = new Error(text || response.statusText);
    err.status = response.status;
    err.body = text;
    throw err;
  }
  return response.json();
}

export async function listSessions(): Promise<Session[]> {
  const sessions = await request<any[]>('/sessions');
  return sessions.map(transformSession);
}

export async function getSessionById(sessionId: string): Promise<Session> {
  const session = await request<any>(`/sessions/${sessionId}`);
  return transformSession(session);
}

export function deleteSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  return request(`/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export function restoreSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  return request(`/sessions/${sessionId}/restore`, {
    method: 'PUT',
  });
}

export function resetAllGames(sessionId: string): Promise<{ success: boolean }> {
  return request(`/sessions/${sessionId}/reset-all`, {
    method: 'POST',
  });
}

export function listDeletedSessions(): Promise<Session[]> {
  return request('/sessions/deleted/list');
}

export async function createSession(payload: { hostName?: string; maxPlayers?: number; language?: string; playerEngagementType?: string }) {
  const session = await request<any>('/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return transformSession(session);
}

export async function joinSession(payload: { code: string; displayName: string }) {
  const result = await request<{ session: any; participant: { id: string } }>('/sessions/join', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    session: transformSession(result.session),
    participant: result.participant
  };
}

export function addTeam(sessionId: string, payload: { name: string; color?: string }) {
  return request<Team>(`/sessions/${sessionId}/teams`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function removeParticipant(sessionId: string, participantId: string) {
  return request<{ success: boolean }>(`/sessions/${sessionId}/participants/${participantId}/remove`, {
    method: 'POST',
  });
}

export function assignParticipantToTeam(sessionId: string, participantId: string, teamId: string | null) {
  return request<{ success: boolean }>(`/sessions/${sessionId}/participants/${participantId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ teamId }),
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

// Buzzer mode API helpers
export function pressBuzzer(sessionId: string, payload: { participantId: string }) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz/buzzer/press`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function openBuzzer(sessionId: string) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz/buzzer/open`, {
    method: 'POST',
  });
}

export function closeBuzzer(sessionId: string) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz/buzzer/close`, {
    method: 'POST',
  });
}

export function resetBuzzer(sessionId: string) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz/buzzer/reset`, {
    method: 'POST',
  });
}

export function overrideBuzzerControl(sessionId: string, payload: { participantId: string }) {
  return request<QuizState | null>(`/sessions/${sessionId}/quiz/buzzer/override`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Bioscope Buzzer API
export function openBioscopeBuzzer(sessionId: string) {
  return request(`/sessions/${sessionId}/bioscope/buzzer/open`, {
    method: 'POST',
  });
}

export function closeBioscopeBuzzer(sessionId: string) {
  return request(`/sessions/${sessionId}/bioscope/buzzer/close`, {
    method: 'POST',
  });
}

export function resetBioscopeBuzzer(sessionId: string) {
  return request(`/sessions/${sessionId}/bioscope/buzzer/reset`, {
    method: 'POST',
  });
}

export function pressBioscopeBuzzer(sessionId: string, participantId: string) {
  return request(`/sessions/${sessionId}/bioscope/buzzer/press`, {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  });
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

// Quiz Template API
export function uploadQuizTemplate(template: QuizTemplateDTO) {
  return request<QuizTemplateResponse>('/quiz-templates', {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

export function listQuizTemplates() {
  return request<QuizTemplateResponse[]>('/quiz-templates');
}

export function getQuizTemplate(templateId: string) {
  return request<QuizTemplateResponse>(`/quiz-templates/${templateId}`);
}

export function updateQuizQuestion(questionId: string, data: UpdateQuestionDTO) {
  return request<QuestionResponse>(`/quiz-templates/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteQuizTemplate(templateId: string) {
  return request<void>(`/quiz-templates/${templateId}`, {
    method: 'DELETE',
  });
}

export function deleteBioscopeTemplate(templateId: string, hostId?: string) {
  const queryParam = hostId ? `?hostId=${encodeURIComponent(hostId)}` : '';
  return request<void>(`/bioscope/templates/${templateId}${queryParam}`, {
    method: 'DELETE',
  });
}

export function getQuestionsByCategory(categoryId: string) {
  return request<QuestionResponse[]>(`/quiz-templates/categories/${categoryId}/questions`);
}

// Session-Template Integration API
export async function attachQuizTemplate(sessionId: string, templateId: string) {
  const session = await request<any>(`/sessions/${sessionId}/attach-template`, {
    method: 'POST',
    body: JSON.stringify({ templateId }),
  });
  return transformSession(session);
}

export async function attachBioscopeTemplate(sessionId: string, templateId: string) {
  const result = await request<any>(`/bioscope/templates/${templateId}/attach`, {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
  // Fetch the updated session to get the complete data
  return getSessionById(sessionId);
}

export async function resetBioscopeGame(sessionId: string) {
  await request<any>(`/bioscope/sessions/${sessionId}/reset`, {
    method: 'POST',
  });
  // Fetch the updated session to get the complete data
  return getSessionById(sessionId);
}

export function updateRound(sessionId: string, categoryIndex: number, questionIndex: number) {
  return request<Session>(`/sessions/${sessionId}/round`, {
    method: 'POST',
    body: JSON.stringify({ categoryIndex, questionIndex }),
  });
}

export function getRoundQuestions(sessionId: string) {
  return request<{
    session: { id: string; currentCategoryIndex: number; currentQuestionIndex: number };
    template: { id: string; name: string };
    currentCategory: { id: string; name: string; displayOrder: number };
    questions: QuestionResponse[];
    totalCategories: number;
  }>(`/sessions/${sessionId}/round/questions`);
}

export function advanceToNextRound(sessionId: string) {
  return request<{
    currentCategoryIndex: number;
    currentQuestionIndex: number;
    totalCategories: number;
    isComplete: boolean;
  }>(`/sessions/${sessionId}/round/next`, {
    method: 'PUT',
  });
}

export function advanceToPreviousRound(sessionId: string) {
  return request<{
    currentCategoryIndex: number;
    currentQuestionIndex: number;
    totalCategories: number;
    isComplete: boolean;
  }>(`/sessions/${sessionId}/round/previous`, {
    method: 'PUT',
  });
}
