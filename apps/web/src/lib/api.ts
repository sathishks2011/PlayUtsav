import type { 
  Session, 
  Team, 
  QuizState, 
  QuizTemplateDTO, 
  QuizTemplateResponse,
  UpdateQuestionDTO,
  QuestionResponse,
  CategoryResponse,
  RoundInfo
} from '@pkg/core';
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

export function getSessionById(sessionId: string): Promise<Session> {
  return request(`/sessions/${sessionId}`);
}

export function createSession(payload: { hostName?: string; maxPlayers?: number; language?: string; playerEngagementType?: string }) {
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

export function getQuestionsByCategory(categoryId: string) {
  return request<QuestionResponse[]>(`/quiz-templates/categories/${categoryId}/questions`);
}

// Session-Template Integration API
export function attachQuizTemplate(sessionId: string, templateId: string) {
  return request<Session>(`/sessions/${sessionId}/attach-template`, {
    method: 'POST',
    body: JSON.stringify({ templateId }),
  });
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
