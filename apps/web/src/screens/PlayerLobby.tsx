import { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { resetSession } from '../store/slices/sessionSlice';
import { computeTeamScores } from '@pkg/core';
import { HostQuizPanel } from '../components/HostQuizPanel';
import { ScoreboardPane } from '../components/ScoreboardPane';
import { getSessionSocket } from '../lib/socket';
import { useQuizSync } from '../hooks/useQuizSync';

export function PlayerLobby() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session.current);
  const participantId = useAppSelector((s) => s.session.participantId);
  const status = useAppSelector((s) => s.session.status);
  const error = useAppSelector((s) => s.session.error);

  // Sync quiz state via WebSocket
  useQuizSync();

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
  const scores = computeTeamScores(safeSession as any);

  return (
    <div className="w-full max-w-3xl space-y-6">
      <header className="rounded-xl bg-white/10 backdrop-blur p-6 space-y-2 text-center">
        <h2 className="text-3xl font-bold">
          <FormattedMessage
            id="playerLobby.welcome"
            defaultMessage="Welcome, {name}!"
            values={{ name: me?.displayName ?? 'Player' }}
          />
        </h2>
        <p className="opacity-80">
          <FormattedMessage
            id="playerLobby.waitingForHost"
            defaultMessage="Hang tight while the host sets things up."
          />
        </p>
        <p className="text-sm opacity-60">
          <FormattedMessage id="playerLobby.code" defaultMessage="Session code: {code}" values={{ code: session.code }} />
        </p>
        <button
          onClick={handleLeaveSession}
          className="mt-4 px-4 py-2 text-sm border border-white/20 rounded hover:bg-white/10 transition"
          title="Leave session"
        >
          <FormattedMessage id="playerLobby.leaveSession" defaultMessage="Leave Session" />
        </button>
      </header>

      {/* Scoreboard at the top (above quiz panel) */}
      {scores.length > 0 && (
        <section id="player-scoreboard" className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-3">
          <h3 className="text-xl font-semibold">
            <FormattedMessage id="hostLobby.scoreboard" defaultMessage="Scoreboard" />
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {scores.map(({ team, total, streak }) => (
              <div key={team.id} className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span style={{ color: team.color ?? 'var(--color-accent)' }}>{team.name}</span>
                  <span id={`team-score-${team.id}`} className="font-semibold text-lg">{total}</span>
                </div>
                {streak > 0 && (
                  <div className="text-xs uppercase tracking-[0.2em] text-emerald-200 mt-2">
                    <FormattedMessage id="hostLobby.streak" defaultMessage="Streak: {count}" values={{ count: streak }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-4">
        <h3 className="text-xl font-semibold">
          <FormattedMessage id="playerLobby.players" defaultMessage="Players in lobby" />
        </h3>
        <ul className="space-y-2">
          {participants.map((participant) => (
            <li
              key={participant.id}
              className={`rounded px-3 py-2 border border-white/10 ${
                participant.id === participantId ? 'bg-[var(--color-primary)]/30' : 'bg-white/10'
              }`}
            >
              {participant.displayName}
              {participant.role === 'HOST' && (
                <span className="ml-2 text-xs uppercase tracking-wide opacity-70">
                  <FormattedMessage id="playerLobby.host" defaultMessage="Host" />
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

  {teams.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xl font-semibold">
            <FormattedMessage id="playerLobby.teams" defaultMessage="Teams" />
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {teams.map((team) => (
              <div key={team.id} className="rounded-lg bg-white/10 p-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold" style={{ color: team.color ?? 'var(--color-accent)' }}>
                    {team.name}
                  </h4>
                  <span className="text-xs opacity-70">
                    <FormattedMessage id="playerLobby.memberCount" defaultMessage="{count} members" values={{ count: team.participants.length }} />
                  </span>
                </div>
                <ul className="mt-2 text-sm space-y-1">
                  {team.participants.map((p) => (
                    <li key={p.id}>{p.displayName}</li>
                  ))}
                  {team.participants.length === 0 && (
                    <li className="italic opacity-60">
                      <FormattedMessage id="playerLobby.teamAwaiting" defaultMessage="Awaiting assignments" />
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <HostQuizPanel showHostControls={false} allowPlayerInput={true} />
    </div>
  );
}
