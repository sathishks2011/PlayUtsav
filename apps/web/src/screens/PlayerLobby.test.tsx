import { IntlProvider } from 'react-intl';
import { PlayerLobby } from './PlayerLobby';
import enMessages from '../messages/en.json';
import { renderWithProviders } from '../test/test-utils';
import type { RootState } from '../store/store';
import type { Session } from '@pkg/core';

const session: Session = {
  id: 'session-1',
  code: 'H7QX',
  status: 'LOBBY',
  hostName: 'Ava',
  maxPlayers: 6,
  language: 'en',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  participants: [
    { id: 'p1', sessionId: 'session-1', displayName: 'Ava', role: 'HOST', joinedAt: new Date().toISOString(), teamId: null },
    { id: 'p2', sessionId: 'session-1', displayName: 'Sam', role: 'PLAYER', joinedAt: new Date().toISOString(), teamId: null },
  ],
  teams: [],
  scores: [],
};

describe('PlayerLobby screen', () => {
  it('shows welcome message and participant list', () => {
    const preloadedState: RootState = {
      session: {
        current: session,
        role: 'PLAYER',
        status: 'ready',
        participantId: 'p2',
        error: undefined,
      },
      theme: { current: 'default' },
      locale: { current: 'en' },
    };

    const { getByText } = renderWithProviders(
      <IntlProvider locale="en" messages={enMessages}>
        <PlayerLobby />
      </IntlProvider>,
      { preloadedState }
    );

    expect(getByText(/Welcome, Sam/i)).toBeInTheDocument();
    expect(getByText(/Players in lobby/i)).toBeInTheDocument();
    expect(getByText('Ava')).toBeInTheDocument();
  });
});

