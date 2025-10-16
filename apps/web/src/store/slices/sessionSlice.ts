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
  async (payload: { hostName?: string; maxPlayers?: number; language?: string; playerEngagementType?: string }) => {
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
      // Clear both player and host sessions from localStorage
      localStorage.removeItem('playerSession');
      localStorage.removeItem('hostSession');
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
      
      // Persist host session to localStorage for refresh recovery
      localStorage.setItem('hostSession', JSON.stringify({
        sessionId: action.payload.id,
        timestamp: Date.now()
      }));
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
        
        // Persist host session to localStorage for refresh recovery
        localStorage.setItem('hostSession', JSON.stringify({
          sessionId: action.payload.id,
          timestamp: Date.now()
        }));
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
      .addCase(addTeamThunk.pending, (state) => {
        console.log('[Redux] Adding team...');
      })
      .addCase(addTeamThunk.fulfilled, (state, action) => {
        console.log('[Redux] Team added successfully:', action.payload);
        if (!state.current) return;
        state.current.teams = [...state.current.teams, { ...action.payload, participants: [] }];
      })
      .addCase(addTeamThunk.rejected, (state, action) => {
        console.error('[Redux] Failed to add team:', action.error);
        state.error = action.error.message || 'Failed to add team';
      })
      .addCase(assignParticipantToTeamThunk.pending, (state) => {
        console.log('[Redux] Assigning participant to team...');
      })
      .addCase(assignParticipantToTeamThunk.fulfilled, (state, action) => {
        console.log('[Redux] Participant assigned successfully:', action.payload);
        if (!state.current) return;
        
        // Update the participant's teamId in the state
        const participant = state.current.participants.find(p => p.id === action.payload.participantId);
        if (participant) {
          participant.teamId = action.payload.teamId;
        }
        
        // Move participant between teams in the teams array
        state.current.teams.forEach(team => {
          // Remove participant from all teams first
          team.participants = team.participants.filter(p => p.id !== action.payload.participantId);
          
          // Add to new team if teamId matches
          if (action.payload.teamId && team.id === action.payload.teamId && participant) {
            team.participants.push(participant);
          }
        });
      })
      .addCase(assignParticipantToTeamThunk.rejected, (state, action) => {
        console.error('[Redux] Failed to assign participant:', action.error);
        state.error = action.error.message || 'Failed to assign participant to team';
      });
  },
});

export const { reset: resetSession, setSnapshot, setHostSession, setPlayerSession, setError } = sessionSlice.actions;
export default sessionSlice.reducer;
