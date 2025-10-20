import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Bioscope Types
export interface BioscopeImage {
  id: string;
  file: string;
  hint?: string;
  points_multiplier?: number;
}

export interface BioscopeAnswer {
  title: string;
  alternatives?: string[];
  reveal_sound?: string;
  reveal_effect?: string;
}

export interface BioscopeScoring {
  base_points?: number;
  early_bonus?: number;
  final_image_points?: number;
}

export interface BioscopeRound {
  round_id: string;
  title: string;
  images: BioscopeImage[];
  answer: BioscopeAnswer;
  scoring?: BioscopeScoring;
}

export interface BioscopeConfiguration {
  timer_seconds?: number;
  timer_sound_enabled?: boolean;
  multiple_choice_mode?: boolean;
  allow_manual_scoring?: boolean;
  max_images?: number;
  sound_effects?: {
    on_image_reveal?: string;
    on_final_reveal?: string;
    on_correct_answer?: string;
  };
  reveal_animation?: string;
  title_reveal_animation?: string;
}

export interface BioscopeTemplate {
  id: string;
  name: string;
  description?: string;
  configuration: BioscopeConfiguration;
  rounds: BioscopeRound[];
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BioscopePlayerAnswer {
  participantId: string;
  participantName: string;
  answer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  submittedAt: string;
  imageRevealedAt: number;
}

export interface BioscopeBuzzerState {
  isOpen: boolean;
  lockedForParticipantId: string | null;
  pressedBy: {
    participantId: string;
    displayName: string;
    teamId: string | null;
    teamName: string | null;
    pressedAt: string;
  } | null;
}

export interface BioscopeGameState {
  bioscopeId: string;
  sessionId: string;
  templateId: string;
  currentRoundId: number;
  currentImageId: number;
  status: 'idle' | 'revealing' | 'answering' | 'revealed' | 'completed';
  revealedImages: number[];
  timerStartedAt: string | null;
  timerDuration: number;
  timeRemaining: number | null;
  template: {
    name: string;
    configuration: BioscopeConfiguration;
    currentRound: BioscopeRound | null;
  };
  answers: BioscopePlayerAnswer[];
}

interface BioscopeSliceState {
  templates: BioscopeTemplate[];
  selectedTemplate: BioscopeTemplate | null;
  currentGame: BioscopeGameState | null;
  buzzer: BioscopeBuzzerState;
  loading: boolean;
  error?: string;
  lastAction?: string;
}

const initialState: BioscopeSliceState = {
  templates: [],
  selectedTemplate: null,
  currentGame: null,
  buzzer: {
    isOpen: false,
    lockedForParticipantId: null,
    pressedBy: null,
  },
  loading: false,
};

// Async Thunks
export const fetchBioscopeTemplates = createAsyncThunk(
  'bioscope/fetchTemplates',
  async (payload: { hostId?: string; includePublic?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (payload.hostId) queryParams.append('hostId', payload.hostId);
    if (payload.includePublic !== undefined) queryParams.append('includePublic', String(payload.includePublic));
    
    const response = await fetch(`/api/bioscope/templates?${queryParams.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  }
);

export const createBioscopeTemplate = createAsyncThunk(
  'bioscope/createTemplate',
  async (payload: { template: Omit<BioscopeTemplate, 'id' | 'createdAt' | 'updatedAt'>; hostId?: string }) => {
    const response = await fetch('/api/bioscope/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload.template, hostId: payload.hostId }),
    });
    if (!response.ok) throw new Error('Failed to create template');
    return response.json();
  }
);

export const startBioscopeGame = createAsyncThunk(
  'bioscope/startGame',
  async (payload: { sessionId: string; templateId: string }) => {
    const response = await fetch(`/api/bioscope/sessions/${payload.sessionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: payload.templateId }),
    });
    if (!response.ok) throw new Error('Failed to start game');
    return response.json();
  }
);

export const revealBioscopeImage = createAsyncThunk(
  'bioscope/revealImage',
  async (payload: { sessionId: string; imageId?: number }) => {
    const response = await fetch(`/api/bioscope/sessions/${payload.sessionId}/reveal-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId: payload.imageId }),
    });
    if (!response.ok) throw new Error('Failed to reveal image');
    return response.json();
  }
);

export const revealBioscopeAnswer = createAsyncThunk(
  'bioscope/revealAnswer',
  async (payload: { sessionId: string }) => {
    const response = await fetch(`/api/bioscope/sessions/${payload.sessionId}/reveal-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to reveal answer');
    return response.json();
  }
);

export const submitBioscopeAnswer = createAsyncThunk(
  'bioscope/submitAnswer',
  async (payload: { sessionId: string; participantId: string; participantName: string; answer: string }) => {
    const response = await fetch(`/api/bioscope/sessions/${payload.sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: payload.participantId,
        participantName: payload.participantName,
        answer: payload.answer,
      }),
    });
    if (!response.ok) throw new Error('Failed to submit answer');
    return response.json();
  }
);

export const awardManualScore = createAsyncThunk(
  'bioscope/manualScore',
  async (payload: { sessionId: string; participantId: string; participantName: string; points: number; reason?: string }) => {
    const response = await fetch(`/api/bioscope/sessions/${payload.sessionId}/manual-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: payload.participantId,
        participantName: payload.participantName,
        points: payload.points,
        reason: payload.reason,
      }),
    });
    if (!response.ok) throw new Error('Failed to award manual score');
    return response.json();
  }
);

export const nextBioscopeRound = createAsyncThunk(
  'bioscope/nextRound',
  async (payload: { sessionId: string }) => {
    const response = await fetch(`/api/bioscope/sessions/${payload.sessionId}/next-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to move to next round');
    return response.json();
  }
);

export const fetchBioscopeGameState = createAsyncThunk(
  'bioscope/fetchGameState',
  async (payload: { sessionId: string }) => {
    const response = await fetch(`/api/bioscope/sessions/${payload.sessionId}/state`);
    if (!response.ok) throw new Error('Failed to fetch game state');
    return response.json();
  }
);

export const resetBioscopeGame = createAsyncThunk(
  'bioscope/resetGame',
  async (payload: { sessionId: string }) => {
    const response = await fetch(`/api/bioscope/sessions/${payload.sessionId}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to reset game');
    return response.json();
  }
);

// Slice
const bioscopeSlice = createSlice({
  name: 'bioscope',
  initialState,
  reducers: {
    selectTemplate: (state, action: PayloadAction<BioscopeTemplate>) => {
      state.selectedTemplate = action.payload;
    },
    clearSelectedTemplate: (state) => {
      state.selectedTemplate = null;
    },
    updateGameState: (state, action: PayloadAction<BioscopeGameState>) => {
      state.currentGame = action.payload;
    },
    updateTimeRemaining: (state, action: PayloadAction<number>) => {
      if (state.currentGame) {
        state.currentGame.timeRemaining = action.payload;
      }
    },
    clearError: (state) => {
      state.error = undefined;
    },
    resetBioscope: (state) => {
      state.currentGame = null;
      state.selectedTemplate = null;
      state.error = undefined;
    },
    setBioscopeBuzzerState: (state, action: PayloadAction<Partial<BioscopeBuzzerState>>) => {
      state.buzzer = { ...state.buzzer, ...action.payload };
    },
    resetBioscopeBuzzer: (state) => {
      state.buzzer = initialState.buzzer;
    },
  },
  extraReducers: (builder) => {
    // Fetch Templates
    builder.addCase(fetchBioscopeTemplates.pending, (state) => {
      state.loading = true;
      state.error = undefined;
    });
    builder.addCase(fetchBioscopeTemplates.fulfilled, (state, action) => {
      state.loading = false;
      state.templates = action.payload;
    });
    builder.addCase(fetchBioscopeTemplates.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    // Create Template
    builder.addCase(createBioscopeTemplate.pending, (state) => {
      state.loading = true;
      state.error = undefined;
    });
    builder.addCase(createBioscopeTemplate.fulfilled, (state, action) => {
      state.loading = false;
      state.templates.push(action.payload);
    });
    builder.addCase(createBioscopeTemplate.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    // Start Game
    builder.addCase(startBioscopeGame.pending, (state) => {
      state.loading = true;
      state.error = undefined;
      state.lastAction = 'start';
    });
    builder.addCase(startBioscopeGame.fulfilled, (state, action) => {
      state.loading = false;
      state.currentGame = action.payload;
    });
    builder.addCase(startBioscopeGame.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    // Reveal Image
    builder.addCase(revealBioscopeImage.pending, (state) => {
      state.loading = true;
      state.error = undefined;
      state.lastAction = 'reveal-image';
    });
    builder.addCase(revealBioscopeImage.fulfilled, (state, action) => {
      state.loading = false;
      state.currentGame = action.payload;
    });
    builder.addCase(revealBioscopeImage.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    // Reveal Answer
    builder.addCase(revealBioscopeAnswer.pending, (state) => {
      state.loading = true;
      state.error = undefined;
      state.lastAction = 'reveal-answer';
    });
    builder.addCase(revealBioscopeAnswer.fulfilled, (state, action) => {
      state.loading = false;
      state.currentGame = action.payload;
    });
    builder.addCase(revealBioscopeAnswer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    // Submit Answer
    builder.addCase(submitBioscopeAnswer.pending, (state) => {
      state.loading = true;
      state.error = undefined;
    });
    builder.addCase(submitBioscopeAnswer.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(submitBioscopeAnswer.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    // Manual Score
    builder.addCase(awardManualScore.pending, (state) => {
      state.loading = true;
      state.error = undefined;
    });
    builder.addCase(awardManualScore.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(awardManualScore.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    // Next Round
    builder.addCase(nextBioscopeRound.pending, (state) => {
      state.loading = true;
      state.error = undefined;
      state.lastAction = 'next-round';
    });
    builder.addCase(nextBioscopeRound.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload.completed) {
        if (state.currentGame) {
          state.currentGame.status = 'completed';
        }
      } else {
        state.currentGame = action.payload;
      }
    });
    builder.addCase(nextBioscopeRound.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    // Fetch Game State
    builder.addCase(fetchBioscopeGameState.pending, (state) => {
      state.loading = true;
      state.error = undefined;
    });
    builder.addCase(fetchBioscopeGameState.fulfilled, (state, action) => {
      state.loading = false;
      state.currentGame = action.payload;
    });
    builder.addCase(fetchBioscopeGameState.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    // Reset Game
    builder.addCase(resetBioscopeGame.pending, (state) => {
      state.loading = true;
      state.error = undefined;
      state.lastAction = 'reset';
    });
    builder.addCase(resetBioscopeGame.fulfilled, (state, action) => {
      state.loading = false;
      state.currentGame = action.payload;
    });
    builder.addCase(resetBioscopeGame.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });
  },
});

export const {
  selectTemplate,
  clearSelectedTemplate,
  updateGameState,
  updateTimeRemaining,
  clearError,
  resetBioscope,
  setBioscopeBuzzerState,
  resetBioscopeBuzzer,
} = bioscopeSlice.actions;

export default bioscopeSlice.reducer;
