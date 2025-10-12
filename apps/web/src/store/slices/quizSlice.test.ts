import reducer, { setQuizState, clearQuiz, startQuizThunk, submitQuizAnswerThunk, revealQuizThunk } from './quizSlice';
import type { QuizState } from '@pkg/core';

const baseQuiz: QuizState = {
  sessionId: 'session-1',
  questionId: 'q1',
  prompt: 'Prompt',
  options: ['A', 'B'],
  status: 'running',
  correctOption: null,
  answers: [],
};

describe('quizSlice reducer', () => {
  it('sets quiz state', () => {
    const state = reducer(undefined, setQuizState(baseQuiz));
    expect(state.current).toEqual(baseQuiz);
    expect(state.loading).toBe(false);
  });

  it('clears quiz state', () => {
    const state = reducer({ current: baseQuiz, loading: false }, clearQuiz());
    expect(state.current).toBeNull();
  });

  it('handles start fulfilled', () => {
    const state = reducer(undefined, startQuizThunk.fulfilled(baseQuiz, '', { sessionId: 'session-1', questionId: 'q1', prompt: 'Prompt', options: ['A', 'B'] }));
    expect(state.current?.questionId).toBe('q1');
  });

  it('handles submit fulfilled', () => {
    const quizAfter = { ...baseQuiz, answers: [{ participantId: 'p1', answer: 0, displayName: 'Sam' }] };
    const state = reducer(
      { current: baseQuiz, loading: false },
      submitQuizAnswerThunk.fulfilled(quizAfter, '', { sessionId: 'session-1', participantId: 'p1', answer: 0 })
    );
    expect(state.current?.answers).toHaveLength(1);
  });

  it('handles reveal fulfilled', () => {
    const quizAfter = { ...baseQuiz, status: 'revealed' as const, correctOption: 1 };
    const state = reducer(
      { current: baseQuiz, loading: false },
      revealQuizThunk.fulfilled(quizAfter, '', { sessionId: 'session-1', correctOption: 1 })
    );
    expect(state.current?.status).toBe('revealed');
  });
});

