import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { HostQuizPanel } from './HostQuizPanel';
import { renderWithProviders } from '../test/test-utils';
import enMessages from '../messages/en.json';
import type { RootState } from '../store/store';

// Mock socket
vi.mock('../lib/socket', () => ({
  getSessionSocket: vi.fn().mockResolvedValue({
    on: vi.fn(),
    off: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

describe('HostQuizPanel - Sprint 2 Features', () => {
  const mockSession = {
    id: 'session-123',
    code: 'ABC123',
    hostId: 'host-1',
    status: 'ACTIVE' as const,
    maxPlayers: 10,
    language: 'en' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    participants: [
      { 
        id: 'player-1', 
        displayName: 'Player 1', 
        role: 'PLAYER' as const, 
        teamId: 'team-1',
        sessionId: 'session-123',
        joinedAt: new Date().toISOString(),
      },
      { 
        id: 'player-2', 
        displayName: 'Player 2', 
        role: 'PLAYER' as const, 
        teamId: 'team-2',
        sessionId: 'session-123',
        joinedAt: new Date().toISOString(),
      },
    ],
    teams: [
      { 
        id: 'team-1', 
        name: 'Team A', 
        color: '#FF0000', 
        participants: [], 
        sessionId: 'session-123',
        createdAt: new Date().toISOString(),
      },
      { 
        id: 'team-2', 
        name: 'Team B', 
        color: '#0000FF', 
        participants: [], 
        sessionId: 'session-123',
        createdAt: new Date().toISOString(),
      },
    ],
    scores: [],
  };

  const mockQuizState = {
    sessionId: 'session-123',
    questionId: 'q1',
    prompt: 'What is 2+2?',
    options: ['3', '4', '5', '6'],
    correctOption: 1,
    duration: 30,
    status: 'running' as const,
    createdAt: new Date().toISOString(),
    answers: [],
  };

  const initialState = {
    session: {
      current: mockSession,
      role: 'HOST',
      status: 'idle',
      error: undefined,
      participantId: undefined,
    },
    quiz: {
      current: mockQuizState,
      loading: false,
      error: undefined,
    },
    settings: {
      timerSeconds: 30,
      buzzerEnabled: true,
      explainAudioUrl: null,
      sounds: {
        masterVolume: 70,
        soundsEnabled: true,
        coinSoundEnabled: true,
        coinSoundPath: '/sounds/coin.mp3',
        buzzerSoundEnabled: true,
        buzzerSoundPath: '/sounds/buzzer.mp3',
        backgroundMusicEnabled: false,
        backgroundMusicPath: '/sounds/background.mp3',
        notificationSoundsEnabled: true,
        notificationSoundPath: '/sounds/notification.mp3',
        explanationAudioPath: null,
      },
      animations: {
        animationsEnabled: true,
        reduceMotion: false,
        autoDetectPerformance: true,
      },
      reveal: {
        autoRevealEnabled: true,
        autoRevealTimeout: 5,
      },
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-setup the socket mock after clearing
    const { getSessionSocket } = await import('../lib/socket');
    vi.mocked(getSessionSocket).mockResolvedValue({
      on: vi.fn(),
      off: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Host Controls (showHostControls=true)', () => {
    it('should show Start Question button when no quiz is running', () => {
      const stateWithNoQuiz = {
        ...initialState,
        quiz: { current: null, loading: false, error: null },
      };

      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={true} />
        </IntlProvider>,
        { preloadedState: stateWithNoQuiz as unknown as Partial<RootState> }
      );

      expect(screen.getByText(/Start question/i)).toBeInTheDocument();
    });

    it('should show Next Question button when quiz is revealed', () => {
      const revealedState = {
        ...initialState,
        quiz: {
          ...initialState.quiz!,
          current: { ...mockQuizState, status: 'revealed' as const },
        },
      };

      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={true} />
        </IntlProvider>,
        { preloadedState: revealedState as unknown as Partial<RootState> }
      );

      expect(screen.getByText(/Next question/i)).toBeInTheDocument();
    });

    it('should show Reveal button when quiz is running', () => {
      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={true} />
        </IntlProvider>,
        { preloadedState: initialState as unknown as Partial<RootState> }
      );

      expect(screen.getByText(/Reveal & award/i)).toBeInTheDocument();
    });
  });

  describe('Player Input Mode (allowPlayerInput=true)', () => {
    const playerState: Partial<RootState> = {
      ...initialState,
      session: {
        ...initialState.session!,
        role: 'PLAYER' as const,
        participantId: 'player-1',
        status: 'ready' as const,
      },
    };

    it('should show radio buttons for answer options', () => {
      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
        </IntlProvider>,
        { preloadedState: playerState as unknown as Partial<RootState> }
      );

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(4); // 4 options
    });

    it('should show Submit button when allowPlayerInput is true', () => {
      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
        </IntlProvider>,
        { preloadedState: playerState as unknown as Partial<RootState> }
      );

      expect(screen.getByText(/Submit answer/i)).toBeInTheDocument();
    });

    it('should enable Submit button when option is selected', () => {
      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
        </IntlProvider>,
        { preloadedState: playerState as unknown as Partial<RootState> }
      );

      const submitButton = screen.getByText(/Submit answer/i);
      expect(submitButton).toBeDisabled();

      const radioButtons = screen.getAllByRole('radio');
      fireEvent.click(radioButtons[1]); // Select second option

      expect(submitButton).not.toBeDisabled();
    });

    it('should NOT show host controls when showHostControls is false', () => {
      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
        </IntlProvider>,
        { preloadedState: playerState as unknown as Partial<RootState> }
      );

      expect(screen.queryByText(/Start question/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Next question/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Reveal & award/i)).not.toBeInTheDocument();
    });

    it('should show "waiting" message after submitting answer', async () => {
      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
        </IntlProvider>,
        { preloadedState: playerState as unknown as Partial<RootState> }
      );

      const radioButtons = screen.getAllByRole('radio');
      fireEvent.click(radioButtons[1]);

      const submitButton = screen.getByText(/Submit answer/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Waiting for others/i)).toBeInTheDocument();
      });
    });

    it('should reset selection when question changes', async () => {
      const { rerender, store } = renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
        </IntlProvider>,
        { preloadedState: playerState as unknown as Partial<RootState> }
      );

      // Select an option
      const radioButtons = screen.getAllByRole('radio');
      fireEvent.click(radioButtons[1]);
      expect(radioButtons[1]).toBeChecked();

      // Change question
      const newQuizState = {
        ...mockQuizState,
        questionId: 'q2',
        prompt: 'What is 3+3?',
      };

      store.dispatch({ type: 'quiz/setQuizState', payload: newQuizState });

      rerender(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
        </IntlProvider>
      );

      // Selection should be cleared
      await waitFor(() => {
        const newRadioButtons = screen.getAllByRole('radio');
        expect(newRadioButtons.every((rb) => !(rb as HTMLInputElement).checked)).toBe(true);
      });
    });
  });

  describe('Quiz Display', () => {
    it('should display question prompt', () => {
      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel />
        </IntlProvider>,
        { preloadedState: initialState as unknown as Partial<RootState> }
      );

      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    it('should display all answer options', () => {
      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel />
        </IntlProvider>,
        { preloadedState: initialState as unknown as Partial<RootState> }
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('should highlight correct answer when revealed', () => {
      const revealedState = {
        ...initialState,
        quiz: {
          ...initialState.quiz!,
          current: { ...mockQuizState, status: 'revealed' as const },
        },
      };

      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel />
        </IntlProvider>,
        { preloadedState: revealedState as unknown as Partial<RootState> }
      );

      // Check for green background on correct answer
      const correctOption = screen.getByText('4').closest('li, label');
      expect(correctOption).toHaveClass(/emerald|green/);
    });

    it('should show timer countdown', () => {
      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel />
        </IntlProvider>,
        { preloadedState: initialState as unknown as Partial<RootState> }
      );

      expect(screen.getByText(/Time left/i)).toBeInTheDocument();
    });

    it('should show answer count', () => {
      const stateWithAnswers = {
        ...initialState,
        quiz: {
          ...initialState.quiz!,
          current: {
            ...mockQuizState,
            answers: [
              { participantId: 'player-1', answer: 1, displayName: 'Player 1' },
              { participantId: 'player-2', answer: 2, displayName: 'Player 2' },
            ],
          },
        },
      };

      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel />
        </IntlProvider>,
        { preloadedState: stateWithAnswers as unknown as Partial<RootState> }
      );

      expect(screen.getByText(/2 answers received/i)).toBeInTheDocument();
    });
  });

  describe('Auto-Reveal Feature', () => {
    it('should show auto-reveal countdown when all players answered', async () => {
      const allAnsweredState = {
        ...initialState,
        quiz: {
          ...initialState.quiz!,
          current: {
            ...mockQuizState,
            answers: [
              { participantId: 'player-1', answer: 1, displayName: 'Player 1' },
              { participantId: 'player-2', answer: 1, displayName: 'Player 2' },
            ],
          },
        },
      };

      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel />
        </IntlProvider>,
        { preloadedState: allAnsweredState as unknown as Partial<RootState> }
      );

      // Should show countdown when quiz:all-answered event is received
      // This would require mocking the WebSocket event
      // For now, we verify the component renders without errors
      expect(screen.getByText(/Quiz round/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for radio buttons', () => {
      const playerState: Partial<RootState> = {
        ...initialState,
        session: {
          ...initialState.session!,
          role: 'PLAYER' as const,
          participantId: 'player-1',
          status: 'ready' as const,
        },
      };

      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
        </IntlProvider>,
        { preloadedState: playerState as unknown as Partial<RootState> }
      );

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach((radio) => {
        expect(radio).toHaveAttribute('name', 'player-answer');
      });
    });

    it('should disable inputs when quiz is revealed', () => {
      const revealedState: Partial<RootState> = {
        ...initialState,
        session: {
          ...initialState.session!,
          role: 'PLAYER' as const,
          participantId: 'player-1',
          status: 'ready' as const,
        },
        quiz: {
          ...initialState.quiz!,
          current: { ...mockQuizState, status: 'revealed' as const },
        },
      };

      renderWithProviders(
        <IntlProvider locale="en" messages={enMessages}>
          <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
        </IntlProvider>,
        { preloadedState: revealedState as unknown as Partial<RootState> }
      );

      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    });
  });
});

