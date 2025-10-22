import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Session, GameInstance } from '@pkg/core';
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
      // Defensive merge: preserve client's existing activeGameIndex if present
      // However, if the incoming snapshot contains a bioscope game whose state
      // is currently 'active', force the activeGameIndex to that bioscope game's
      // index so clients immediately switch to the running bioscope game.
      const incoming = action.payload;

      // Detect an active bioscope in the incoming snapshot
      let bioscopeActiveIndex: number | undefined;
      if (incoming && Array.isArray((incoming as any).games)) {
        const idx = (incoming as any).games.findIndex((g: any) => g && g.type === 'bioscope' && g.state && g.state.status === 'active');
        if (idx !== -1) bioscopeActiveIndex = idx;
      }

      if (typeof bioscopeActiveIndex === 'number' && state.role !== 'HOST') {
        // Force clients to switch to the active bioscope regardless of local preserve
        state.current = { ...incoming, activeGameIndex: bioscopeActiveIndex } as Session;
      } else if (state.current && typeof state.current.activeGameIndex === 'number') {
        // If incoming doesn't have a numeric activeGameIndex, or looks like a default,
        // preserve the existing one to avoid unwanted resets.
        const incomingIndex = (incoming as any).activeGameIndex;
        const preserve = typeof incomingIndex === 'number' ? incomingIndex : state.current.activeGameIndex;
        state.current = { ...incoming, activeGameIndex: preserve } as Session;
      } else {
        state.current = incoming;
      }
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
    // New: setActiveGameIndex
    setActiveGameIndex(state, action: PayloadAction<number>) {
      console.log('[sessionSlice] setActiveGameIndex called with:', action.payload);
      if (state.current) {
        console.log('[sessionSlice] Previous activeGameIndex:', state.current.activeGameIndex);
        state.current.activeGameIndex = action.payload;
        console.log('[sessionSlice] New activeGameIndex:', state.current.activeGameIndex);
        console.log('[sessionSlice] Active game:', state.current.games[action.payload]);
        
        // Persist activeGameIndex to localStorage for host (for refresh recovery)
        if (state.role === 'HOST') {
          const hostSession = localStorage.getItem('hostSession');
          if (hostSession) {
            const parsed = JSON.parse(hostSession);
            localStorage.setItem('hostSession', JSON.stringify({
              ...parsed,
              activeGameIndex: action.payload
            }));
            console.log('[sessionSlice] Persisted activeGameIndex to localStorage');
          }
        }
      } else {
        console.warn('[sessionSlice] Cannot set activeGameIndex - no current session');
      }
    },
    // New: addGameInstance
    addGameInstance(state, action: PayloadAction<GameInstance>) {
      if (state.current) {
        state.current.games.push(action.payload);
      }
    },
    // New: updateGameInstanceState
    updateGameInstanceState(state, action: PayloadAction<{ gameId: string; newState: any }>) {
      if (state.current) {
        const game = state.current.games.find(g => g.id === action.payload.gameId);
        if (game) {
          game.state = action.payload.newState;
        }
      }
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
        // Don't manually update teams array here - let WebSocket snapshot handle it
        // This prevents duplication when both the API response and WebSocket update arrive
        // The team will appear when the next session snapshot arrives via WebSocket
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

export const { 
  reset: resetSession, 
  setSnapshot, 
  setHostSession, 
  setPlayerSession, 
  setError,
  setActiveGameIndex,
  addGameInstance
} = sessionSlice.actions;
export default sessionSlice.reducer;
