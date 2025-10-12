import reducer, {
  createSessionThunk,
  joinSessionThunk,
  resetSession,
  setError,
  setSnapshot,
} from './sessionSlice';
import type { Session } from '@pkg/core';

const baseSession: Session = {
  id: 'session-1',
  code: 'ABCD',
  status: 'LOBBY',
  hostName: 'Ava',
  maxPlayers: 6,
  language: 'en',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  teams: [],
  participants: [],
  scores: [],
};

describe('sessionSlice reducer', () => {
  it('returns initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({ role: null, status: 'idle' });
  });

  it('handles createSession fulfilled', () => {
    const state = reducer(undefined, createSessionThunk.fulfilled(baseSession, '', {}));
    expect(state.current).toEqual(baseSession);
    expect(state.role).toBe('HOST');
    expect(state.status).toBe('ready');
  });

  it('handles joinSession fulfilled', () => {
    const actionPayload = {
      session: baseSession,
      participantId: 'participant-1',
    };
    const state = reducer(undefined, joinSessionThunk.fulfilled(actionPayload, '', { code: 'ABCD', displayName: 'Sam' }));
    expect(state.current).toEqual(baseSession);
    expect(state.participantId).toBe('participant-1');
    expect(state.role).toBe('PLAYER');
  });

  it('sets snapshot and error', () => {
    let state = reducer(undefined, setSnapshot(baseSession));
    expect(state.current).toEqual(baseSession);
    expect(state.status).toBe('ready');

    state = reducer(state, setError('Failed'));
    expect(state.error).toBe('Failed');
    expect(state.status).toBe('error');
  });

  it('resets state', () => {
    const populated = reducer(undefined, createSessionThunk.fulfilled(baseSession, '', {}));
    const reset = reducer(populated, resetSession());
    expect(reset).toEqual({ role: null, status: 'idle' });
  });
});

