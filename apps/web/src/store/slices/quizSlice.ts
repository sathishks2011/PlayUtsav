import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { QuizState, BuzzerPress } from '@pkg/core';
import {
  startQuiz,
  submitQuizAnswer,
  revealQuiz,
  pressBuzzer,
  openBuzzer,
  closeBuzzer,
  resetBuzzer,
  overrideBuzzerControl,
} from '../../lib/api';

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
  async (payload: { sessionId: string; questionId: string; prompt: string; options: string[]; duration?: number }) => {
    const quiz = await startQuiz(payload.sessionId, {
      questionId: payload.questionId,
      prompt: payload.prompt,
      options: payload.options,
      duration: payload.duration,
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

export const pressBuzzerThunk = createAsyncThunk(
  'quiz/buzzerPress',
  async (payload: { sessionId: string; participantId: string }) => {
    const quiz = await pressBuzzer(payload.sessionId, { participantId: payload.participantId });
    return quiz;
  }
);

export const openBuzzerThunk = createAsyncThunk('quiz/buzzerOpen', async (payload: { sessionId: string }) => {
  const quiz = await openBuzzer(payload.sessionId);
  return quiz;
});

export const closeBuzzerThunk = createAsyncThunk('quiz/buzzerClose', async (payload: { sessionId: string }) => {
  const quiz = await closeBuzzer(payload.sessionId);
  return quiz;
});

export const resetBuzzerThunk = createAsyncThunk('quiz/buzzerReset', async (payload: { sessionId: string }) => {
  const quiz = await resetBuzzer(payload.sessionId);
  return quiz;
});

export const overrideBuzzerThunk = createAsyncThunk(
  'quiz/buzzerOverride',
  async (payload: { sessionId: string; participantId: string }) => {
    const quiz = await overrideBuzzerControl(payload.sessionId, { participantId: payload.participantId });
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
    buzzerOpened(state, action: PayloadAction<{ sessionId: string; isOpen: boolean; buzzerOpenedAt: string | null; timerDuration: number }>) {
      if (!state.current || state.current.sessionId !== action.payload.sessionId) return;
      state.current.buzzerState = {
        ...(state.current.buzzerState ?? {
          buzzPresses: [],
        }),
        isOpen: action.payload.isOpen,
        buzzerOpenedAt: action.payload.buzzerOpenedAt ?? undefined,
        timerDuration: action.payload.timerDuration,
      };
    },
    buzzerPressed(
      state,
      action: PayloadAction<{
        sessionId: string;
        buzzerPress: BuzzerPress;
        buzzPresses: BuzzerPress[];
        firstBuzzerId: string | null | undefined;
        lockedForParticipantId: string | null | undefined;
        isOpen: boolean;
      }>
    ) {
      if (!state.current || state.current.sessionId !== action.payload.sessionId) return;
      state.current.buzzerState = {
        ...(state.current.buzzerState ?? { timerDuration: 30 }),
        isOpen: action.payload.isOpen,
        buzzPresses: action.payload.buzzPresses,
        firstBuzzerId: action.payload.firstBuzzerId ?? state.current.buzzerState?.firstBuzzerId,
        lockedForParticipantId: action.payload.lockedForParticipantId ?? null,
        buzzerOpenedAt: state.current.buzzerState?.buzzerOpenedAt,
        timerDuration: state.current.buzzerState?.timerDuration ?? 30,
      };
    },
    buzzerClosed(state, action: PayloadAction<{ sessionId: string; lockedForParticipantId: string | null }>) {
      if (!state.current || state.current.sessionId !== action.payload.sessionId) return;
      if (!state.current.buzzerState) return;
      state.current.buzzerState.isOpen = false;
      state.current.buzzerState.lockedForParticipantId = action.payload.lockedForParticipantId;
    },
    buzzerReset(state, action: PayloadAction<{ sessionId: string }>) {
      if (!state.current || state.current.sessionId !== action.payload.sessionId) return;
      state.current.buzzerState = {
        isOpen: false,
        buzzPresses: [],
        firstBuzzerId: undefined,
        lockedForParticipantId: null,
        buzzerOpenedAt: undefined,
        timerDuration: state.current.buzzerState?.timerDuration ?? 30,
      };
    },
    buzzerOverride(state, action: PayloadAction<{ sessionId: string; lockedForParticipantId: string | null }>) {
      if (!state.current || state.current.sessionId !== action.payload.sessionId) return;
      if (!state.current.buzzerState) return;
      state.current.buzzerState.lockedForParticipantId = action.payload.lockedForParticipantId;
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
        if (action.payload) state.current = action.payload;
        state.lastAction = 'submit';
      })
      .addCase(submitQuizAnswerThunk.rejected, (state, action) => {
        state.error = action.error.message;
      })
      .addCase(revealQuizThunk.fulfilled, (state, action) => {
        if (action.payload) state.current = action.payload;
        state.lastAction = 'reveal';
      })
      .addCase(revealQuizThunk.rejected, (state, action) => {
        state.error = action.error.message;
      })
      .addCase(pressBuzzerThunk.fulfilled, (state, action) => {
        if (action.payload) state.current = action.payload;
      })
      .addCase(openBuzzerThunk.fulfilled, (state, action) => {
        if (action.payload) state.current = action.payload;
      })
      .addCase(closeBuzzerThunk.fulfilled, (state, action) => {
        if (action.payload) state.current = action.payload;
      })
      .addCase(resetBuzzerThunk.fulfilled, (state, action) => {
        if (action.payload) state.current = action.payload;
      })
      .addCase(overrideBuzzerThunk.fulfilled, (state, action) => {
        if (action.payload) state.current = action.payload;
      });
  },
});

export const { setQuizState, clearQuiz, buzzerOpened, buzzerPressed, buzzerClosed, buzzerReset, buzzerOverride } = quizSlice.actions;
export default quizSlice.reducer;
