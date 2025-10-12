import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { QuizState } from '@pkg/core';
import { startQuiz, submitQuizAnswer, revealQuiz } from '../../lib/api';

type LocalQuizState = QuizState | null;

type QuizSliceState = {
  current: LocalQuizState;
  error?: string;
  loading: boolean;
  lastAction?: string;
};

const initialState: QuizSliceState = {
  current: null,
  loading: false,
};

export const startQuizThunk = createAsyncThunk(
  'quiz/start',
  async (payload: { sessionId: string; questionId: string; prompt: string; options: string[] }) => {
    const quiz = await startQuiz(payload.sessionId, {
      questionId: payload.questionId,
      prompt: payload.prompt,
      options: payload.options,
    });
    return quiz;
  }
);

export const submitQuizAnswerThunk = createAsyncThunk(
  'quiz/submit',
  async (payload: { sessionId: string; participantId: string; answer: number }) => {
    const quiz = await submitQuizAnswer(payload.sessionId, {
      participantId: payload.participantId,
      answer: payload.answer,
    });
    return quiz;
  }
);

export const revealQuizThunk = createAsyncThunk(
  'quiz/reveal',
  async (payload: { sessionId: string; correctOption: number | null; awards?: { teamId: string; delta: number; reason?: string }[] }) => {
    const quiz = await revealQuiz(payload.sessionId, {
      correctOption: payload.correctOption,
      awards: payload.awards,
    });
    return quiz;
  }
);

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    setQuizState(state, action: PayloadAction<LocalQuizState>) {
      state.current = action.payload;
      state.loading = false;
      state.error = undefined;
    },
    clearQuiz(state) {
      state.current = null;
      state.loading = false;
      state.error = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startQuizThunk.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(startQuizThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
        state.lastAction = 'start';
      })
      .addCase(startQuizThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(submitQuizAnswerThunk.fulfilled, (state, action) => {
        state.current = action.payload;
        state.lastAction = 'submit';
      })
      .addCase(submitQuizAnswerThunk.rejected, (state, action) => {
        state.error = action.error.message;
      })
      .addCase(revealQuizThunk.fulfilled, (state, action) => {
        state.current = action.payload;
        state.lastAction = 'reveal';
      })
      .addCase(revealQuizThunk.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export const { setQuizState, clearQuiz } = quizSlice.actions;
export default quizSlice.reducer;
