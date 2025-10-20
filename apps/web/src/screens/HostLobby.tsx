import { useState, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Team } from '@pkg/core';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addTeamThunk, removeParticipantThunk, resetSession, assignParticipantToTeamThunk, setActiveGameIndex } from '../store/slices/sessionSlice';
import { useToast } from '../components/ToastProvider';
import { HostQuizPanel } from '../components/HostQuizPanel';
import { HostBioscopePanel } from '../components/HostBioscopePanel';
import { HostBuzzerControls } from '../components/HostBuzzerControls';
import { clearQuiz } from '../store/slices/quizSlice';
import { resetBioscope } from '../store/slices/bioscopeSlice';
import { ThemeStudioPanel } from '../components/ThemeStudioPanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { computeTeamScores } from '@pkg/core';
import { resetAllGames } from '../lib/api';

function TeamCard({ team }: { team: Team }) {
  return (
    <div className="rounded-lg border border-white/10 p-4 bg-white/5 backdrop-blur">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold" style={{ color: team.color ?? 'var(--color-primary)' }}>
          {team.name}
        </h3>
        <span className="text-sm opacity-70">
          <FormattedMessage id="hostLobby.members" defaultMessage="{count} members" values={{ count: team.participants.length }} />
        </span>
      </div>
      <ul className="mt-2 text-sm space-y-1">
        {team.participants.map((p) => (
          <li key={p.id} className="opacity-80">{p.displayName}</li>
        ))}
        {team.participants.length === 0 && (
          <li className="italic opacity-50">
            <FormattedMessage id="hostLobby.emptyTeam" defaultMessage="No members yet" />
          </li>
        )}
      </ul>
    </div>
  );
}

export function HostLobby() {
  const session = useAppSelector((s) => s.session.current);
  const sessionError = useAppSelector((s) => s.session.error);
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const [teamName, setTeamName] = useState('');
  const [color, setColor] = useState('#5b8cff');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const toast = useToast();

  if (!session) return null;

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    
    setTeamError(null);
    try {
      await dispatch(addTeamThunk({ sessionId: session.id, name: teamName.trim(), color })).unwrap();
      setTeamName('');
      console.log('[HostLobby] Team added successfully');
    } catch (error) {
      console.error('[HostLobby] Failed to add team:', error);
      setTeamError(error instanceof Error ? error.message : 'Failed to add team');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.code);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  const lobbyParticipants = session.participants.filter((p) => p.role !== 'HOST');
  const scores = computeTeamScores(session);

  const handleRemoveParticipant = (participantId: string, displayName: string) => {
    // Non-blocking remove: dispatch immediately and show toast
    dispatch(removeParticipantThunk({ sessionId: session.id, participantId }))
      .then(() => toast.showToast({ message: `${displayName} removed`, type: 'success', duration: 3000 }))
      .catch(() => toast.showToast({ message: `Failed to remove ${displayName}`, type: 'error', duration: 5000 }));
  };

  const handleAssignToTeam = (participantId: string, teamId: string | null) => {
    dispatch(assignParticipantToTeamThunk({ sessionId: session.id, participantId, teamId }));
  };

  const handleResetAllGames = useCallback(async () => {
    setIsResetting(true);
    toast.showToast({
      message: intl.formatMessage({ id: 'hostLobby.resettingGames', defaultMessage: 'Resetting all games…' }),
      type: 'info',
      duration: 2500,
    });

    try {
      await resetAllGames(session.id);
      dispatch(setActiveGameIndex(0));
      dispatch(clearQuiz());
      dispatch(resetBioscope());
      toast.showToast({
        message: intl.formatMessage({ id: 'hostLobby.resetGamesSuccess', defaultMessage: 'All games reset successfully.' }),
        type: 'success',
        duration: 3500,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : intl.formatMessage({ id: 'hostLobby.resetGamesError', defaultMessage: 'Failed to reset games.' });
      toast.showToast({ message, type: 'error', duration: 5000 });
    } finally {
      setIsResetting(false);
    }
  }, [dispatch, intl, toast, session.id]);

  return (
    <div className="w-full max-w-5xl space-y-6">
      <header className="rounded-xl bg-white/10 backdrop-blur p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            <FormattedMessage id="hostLobby.title" defaultMessage="Session code" />: {session.code}
          </h2>
          <p className="opacity-80 text-sm">
            <FormattedMessage id="hostLobby.instructions" defaultMessage="Share this code or QR with your family." />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(resetSession())}
            className="px-4 py-2 rounded border border-white/20 text-white hover:bg-white/10 transition"
          >
            <FormattedMessage id="hostLobby.backToDashboard" defaultMessage="← Dashboard" />
          </button>
          <button className="px-4 py-2 rounded bg-[var(--color-primary)] text-white" onClick={copyCode}>
            <FormattedMessage id="hostLobby.copy" defaultMessage="Copy" />
          </button>
          <span className="text-sm opacity-70">
            <FormattedMessage
              id="hostLobby.players"
              defaultMessage="{count}/{max} joined"
              values={{ count: lobbyParticipants.length, max: session.maxPlayers }}
            />
          </span>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-3">
          <h3 className="text-xl font-semibold">
            <FormattedMessage id="hostLobby.participants" defaultMessage="Lobby participants" />
          </h3>
          <ul className="space-y-2 max-h-56 overflow-auto pr-2">
            {lobbyParticipants.map((p) => (
              <li key={p.id} className="rounded bg-white/10 px-3 py-2 flex items-center justify-between gap-2">
                <span className="flex-shrink-0">{p.displayName}</span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <select
                    value={p.teamId ?? ''}
                    onChange={(e) => handleAssignToTeam(p.id, e.target.value || null)}
                    className="text-sm px-2 py-1 rounded border border-white/20 bg-black/30 min-w-[120px]"
                    title={`Assign ${p.displayName} to team`}
                  >
                    <option value="">
                      {intl.formatMessage({ id: 'hostLobby.noTeam', defaultMessage: 'No team' })}
                    </option>
                    {session.teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveParticipant(p.id, p.displayName)}
                    className="px-2 py-1 text-xs border border-red-400/50 text-red-300 rounded hover:bg-red-500/20 transition"
                    title={`Remove ${p.displayName}`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
            {lobbyParticipants.length === 0 && (
              <li className="italic opacity-60">
                <FormattedMessage id="hostLobby.waiting" defaultMessage="Waiting for players..." />
              </li>
            )}
          </ul>
        </div>

        <form onSubmit={handleAddTeam} className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-4">
          <div>
            <h3 className="text-xl font-semibold">
              <FormattedMessage id="hostLobby.createTeam" defaultMessage="Create a team" />
            </h3>
            <p className="text-sm opacity-70">
              <FormattedMessage id="hostLobby.createTeamHint" defaultMessage="Add teams now or later during the game." />
            </p>
          </div>
          
          {(teamError || sessionError) && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {teamError || sessionError}
            </div>
          )}
          
          <label className="flex flex-col gap-1 text-sm">
            <span><FormattedMessage id="hostLobby.teamName" defaultMessage="Team name" /></span>
            <input
              className="rounded border border-white/20 bg-black/20 px-3 py-2"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={intl.formatMessage({ id: 'hostLobby.teamNamePlaceholder', defaultMessage: 'e.g., Lightning Lions' })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span><FormattedMessage id="hostLobby.teamColor" defaultMessage="Team color" /></span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 border border-white/30 rounded" />
          </label>
          <button type="submit" className="self-start px-4 py-2 rounded bg-[var(--color-primary)] text-white">
            <FormattedMessage id="hostLobby.addTeam" defaultMessage="Add team" />
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">
          <FormattedMessage id="hostLobby.teams" defaultMessage="Teams" />
        </h3>
        {session.teams.length === 0 && (
          <p className="italic opacity-70">
            <FormattedMessage id="hostLobby.noTeams" defaultMessage="No teams yet. Add one to get started." />
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {session.teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </section>

      {/* Game Control Panel - Shows all games with scores and navigation */}
      {session.games && session.games.length > 0 && (
        <section className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/20 backdrop-blur p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              <FormattedMessage id="hostLobby.gameControl" defaultMessage="Game Control" />
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (session.activeGameIndex > 0) {
                    dispatch(setActiveGameIndex(session.activeGameIndex - 1));
                  }
                }}
                disabled={session.activeGameIndex === 0}
                className="px-3 py-1.5 text-sm rounded border border-white/20 text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← <FormattedMessage id="hostLobby.previousGame" defaultMessage="Previous" />
              </button>
              <button
                onClick={() => {
                  if (session.activeGameIndex < session.games.length - 1) {
                    dispatch(setActiveGameIndex(session.activeGameIndex + 1));
                  }
                }}
                disabled={session.activeGameIndex === session.games.length - 1}
                className="px-3 py-1.5 text-sm rounded border border-white/20 text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FormattedMessage id="hostLobby.nextGame" defaultMessage="Next" /> →
              </button>
              <button
                onClick={handleResetAllGames}
                disabled={isResetting}
                className={`px-3 py-1.5 text-sm rounded border transition ${
                  isResetting
                    ? 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed opacity-60'
                    : 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                }`}
              >
                {isResetting ? (
                  <FormattedMessage id="hostLobby.resetting" defaultMessage="Resetting…" />
                ) : (
                  <FormattedMessage id="hostLobby.resetGames" defaultMessage="Reset All" />
                )}
              </button>
            </div>
          </div>

          {/* Game Score Cards */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {session.games.map((game, idx) => (
              <div
                key={game.id}
                className={`rounded-lg border p-4 transition-all cursor-pointer ${
                  idx === session.activeGameIndex
                    ? 'bg-white/10 border-green-500/50 shadow-lg shadow-green-500/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                }`}
                onClick={() => {
                  console.log('[HostLobby] Switching to game index:', idx, 'Game:', game.name);
                  dispatch(setActiveGameIndex(idx));
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{game.type === 'quiz' ? '📝' : '🎬'}</span>
                    <div>
                      <h4 className="font-semibold">{game.name}</h4>
                      <p className="text-xs opacity-60">
                        {game.type === 'quiz' ? 'Quiz Game' : 'Bioscope Game'}
                      </p>
                    </div>
                  </div>
                  {idx === session.activeGameIndex && (
                    <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-600 border border-green-500/30">
                      Active
                    </span>
                  )}
                </div>

                {/* Team Scores for this game */}
                {scores.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <p className="text-xs uppercase tracking-wider opacity-60 mb-2">Team Scores</p>
                    {scores.map(({ team, total }) => (
                      <div key={team.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team.color || 'var(--color-primary)' }}
                          />
                          {team.name}
                        </span>
                        <span className="font-bold">{total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Game Card - Only render the currently active game */}
      <div className="space-y-6 mt-6">
        {session.games && session.games.length > 0 ? (
          (() => {
            const activeGame = session.games[session.activeGameIndex];
            if (!activeGame) {
              return <div className="text-center text-sm opacity-60">No active game selected.</div>;
            }

            return (
              <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold">{activeGame.type === 'quiz' ? '📝' : '🎬'} {activeGame.name}</span>
                  <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-600">Active</span>
                </div>
                {/* Render the appropriate game panel based on type */}
                {activeGame.type === 'quiz' && (
                  <ErrorBoundary fallback={
                    <div className="rounded-xl border border-red-800 bg-red-900/20 p-5 text-center">
                      <p className="text-red-200">Quiz panel failed to load. Please refresh the page.</p>
                    </div>
                  }>
                    <HostQuizPanel />
                  </ErrorBoundary>
                )}
                {activeGame.type === 'bioscope' && (
                  <ErrorBoundary fallback={
                    <div className="rounded-xl border border-red-800 bg-red-900/20 p-5 text-center">
                      <p className="text-red-200">Bioscope panel failed to load. Please refresh the page.</p>
                    </div>
                  }>
                    <HostBioscopePanel />
                  </ErrorBoundary>
                )}
              </div>
            );
          })()
        ) : (
          <div className="text-center text-sm opacity-60">No games attached to this session.</div>
        )}
      </div>

      <HostBuzzerControls />
      <ThemeStudioPanel />
    </div>
  );
}


