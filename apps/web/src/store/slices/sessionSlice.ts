import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Session } from '@pkg/core';
import { addTeam, createSession, joinSession, removeParticipant, assignParticipantToTeam } from '../../lib/api';

type Role = 'HOST' | 'PLAYER' | null;

type SessionState = {
  current?: Session;
  role: Role;
  participantId?: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
};

const initialState: SessionState = {
  role: null,
  status: 'idle',
};

export const createSessionThunk = createAsyncThunk(
  'session/create',
  async (payload: { hostName?: string; maxPlayers?: number; language?: string }) => {
    const session = await createSession(payload);
    return session;
  }
);

export const joinSessionThunk = createAsyncThunk(
  'session/join',
  async (payload: { code: string; displayName: string }) => {
    const { session, participant } = await joinSession(payload);
    return { session, participantId: participant.id };
  }
);

export const addTeamThunk = createAsyncThunk(
  'session/addTeam',
  async (payload: { sessionId: string; name: string; color?: string }) => {
    const team = await addTeam(payload.sessionId, { name: payload.name, color: payload.color });
    return team;
  }
);

export const removeParticipantThunk = createAsyncThunk(
  'session/removeParticipant',
  async (payload: { sessionId: string; participantId: string }) => {
    await removeParticipant(payload.sessionId, payload.participantId);
    return payload.participantId;
  }
);

export const assignParticipantToTeamThunk = createAsyncThunk(
  'session/assignParticipantToTeam',
  async (payload: { sessionId: string; participantId: string; teamId: string | null }) => {
    await assignParticipantToTeam(payload.sessionId, payload.participantId, payload.teamId);
    return payload;
  }
);

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    reset: () => {
      // Clear player session from localStorage
      localStorage.removeItem('playerSession');
      return initialState;
    },
    setSnapshot(state, action: PayloadAction<Session>) {
      state.current = action.payload;
      state.status = 'ready';
    },
    setHostSession(state, action: PayloadAction<Session>) {
      state.current = action.payload;
      state.role = 'HOST';
      state.status = 'ready';
    },
    setPlayerSession(state, action: PayloadAction<{ session: Session; participantId: string }>) {
      state.current = action.payload.session;
      state.participantId = action.payload.participantId;
      state.role = 'PLAYER';
      state.status = 'ready';
    },
    setError(state, action: PayloadAction<string | undefined>) {
      state.error = action.payload;
      state.status = action.payload ? 'error' : state.status;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createSessionThunk.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(createSessionThunk.fulfilled, (state, action) => {
        state.current = action.payload;
        state.role = 'HOST';
        state.status = 'ready';
      })
      .addCase(createSessionThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(joinSessionThunk.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(joinSessionThunk.fulfilled, (state, action) => {
        state.current = action.payload.session;
        state.participantId = action.payload.participantId;
        state.role = 'PLAYER';
        state.status = 'ready';
        
        // Persist player session to localStorage
        localStorage.setItem('playerSession', JSON.stringify({
          sessionId: action.payload.session.id,
          participantId: action.payload.participantId,
          displayName: action.payload.session.participants.find(p => p.id === action.payload.participantId)?.displayName,
          timestamp: Date.now()
        }));
      })
      .addCase(joinSessionThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(addTeamThunk.fulfilled, (state, action) => {
        if (!state.current) return;
        state.current.teams = [...state.current.teams, { ...action.payload, participants: [] }];
      });
  },
});

export const { reset: resetSession, setSnapshot, setHostSession, setPlayerSession, setError } = sessionSlice.actions;
export default sessionSlice.reducer;
