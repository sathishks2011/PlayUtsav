import { IntlProvider } from 'react-intl';
import { HostLobby } from './HostLobby';
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
    { id: 'p2', sessionId: 'session-1', displayName: 'Sam', role: 'PLAYER', joinedAt: new Date().toISOString(), teamId: 'team-1' },
  ],
  teams: [
    {
      id: 'team-1',
      sessionId: 'session-1',
      name: 'Lightning Lions',
      color: '#ffcc00',
      createdAt: new Date().toISOString(),
      participants: [
        { id: 'p2', sessionId: 'session-1', displayName: 'Sam', role: 'PLAYER', joinedAt: new Date().toISOString(), teamId: 'team-1' },
      ],
    },
  ],
  scores: [
    {
      id: 'score-1',
      sessionId: 'session-1',
      teamId: 'team-1',
      value: 10,
      delta: 10,
      reason: 'quiz-award',
      recordedBy: null,
      recordedAt: new Date().toISOString(),
    },
  ],
};

describe('HostLobby screen', () => {
  it('renders session details, participants, and teams', () => {
    const preloadedState = {
      session: {
        current: session,
        role: 'HOST',
        status: 'ready',
        participantId: undefined,
        error: undefined,
      },
      theme: { current: 'default', custom: undefined },
      locale: { current: 'en' },
      quiz: { current: null, loading: false },
    } as RootState;

    const { getByText } = renderWithProviders(
      <IntlProvider locale="en" messages={enMessages}>
        <HostLobby />
      </IntlProvider>,
      {
        preloadedState,
      }
    );

    expect(getByText(/Session code/i)).toHaveTextContent('H7QX');
    expect(getByText(/Lobby participants/i)).toBeInTheDocument();
    expect(getByText(/Scoreboard/i)).toBeInTheDocument();
    expect(getByText('Sam')).toBeInTheDocument();
    expect(getByText('Lightning Lions')).toBeInTheDocument();
  });
});
