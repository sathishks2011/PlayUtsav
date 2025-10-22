import { useEffect, useRef, useCallback, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { resetSession } from '../store/slices/sessionSlice';
import { computeTeamScores } from '@pkg/core';
import { HostQuizPanel } from '../components/HostQuizPanel';
import { PlayerBioscopePanel } from '../components/PlayerBioscopePanel';
import { ScoreboardPane } from '../components/ScoreboardPane';
import { getSessionSocket } from '../lib/socket';
import { useQuizSync } from '../hooks/useQuizSync';
import { useToast } from '../components/ToastProvider';
import { useBioscopeSync } from '../hooks/useBioscopeSync';
import { useBuzzerSync } from '../hooks/useBuzzerSync';
import { PlayerBuzzerButton } from '../components/PlayerBuzzerButton';
import { PlayerBioscopeBuzzerButton } from '../components/PlayerBioscopeBuzzerButton';
import { TeamNameBadge } from '../components/TeamNameBadge';
import { submitBioscopeAnswer } from '../store/slices/bioscopeSlice';

export function PlayerLobby() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session.current);
  const participantId = useAppSelector((s) => s.session.participantId);
  const status = useAppSelector((s) => s.session.status);
  const error = useAppSelector((s) => s.session.error);
  const quizCardRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Derived selectors and local state hooks - keep these at top so hook order is stable
  const quizState = useAppSelector((s) => s.quiz.current);
  const bioscopeState = useAppSelector((s) => s.bioscope.currentGame);
  const bioscopeLoading = useAppSelector((s) => s.bioscope.loading);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // Sync quiz state via WebSocket
  useQuizSync();
  useBioscopeSync();
  useBuzzerSync();

  // Listen for being removed by host
  useEffect(() => {
    if (!participantId) return;

    const handleRemoved = (...args: unknown[]) => {
      const payload = args[0] as { participantId: string };
      if (payload.participantId === participantId) {
        toast.showToast({ message: 'You have been removed from the session by the host.', type: 'info', duration: 5000 });
        dispatch(resetSession());
      }
    };

    getSessionSocket().then((socket) => {
      socket.on('participant:removed', handleRemoved);
    });

    return () => {
      getSessionSocket().then((socket) => {
        socket.off('participant:removed', handleRemoved);
      });
    };
  }, [participantId, dispatch]);

  const handleLeaveSession = () => {
    // Non-blocking leave: leave immediately and show toast
    dispatch(resetSession());
    toast.showToast({ message: 'Left the session', type: 'info', duration: 3000 });
  };

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="w-full max-w-3xl space-y-6">
        <div className="rounded-xl bg-white/10 backdrop-blur p-6 text-center">
          <div className="text-lg">
            <FormattedMessage id="playerLobby.loading" defaultMessage="Joining session..." />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (status === 'error' || error) {
    return (
      <div className="w-full max-w-3xl space-y-6">
        <div className="rounded-xl bg-red-500/20 backdrop-blur p-6 text-center">
          <div className="text-lg text-red-200">
            <FormattedMessage id="playerLobby.error" defaultMessage="Failed to join session" />
          </div>
          {error && <p className="text-sm mt-2 opacity-75">{error}</p>}
        </div>
      </div>
    );
  }

  // Session not loaded yet
  if (!session) {
    return (
      <div className="w-full max-w-3xl space-y-6">
        <div className="rounded-xl bg-white/10 backdrop-blur p-6 text-center">
          <div className="text-lg opacity-80">
            <FormattedMessage id="playerLobby.noSession" defaultMessage="No session found" />
          </div>
        </div>
      </div>
    );
  }

  // Normalize in case backend omits arrays on join response
  const participants = Array.isArray(session.participants) ? session.participants : [];
  const teams = Array.isArray(session.teams) ? session.teams : [];
  const safeSession = {
    ...session,
    participants,
    teams,
    scores: Array.isArray((session as any).scores) ? (session as any).scores : [],
  } as typeof session;

  const me = participants.find((p) => p.id === participantId);
  const myTeam = teams.find((t) => t.participants.some((p) => p.id === participantId));
  const scores = computeTeamScores(safeSession as any);

  // Get active game and check buzzer state for both quiz and bioscope
  const activeGame = safeSession.games?.[safeSession.activeGameIndex];
  const isQuizGame = activeGame?.type === 'quiz';
  const isBioscopeGame = activeGame?.type === 'bioscope';

  // Quiz buzzer state
  const quizBuzzerState = quizState?.buzzerState;
  const isQuizBuzzerOpen = quizBuzzerState?.isOpen || false;

  // Bioscope buzzer state
  const bioscopeBuzzerState = useAppSelector((s) => s.bioscope.buzzer);
  const isBioscopeBuzzerOpen = bioscopeBuzzerState?.isOpen || false;

  // Determine if buzzer should be shown
  const isBuzzerOpen = isQuizGame ? isQuizBuzzerOpen : isBioscopeGame ? isBioscopeBuzzerOpen : false;

  // Handler for submitting bioscope answers
  const handleSubmitBioscopeAnswer = useCallback(async (answer: string) => {
    if (!session?.id || !participantId || !me) {
      console.error('[PlayerLobby] Missing required data for answer submission');
      return;
    }

    setIsSubmittingAnswer(true);
    try {
      await dispatch(submitBioscopeAnswer({
        sessionId: session.id,
        participantId,
        participantName: me.displayName,
        answer,
      })).unwrap();
      console.log('[PlayerLobby] Answer submitted successfully');
    } catch (err) {
      console.error('[PlayerLobby] Failed to submit answer:', err);
      toast.showToast({ message: 'Failed to submit answer. Please try again.', type: 'error', duration: 5000 });
    } finally {
      setIsSubmittingAnswer(false);
    }
  }, [session?.id, participantId, me, dispatch]);
  
  // Debug logging
  console.log('[PlayerLobby] Session has', safeSession.scores.length, 'score records');
  console.log('[PlayerLobby] Bioscope state:', bioscopeState);
  console.log('[PlayerLobby] Computed team scores:', scores);

  // Auto-scroll to quiz card when quiz becomes active
  useEffect(() => {
    if (quizState?.status === 'running' && quizCardRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        quizCardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 300);
    }
  }, [quizState?.status]);

  return (
    <div className="w-full max-w-3xl space-y-4 pb-24">
      {/* Collapsible Welcome Header with Score Panel */}
      <div className="rounded-xl bg-white/10 backdrop-blur overflow-hidden">
        {/* Fixed Top Bar with Session Code and Leave Button */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-white/10 bg-white/5">
          <span className="px-2.5 py-1 rounded-full bg-black/20 border border-white/10 text-xs font-mono opacity-70">
            {session.code}
          </span>
          <button
            onClick={handleLeaveSession}
            className="px-3 py-1.5 text-sm border border-white/20 rounded hover:bg-white/10 transition"
            title="Leave session"
          >
            <FormattedMessage id="playerLobby.leaveSession" defaultMessage="Leave" />
          </button>
        </div>

        {/* Collapsible Section */}
        <details open className="group">
          <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
            <span className="group-open:rotate-90 transition-transform text-sm opacity-70">▶</span>
            <div>
              <h2 className="text-lg font-bold">
                <FormattedMessage
                  id="playerLobby.welcome"
                  defaultMessage="Welcome, {name}!"
                  values={{ name: me?.displayName ?? 'Player' }}
                />
              </h2>
              {myTeam && (
                <div className="mt-0.5">
                  <TeamNameBadge name={myTeam.name} color={myTeam.color} className="text-xs" />
                </div>
              )}
            </div>
          </summary>

          {/* Collapsible Content: Scoreboard & Teams */}
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
          {/* Scoreboard Panel - Narrow Column */}
          {scores.length > 0 && (
            <div className="rounded-lg bg-black/20 border border-white/10 p-3">
              <h4 className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wide">
                <FormattedMessage id="playerLobby.scoreboard" defaultMessage="Scoreboard" />
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {scores.map(({ team, total, streak }) => (
                  <div key={team.id} className="flex items-center justify-between px-2 py-1 rounded bg-white/5 text-sm">
                    <TeamNameBadge name={team.name} color={team.color} className="text-xs" />
                    <div className="flex items-center gap-1.5">
                      <span id={`team-score-${team.id}`} className="font-bold text-sm">{total}</span>
                      {streak > 0 && (
                        <span className="text-xs text-emerald-200">🔥{streak}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams Panel - Wider Column with Tag-Style Members */}
          {teams.length > 0 && (
            <div className="rounded-lg bg-black/20 border border-white/10 p-3">
              <h4 className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wide">
                <FormattedMessage id="playerLobby.teams" defaultMessage="Teams" /> ({teams.length})
              </h4>
              <div className="space-y-2.5 max-h-40 overflow-y-auto">
                {teams.map((team) => (
                  <div key={team.id} className="rounded bg-white/5 p-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <TeamNameBadge name={team.name} color={team.color} className="text-xs" />
                      <span className="text-xs opacity-50">({team.participants.length})</span>
                    </div>
                    {team.participants.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {team.participants.map((p) => (
                          <span
                            key={p.id}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-white/20 ${
                              p.id === participantId ? 'bg-[var(--color-primary)]/40 border-[var(--color-primary)]/60' : 'bg-white/10'
                            }`}
                          >
                            {p.displayName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
            </div>
          </div>
        </details>
      </div>

      {/* Active Game Card - Only show the currently active game IF IT'S STARTED */}
      <div className="space-y-6 mt-6">
        {session.games && session.games.length > 0 ? (
          (() => {
            const activeGame = session.games[session.activeGameIndex];
            if (!activeGame) {
              return (
                <div className="rounded-xl bg-white/10 backdrop-blur p-6 text-center">
                  <p className="text-sm opacity-60">
                    <FormattedMessage id="playerLobby.noActiveGame" defaultMessage="Waiting for host to activate a game..." />
                  </p>
                </div>
              );
            }

            // Check if the game has actually been started by the host
            let isGameStarted = false;
            if (activeGame.type === 'quiz') {
              // Quiz is started when status is 'running' or 'revealed' (not 'idle')
              isGameStarted = quizState?.status === 'running' || quizState?.status === 'revealed';
              console.log('[PlayerLobby] Quiz game check:', {
                hasQuizState: !!quizState,
                quizStatus: quizState?.status,
                isGameStarted,
                sessionId: quizState?.sessionId,
                currentSessionId: session.id
              });
            } else if (activeGame.type === 'bioscope') {
              // Bioscope is started when status is not 'idle'
              isGameStarted = bioscopeState?.status !== 'idle' && bioscopeState?.status !== undefined;
              console.log('[PlayerLobby] Bioscope game check:', {
                hasBioscopeState: !!bioscopeState,
                bioscopeStatus: bioscopeState?.status,
                isGameStarted
              });
            }

            // Only show the game if it's been started
            if (!isGameStarted) {
              return (
                <div className="rounded-xl bg-white/10 backdrop-blur p-6 text-center">
                  <p className="text-sm opacity-60">
                    <FormattedMessage
                      id="playerLobby.waitingForStart"
                      defaultMessage="Waiting for host to start the game..."
                    />
                  </p>
                </div>
              );
            }

            return (
              <div
                ref={quizCardRef}
                className="rounded-xl border border-white/20 bg-white/5 p-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{activeGame.type === 'quiz' ? '📝' : '🎬'}</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{activeGame.name}</h3>
                    <p className="text-xs opacity-60">
                      {activeGame.type === 'quiz' ? (
                        <FormattedMessage id="playerLobby.quizGame" defaultMessage="Quiz Game" />
                      ) : (
                        <FormattedMessage id="playerLobby.bioscopeGame" defaultMessage="Bioscope Game" />
                      )}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-600 border border-green-500/30 font-medium">
                    <FormattedMessage id="playerLobby.nowPlaying" defaultMessage="Now Playing" />
                  </span>
                </div>

                {/* Render the appropriate game panel based on type */}
                {activeGame.type === 'quiz' && (
                  <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
                )}
                {activeGame.type === 'bioscope' && session.id && participantId && (
                  <PlayerBioscopePanel
                    gameState={bioscopeState}
                    sessionId={session.id}
                    participantId={participantId}
                    playerEngagementType={activeGame.state?.playerEngagementType}
                    onSubmitAnswer={handleSubmitBioscopeAnswer}
                    isSubmitting={isSubmittingAnswer}
                    disabled={bioscopeState?.status === 'revealed' || bioscopeState?.status === 'completed'}
                  />
                )}
              </div>
            );
          })()
        ) : (
          <div className="rounded-xl bg-white/10 backdrop-blur p-6 text-center">
            <p className="text-sm opacity-60">
              <FormattedMessage id="playerLobby.noGames" defaultMessage="No games attached to this session." />
            </p>
          </div>
        )}
      </div>

      {/* Fixed Buzzer Button at Bottom - Only visible when buzzer is open */}
      {isBuzzerOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent pt-4 pb-6 px-6 z-50">
          <div className="max-w-3xl mx-auto">
            {isQuizGame && <PlayerBuzzerButton />}
            {isBioscopeGame && session.id && participantId && (
              <PlayerBioscopeBuzzerButton sessionId={session.id} participantId={participantId} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
