import { useEffect, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { resetSession } from '../store/slices/sessionSlice';
import { computeTeamScores } from '@pkg/core';
import { HostQuizPanel } from '../components/HostQuizPanel';
import { ScoreboardPane } from '../components/ScoreboardPane';
import { getSessionSocket } from '../lib/socket';
import { useQuizSync } from '../hooks/useQuizSync';
import { useBuzzerSync } from '../hooks/useBuzzerSync';
import { PlayerBuzzerButton } from '../components/PlayerBuzzerButton';
import { TeamNameBadge } from '../components/TeamNameBadge';

export function PlayerLobby() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session.current);
  const participantId = useAppSelector((s) => s.session.participantId);
  const status = useAppSelector((s) => s.session.status);
  const error = useAppSelector((s) => s.session.error);
  const quizCardRef = useRef<HTMLDivElement>(null);

  // Sync quiz state via WebSocket
  useQuizSync();
  useBuzzerSync();

  // Listen for being removed by host
  useEffect(() => {
    if (!participantId) return;

    const handleRemoved = (...args: unknown[]) => {
      const payload = args[0] as { participantId: string };
      if (payload.participantId === participantId) {
        alert('You have been removed from the session by the host.');
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
    if (confirm('Are you sure you want to leave this session?')) {
      dispatch(resetSession());
    }
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
  const quizState = useAppSelector((s) => s.quiz.current);
  const buzzerState = quizState?.buzzerState;
  const isBuzzerOpen = buzzerState?.isOpen || false;
  
  // Debug logging
  console.log('[PlayerLobby] Session has', safeSession.scores.length, 'score records');
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

      {/* Quiz Panel - Full width, always visible */}
      <div ref={quizCardRef}>
        <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
      </div>

      {/* Fixed Buzzer Button at Bottom - Only visible when buzzer is open */}
      {session.playerEngagementType === 'BUZZER' && isBuzzerOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent pt-4 pb-6 px-6 z-50">
          <div className="max-w-3xl mx-auto">
            <PlayerBuzzerButton />
          </div>
        </div>
      )}
    </div>
  );
}
