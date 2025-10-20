import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { transformSession, type GameInstance, type QuizState, type Session, type Team } from '@pkg/core';
import JoinScreen from './screens/JoinScreen';
import QuizScreen from './screens/QuizScreen';
import BioscopeScreen from './screens/BioscopeScreen';
import ScoreboardScreen from './screens/ScoreboardScreen';
import ScreenSaver from './components/ScreenSaver';
import { useIdleDetector } from './hooks/useIdleDetector';
import {
  fetchBioscopeState,
  fetchQuizState,
  fetchSessionByCode,
  fetchSessionScores,
} from './lib/api';
import { getSessionSocket } from './lib/socket';
import {
  getBioscopeSocket,
  resetBioscopeSocket,
  type BioscopeGameState,
} from './lib/bioscopeSocket';

type Screen = 'menu' | 'join' | 'lobby' | 'quiz' | 'bioscope' | 'scoreboard';

interface TeamScore {
  id: string;
  name: string;
  score: number;
  color: string;
}

type BioscopeAnswerPayload = NonNullable<BioscopeGameState['answers']>[number];

const SCORE_COLORS = ['#e94560', '#0f3460', '#4caf50', '#ff9800', '#9c27b0'];
const TV_SESSION_STORAGE_KEY = 'tvSession';

function App() {
  const { ref, focusKey, focusSelf } = useFocusable();
  const [currentScreen, setCurrentScreen] = useState<Screen>('join');
  const [session, setSession] = useState<Session | null>(null);
  const [sessionCode, setSessionCode] = useState('');
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [bioscopeState, setBioscopeState] = useState<BioscopeGameState | null>(null);
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [showScreenSaver, setShowScreenSaver] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [selectedItem, setSelectedItem] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [lastKey, setLastKey] = useState('');
  const [currentFocus, setCurrentFocus] = useState(0);
  const [revealedImages, setRevealedImages] = useState<Array<{ id: string; url?: string }>>([]);
  const [buzzerEvents, setBuzzerEvents] = useState<Array<{ participantName: string; teamName?: string; timestamp: string }>>([]);
  const [recentAnswers, setRecentAnswers] = useState<Array<{ participantName: string; answer: string; points?: number }>>([]);

  const menuItems = ['Play', 'Settings', 'Exit'];
  const menuRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scoreboardTimeoutRef = useRef<number | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const bioscopeStateRef = useRef<BioscopeGameState | null>(null);
  const bioscopeStateFetchRef = useRef(false);
  const restoredRef = useRef(false);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    bioscopeStateRef.current = bioscopeState;
  }, [bioscopeState]);

  useIdleDetector({
    timeout: 120_000,
    onIdle: () => setShowScreenSaver(true),
    onActive: () => setShowScreenSaver(false),
  });

  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  useEffect(() => {
    if (menuRefs.current && menuRefs.current.length > 0) {
      const first = menuRefs.current[0];
      try {
        first?.focus?.();
      } catch (error) {
        console.warn('Unable to focus first menu element on mount', error);
      }
    }
  }, []);

  useEffect(() => {
    const node = menuRefs.current?.[currentFocus];
    if (!node || typeof (node as any).focus !== 'function') {
      return;
    }

    try {
      (node as any).focus();
    } catch (error) {
      console.warn('Unable to focus menu element', error);
    }

    const retry = window.setTimeout(() => {
      try {
        (node as any).focus();
      } catch {
        // ignore
      }
    }, 50);

    return () => window.clearTimeout(retry);
  }, [currentFocus]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setLastKey(`${event.key} (${event.code})`);

      if (
        event.key === 'Enter' ||
        event.key === ' ' ||
        event.code === 'Enter' ||
        event.keyCode === 13 ||
        event.keyCode === 32 ||
        event.keyCode === 415 ||
        event.code === 'MediaPlayPause'
      ) {
        event.preventDefault();
        handleMenuItemPress(menuItems[currentFocus]);
      }

      if (event.key === 'ArrowDown' || event.keyCode === 40) {
        event.preventDefault();
        setCurrentFocus((prev) => (prev + 1) % menuItems.length);
      }

      if (event.key === 'ArrowUp' || event.keyCode === 38) {
        event.preventDefault();
        setCurrentFocus((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      console.log('Key up:', event.key, 'Code:', event.code, 'KeyCode:', event.keyCode);
    };

    const handleClick = (event: MouseEvent) => {
      setLastKey(`Click at ${event.clientX},${event.clientY}`);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleClick);
    };
  }, [currentFocus, menuItems]);

  const activeGame = useMemo(() => {
    if (!session || !Array.isArray(session.games)) {
      return null;
    }
    return session.games[session.activeGameIndex] ?? null;
  }, [session]);

  const activeGameType = activeGame?.type ?? null;

  const clearScoreboardTimeout = useCallback(() => {
    if (scoreboardTimeoutRef.current !== null) {
      window.clearTimeout(scoreboardTimeoutRef.current);
      scoreboardTimeoutRef.current = null;
    }
  }, []);

  const convertScoresToTeamScores = useCallback((scores: any): TeamScore[] => {
    if (!scores?.players || scores.players.length === 0) {
      return [];
    }

    const sessionTeams: Team[] = sessionRef.current?.teams ?? [];

    return scores.players
      .map((player: any, index: number) => {
        const team = sessionTeams.find((team) => team.id === player.teamId);
        const color = team?.color || SCORE_COLORS[index % SCORE_COLORS.length];
        const name =
          team?.name ||
          player.playerName ||
          player.name ||
          `Player ${index + 1}`;

        return {
          id: player.id || player.participantId || team?.id || `player-${index}`,
          name,
          score: player.totalScore ?? player.score ?? 0,
          color,
        };
      })
      .sort((a: TeamScore, b: TeamScore) => b.score - a.score);
  }, []);

  const scheduleScoreboardDisplay = useCallback((delayMs = 5000) => {
    clearScoreboardTimeout();

    scoreboardTimeoutRef.current = window.setTimeout(async () => {
      if (!sessionRef.current) {
        return;
      }

      try {
        const scores = await fetchSessionScores(sessionRef.current.id);
        const formatted = convertScoresToTeamScores(scores);
        setTeams(formatted);
        setCurrentScreen('scoreboard');
      } catch (error) {
        console.error('Error fetching scores for TV scoreboard:', error);
      } finally {
        scoreboardTimeoutRef.current = null;
      }
    }, delayMs);
  }, [clearScoreboardTimeout, convertScoresToTeamScores]);

  const initializeSession = useCallback(
    (foundSession: Session, code: string, debugMessage?: string) => {
      clearScoreboardTimeout();
      setSession(foundSession);
      sessionRef.current = foundSession;
      setSessionCode(code);
      setRevealedImages([]);
      setBuzzerEvents([]);
      setRecentAnswers([]);
      setTeams([]);
      setQuizState(null);
      setBioscopeState(null);
      bioscopeStateRef.current = null;
      bioscopeStateFetchRef.current = false;
      setShowScreenSaver(false);
      setSelectedItem('');
      setClickCount(0);
      if (debugMessage) {
        setDebugInfo(debugMessage);
      }
      setCurrentScreen('lobby');
      try {
        localStorage.setItem(
          TV_SESSION_STORAGE_KEY,
          JSON.stringify({ sessionId: foundSession.id, code, timestamp: Date.now() }),
        );
      } catch (error) {
        console.warn('[TV App] Unable to persist session info', error);
      }
      restoredRef.current = true;
    },
    [clearScoreboardTimeout],
  );

  const handleLeaveSession = useCallback(() => {
    clearScoreboardTimeout();
    sessionRef.current = null;
    bioscopeStateRef.current = null;
    bioscopeStateFetchRef.current = false;
    setSession(null);
    setSessionCode('');
    setQuizState(null);
    setBioscopeState(null);
    setRevealedImages([]);
    setBuzzerEvents([]);
    setRecentAnswers([]);
    setTeams([]);
    setCurrentScreen('join');
    setShowScreenSaver(false);
    setDebugInfo('Select Play to join a session.');
    setSelectedItem('');
    setClickCount(0);
    try {
      localStorage.removeItem(TV_SESSION_STORAGE_KEY);
    } catch (error) {
      console.warn('[TV App] Unable to clear stored session info', error);
    }
    restoredRef.current = false;
  }, [clearScoreboardTimeout]);

  const handleQuizStateChange = (state: QuizState | null) => {
    if (!state) {
      return;
    }

    setQuizState(state);

    if (state.status === 'idle') {
      clearScoreboardTimeout();
      setCurrentScreen('lobby');
      return;
    }

    if (state.status === 'running') {
      clearScoreboardTimeout();
      setCurrentScreen('quiz');
      return;
    }

    if (state.status === 'revealed' || state.status === 'completed') {
      setCurrentScreen('quiz');
      scheduleScoreboardDisplay(5000);
    }
  };

  const handleBioscopeStateChange = (state: BioscopeGameState | null, opts?: { skipScoreboard?: boolean }) => {
    if (!state) {
      return;
    }

    setBioscopeState(state);
    bioscopeStateRef.current = state;

    setSession((prev) => {
      if (!prev || !Array.isArray(prev.games)) {
        return prev;
      }

      const bioscopeIndex = prev.games.findIndex((game) => game.type === 'bioscope');
      if (bioscopeIndex === -1) {
        return prev;
      }

      const updatedGames = prev.games.map((game, index) =>
        index === bioscopeIndex ? { ...game, state } : game,
      );
      const updatedSession = { ...prev, games: updatedGames, activeGameIndex: bioscopeIndex } as Session;
      sessionRef.current = updatedSession;
      return updatedSession;
    });

    if (state.status === 'idle' || state.status === 'active' || state.status === 'revealing' || state.status === 'answering') {
      clearScoreboardTimeout();
      setCurrentScreen('bioscope');
    }

    if (!opts?.skipScoreboard && (state.status === 'revealed' || state.status === 'completed')) {
      setCurrentScreen('bioscope');
      scheduleScoreboardDisplay(6000);
    }
  };

  const handleMenuItemPress = (item: string) => {
    setSelectedItem(item);
    setClickCount((prev) => prev + 1);

    if (item === 'Play') {
      setCurrentScreen('join');
    } else if (item === 'Exit') {
      handleLeaveSession();
    }
  };

  const handleJoinSession = async (code: string) => {
    try {
      setDebugInfo('Looking up session...');
      const foundSession = await fetchSessionByCode(code);

      if (!foundSession) {
        setDebugInfo('Session not found');
        alert(`Session not found with code: ${code}. Please verify and try again.`);
        try {
          localStorage.removeItem(TV_SESSION_STORAGE_KEY);
        } catch (error) {
          console.warn('[TV App] Unable to clear stored session after failure', error);
        }
        return;
      }

      initializeSession(foundSession, code, 'Session found. Preparing lobby...');

      setDebugInfo('Loading quiz state...');
      const initialQuizState = await fetchQuizState(foundSession.id);
      if (initialQuizState) {
        setQuizState(initialQuizState);
        if (initialQuizState.status === 'running' || initialQuizState.status === 'revealed') {
          setCurrentScreen('quiz');
        }
      }

      try {
        const bioscopeStateSnapshot = await fetchBioscopeState(foundSession.id);
        if (bioscopeStateSnapshot) {
          handleBioscopeStateChange(bioscopeStateSnapshot, { skipScoreboard: true });
        }
      } catch {
        // Ignore bioscope fetch failures (template might not be attached)
      }
    } catch (error) {
      console.error('Failed to join session:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      setDebugInfo(`ERROR: ${message}`);
      alert(`Failed to join session: ${message}`);
      try {
        localStorage.removeItem(TV_SESSION_STORAGE_KEY);
      } catch (storageError) {
        console.warn('[TV App] Unable to clear stored session after error', storageError);
      }
      restoredRef.current = false;
    }
  };

  useEffect(() => {
    if (sessionRef.current || restoredRef.current) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    const stored = localStorage.getItem(TV_SESSION_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!parsed?.code) {
        localStorage.removeItem(TV_SESSION_STORAGE_KEY);
        return;
      }

      setDebugInfo('Restoring previous session...');
      restoredRef.current = true;

      fetchSessionByCode(parsed.code)
        .then((foundSession) => {
          if (foundSession) {
            initializeSession(foundSession, parsed.code, 'Session restored. Waiting for host...');
          } else {
            localStorage.removeItem(TV_SESSION_STORAGE_KEY);
            setDebugInfo('Stored session expired. Please join again.');
            restoredRef.current = false;
          }
        })
        .catch((error) => {
          console.warn('[TV App] Failed to restore session', error);
          localStorage.removeItem(TV_SESSION_STORAGE_KEY);
          setDebugInfo('Unable to restore session. Please join again.');
          restoredRef.current = false;
        });
    } catch (error) {
      console.warn('[TV App] Invalid stored session info', error);
      localStorage.removeItem(TV_SESSION_STORAGE_KEY);
    }
  }, [initializeSession]);

  useEffect(() => {
    if (!session?.id || !activeGameType) {
      return;
    }

    clearScoreboardTimeout();

    if (activeGameType === 'quiz') {
      setCurrentScreen('quiz');
      setBioscopeState(null);
      setRevealedImages([]);
      setBuzzerEvents([]);
      setRecentAnswers([]);

      fetchQuizState(session.id)
        .then((state) => {
          if (state) {
            handleQuizStateChange(state);
          } else if (!quizState) {
            setCurrentScreen('lobby');
          }
        })
        .catch((error) => {
          console.warn('Unable to fetch quiz state for TV app:', error);
          if (!quizState) {
            setCurrentScreen('lobby');
          }
        });
      return;
    }

    if (activeGameType === 'bioscope') {
      setCurrentScreen('bioscope');
      setQuizState(null);

      fetchBioscopeState(session.id)
        .then((state) => {
          if (!state) {
            return;
          }

          handleBioscopeStateChange(state, { skipScoreboard: true });
          setRevealedImages(
            (state.revealedImages ?? []).map((value: number | string) => ({ id: String(value) })),
          );
          if (state.answers) {
            setRecentAnswers(
              state.answers.slice(-5).map((answer: BioscopeAnswerPayload) => ({
                participantName: answer.participantName,
                answer: answer.answer,
                points: answer.pointsAwarded,
              })),
            );
          }
        })
        .catch((error) => {
          console.warn('Unable to fetch bioscope state for TV app:', error);
        });
    }
  }, [session?.id, activeGameType, activeGame?.id, session?.status, quizState?.status]);

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    let mounted = true;
    let sessionSocket: Awaited<ReturnType<typeof getSessionSocket>> | null = null;
    let bioscopeCleanup: (() => void) | null = null;
    let sessionGameResetHandler: ((...args: unknown[]) => void) | null = null;

    const sessionId = session.id;

    const handleGameIndexUpdate = (payload: any) => {
      if (!mounted) {
        return;
      }

      if (payload?.activeGameIndex === undefined) {
        return;
      }

      setSession((prev) => {
        if (!prev) {
          return prev;
        }
        const next = { ...prev, activeGameIndex: payload.activeGameIndex };
        sessionRef.current = next;
        return next;
      });
    };

    const setup = async () => {
      try {
        sessionSocket = await getSessionSocket();

        const handleSessionSnapshot = (snapshot: any) => {
          if (!mounted || !snapshot) {
            return;
          }
          const transformed = transformSession(
            snapshot,
            sessionRef.current?.activeGameIndex,
          );
          sessionRef.current = transformed;
          setSession(transformed);
        };

        const handleQuizUpdate = (state: QuizState | null) => {
          if (!mounted || !state) {
            return;
          }
          handleQuizStateChange(state);
        };

        sessionSocket.onQuiz(sessionId, handleQuizUpdate);
        sessionSocket.subscribe(sessionId, handleSessionSnapshot);
        sessionSocket.on('session:game-started', handleGameIndexUpdate);
        sessionSocket.on('bioscope:game-started', handleGameIndexUpdate);

        const handleGameReset = (...args: unknown[]) => {
          const payload = args[0] as { sessionId: string } | undefined;
          if (!mounted || !payload || payload.sessionId !== session.id) {
            return;
          }

          clearScoreboardTimeout();
          setCurrentScreen('lobby');
          setQuizState(null);
          setBioscopeState(null);
          bioscopeStateRef.current = null;
          bioscopeStateFetchRef.current = false;
          setRevealedImages([]);
          setBuzzerEvents([]);
          setRecentAnswers([]);
          setTeams([]);
          setSession((prev) => {
            if (!prev) {
              return prev;
            }
            const updated = { ...prev, activeGameIndex: 0 } as Session;
            sessionRef.current = updated;
            return updated;
          });
        };
        sessionGameResetHandler = handleGameReset;
        sessionSocket.on('session:game-reset', handleGameReset);

        if (session.games?.some((game: GameInstance) => game.type === 'bioscope')) {
          const bioscopeSocket = await getBioscopeSocket();

          const handleStateUpdate = (...args: unknown[]) => {
            const payload = args[0] as BioscopeGameState | undefined;
            if (!mounted || !payload) {
              return;
            }

            let nextState = payload;
            const previousState = bioscopeStateRef.current;

            if (!payload.template?.currentRound) {
              if (previousState) {
                nextState = {
                  ...previousState,
                  ...payload,
                  template: previousState.template,
                  answers: payload.answers ?? previousState.answers,
                };
              } else if (sessionRef.current?.id && !bioscopeStateFetchRef.current) {
                bioscopeStateFetchRef.current = true;
                fetchBioscopeState(sessionRef.current.id)
                  .then((fullState) => {
                    bioscopeStateFetchRef.current = false;
                    if (fullState) {
                      handleBioscopeStateChange(fullState, { skipScoreboard: true });
                    }
                  })
                  .catch(() => {
                    bioscopeStateFetchRef.current = false;
                  });
                return;
              }
            }

            handleBioscopeStateChange(nextState);

            if (payload.revealedImages) {
              setRevealedImages(
                payload.revealedImages.map((value: number | string) => ({ id: String(value) })),
              );
            }

            if (Array.isArray(payload.answers)) {
              const recentAnswersFromPayload = (payload.answers as BioscopeAnswerPayload[])
                .slice(-5)
                .map((answer) => ({
                  participantName: answer.participantName,
                  answer: answer.answer,
                  points: answer.pointsAwarded,
                }));
              setRecentAnswers(recentAnswersFromPayload);
            }
          };

          const handleImageRevealed = (payload: any) => {
            if (!mounted) {
              return;
            }

            const imageIds = payload?.revealedImages ?? (payload?.currentImageId ? [payload.currentImageId] : []);

            setRevealedImages((prev: Array<{ id: string; url?: string }>) => {
              const existing = new Set(prev.map((item) => item.id));
              const merged = [...prev];
              imageIds.forEach((value: any) => {
                const id = String(value);
                if (!existing.has(id)) {
                  merged.push({ id });
                }
              });
              return merged.slice(-20);
            });
          };

          const handleAnswerRevealed = (payload: any) => {
            if (!mounted) {
              return;
            }

            if (payload?.answers) {
              setRecentAnswers(
                payload.answers.slice(-5).map((answer: any) => ({
                  participantName: answer.participantName || answer.name || 'Unknown',
                  answer: answer.answer || answer.text,
                  points: answer.points,
                })),
              );
            }

            scheduleScoreboardDisplay(6000);
          };

          const handleBuzzerPressed = (payload: any) => {
            if (!mounted) {
              return;
            }
            const info = payload?.pressInfo || payload?.buzzerPress || payload;
            const entry = {
              participantName: info?.participantName || info?.displayName || 'Unknown',
              teamName: info?.teamName || undefined,
              timestamp: payload?.timestamp || info?.pressedAt || new Date().toISOString(),
            };
            setBuzzerEvents((prev: Array<{ participantName: string; teamName?: string; timestamp: string }>) =>
              [entry, ...prev].slice(0, 20),
            );
          };

          bioscopeSocket.subscribe(sessionId);
          bioscopeSocket.on('bioscope:state-updated', handleStateUpdate);
          bioscopeSocket.on('bioscope:image-revealed', handleImageRevealed);
          bioscopeSocket.on('bioscope:answer-revealed', handleAnswerRevealed);
          bioscopeSocket.on('bioscope:buzzer:pressed', handleBuzzerPressed);
          bioscopeSocket.on('bioscope:round-complete', handleStateUpdate);
          bioscopeSocket.on('bioscope:game-completed', handleStateUpdate);
          bioscopeSocket.on('bioscope:game-started', handleStateUpdate);

          bioscopeCleanup = () => {
            bioscopeSocket.off('bioscope:state-updated', handleStateUpdate);
            bioscopeSocket.off('bioscope:image-revealed', handleImageRevealed);
            bioscopeSocket.off('bioscope:answer-revealed', handleAnswerRevealed);
            bioscopeSocket.off('bioscope:buzzer:pressed', handleBuzzerPressed);
            bioscopeSocket.off('bioscope:round-complete', handleStateUpdate);
            bioscopeSocket.off('bioscope:game-completed', handleStateUpdate);
            bioscopeSocket.off('bioscope:game-started', handleStateUpdate);
            bioscopeSocket.unsubscribe(sessionId);
          };
        }
      } catch (error) {
        console.error('Failed to initialise sockets for TV app:', error);
      }
    };

    setup();

    return () => {
      mounted = false;
      clearScoreboardTimeout();

      if (sessionSocket) {
        try {
          sessionSocket.offQuiz(sessionId);
          sessionSocket.unsubscribe(sessionId);
          sessionSocket.off('session:game-started', handleGameIndexUpdate);
          sessionSocket.off('bioscope:game-started', handleGameIndexUpdate);
          if (sessionGameResetHandler) {
            sessionSocket.off('session:game-reset', sessionGameResetHandler);
          }
        } catch (error) {
          console.warn('Failed to clean up session socket listeners', error);
        }
      }

      if (bioscopeCleanup) {
        try {
          bioscopeCleanup();
        } catch (error) {
          console.warn('Failed to clean up bioscope socket listeners', error);
        }
      }

      resetBioscopeSocket();
    };
  }, [session?.id]);

  const sessionDisplayName =
    (session && typeof (session as { name?: string }).name === 'string'
      ? (session as { name?: string }).name
      : session?.hostName) ?? 'PlayUtsav Event';

  const screensaverTeams: TeamScore[] =
    teams.length > 0
      ? teams
      : (session?.teams ?? [])
          .slice(0, 3)
          .map((team: Team, index: number) => ({
            id: team.id,
            name: team.name,
            score: team.participants?.length ?? 0,
            color: team.color || SCORE_COLORS[index % SCORE_COLORS.length],
          }));

  const MenuItem = ({
    label,
    onEnterPress,
    index,
    focused,
  }: {
    label: string;
    onEnterPress: () => void;
    index: number;
    focused: boolean;
  }) => (
    <div
      ref={(el) => {
        menuRefs.current[index] = el;
      }}
      className={focused ? 'menu-item-focused' : 'menu-item'}
      onClick={onEnterPress}
      onTouchEnd={onEnterPress}
      tabIndex={0}
      role="button"
      aria-pressed={focused ? 'true' : 'false'}
    >
      {label}
    </div>
  );

  if (showScreenSaver) {
    return (
      <ScreenSaver
        sessionCode={sessionCode || undefined}
        sessionName={sessionDisplayName}
        teams={screensaverTeams}
        onDismiss={() => setShowScreenSaver(false)}
      />
    );
  }

  if (currentScreen === 'join') {
    return <JoinScreen onJoin={handleJoinSession} />;
  }

  if (currentScreen === 'quiz' && quizState) {
    return (
      <div className="quiz-layout">
        <QuizScreen quizState={quizState} sessionCode={sessionCode} />
        <div className="tv-bioscope-activity">
          <h4>Live Activity</h4>
          <div className="section">
            <div>
              <strong>Revealed Images:</strong> {revealedImages.length}
            </div>
            <div className="section">
              {revealedImages.slice(-5).map((image) => (
                <div key={image.id} className="small">
                  - Image {image.id}
                </div>
              ))}
            </div>
            <div className="section">
              <strong>Buzzers:</strong>
            </div>
            <div className="section tv-bioscope-scroll">
              {buzzerEvents.slice(0, 5).map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="small">
                  - {event.participantName}
                  {event.teamName ? ` (${event.teamName})` : ''} @{' '}
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              ))}
            </div>
            <div className="section">
              <strong>Recent Answers:</strong>
            </div>
            <div className="section tv-bioscope-scroll">
              {recentAnswers.slice(0, 5).map((answer, index) => (
                <div key={`${answer.participantName}-${index}`} className="small">
                  - {answer.participantName}: {String(answer.answer)}
                  {answer.points ? ` (+${answer.points})` : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === 'bioscope') {
    return (
      <BioscopeScreen
        sessionCode={sessionCode}
        gameState={bioscopeState}
        revealedImages={revealedImages}
        buzzerEvents={buzzerEvents}
        recentAnswers={recentAnswers}
      />
    );
  }

  if (currentScreen === 'scoreboard') {
    return <ScoreboardScreen teams={teams} sessionCode={sessionCode} />;
  }

  if (currentScreen === 'lobby') {
    return (
      <div className="app">
        <div className="content">
          <h1 className="title">PlayUtsav Quiz</h1>
          <div className="session-badge">
            <span className="badge-label">Session Code</span>
            <span className="badge-value">{sessionCode || 'Loading...'}</span>
          </div>
          <p className="lobby-message">Connected! Waiting for host to start the game...</p>
          {session && (
            <div className="lobby-info">
              <p>Host: {session.hostName || 'Unknown'}</p>
              <p>Players: {session.participants?.length || 0}</p>
              <div className="lobby-live-activity">
                <strong>Live Activity</strong>
                <div className="small">Revealed Images: {revealedImages.length}</div>
                <div className="small">
                  Recent Buzz: {buzzerEvents[0]?.participantName || 'None yet'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="app">
        <div className="content">
          <h1 className="title">PlayUtsav TV</h1>

          {selectedItem && (
            <div className="feedback">
              <p>{selectedItem} selected</p>
              <p>Total selections: {clickCount}</p>
            </div>
          )}

          {lastKey && (
            <div className="debug-overlay" aria-live="polite" role="status">
              <div className="debug-overlay-inner">
                <div className="debug-line label">Last key</div>
                <div className="debug-line big-key">{lastKey}</div>
                <div className="debug-line focus-line">
                  Focus: <strong>{menuItems[currentFocus]}</strong>
                </div>
                <div className="debug-line small-text">{debugInfo}</div>
              </div>
            </div>
          )}

          <div className="menu">
            <MenuItem
              label='Play'
              onEnterPress={() => handleMenuItemPress('Play')}
              index={0}
              focused={currentFocus === 0}
            />
            <MenuItem
              label='Settings'
              onEnterPress={() => handleMenuItemPress('Settings')}
              index={1}
              focused={currentFocus === 1}
            />
            <MenuItem
              label='Exit'
              onEnterPress={() => handleMenuItemPress('Exit')}
              index={2}
              focused={currentFocus === 2}
            />
          </div>

          <div className="instructions">
            <p>Use arrow keys to navigate - Press OK/Enter to select</p>
            <p className="focus-debug">Current focus: {menuItems[currentFocus]}</p>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

export default App;
