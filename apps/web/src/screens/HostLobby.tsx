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
    <div className="rounded-lg border border-white/10 p-2 bg-white/5 backdrop-blur">
      <div className="flex justify-between items-center gap-1">
        <h3 className="text-xs font-semibold truncate" style={{ color: team.color ?? 'var(--color-primary)' }}>
          {team.name}
        </h3>
        <span className="text-xs opacity-60 whitespace-nowrap">
          {team.participants.length}
        </span>
      </div>
      <ul className="mt-1 text-xs space-y-0.5">
        {team.participants.slice(0, 3).map((p) => (
          <li key={p.id} className="opacity-70 truncate">{p.displayName}</li>
        ))}
        {team.participants.length > 3 && (
          <li className="opacity-50 italic">+{team.participants.length - 3} more</li>
        )}
        {team.participants.length === 0 && (
          <li className="italic opacity-40 text-xs">
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
    <div className="w-full max-w-5xl space-y-3">
      <header className="rounded-lg bg-white/10 backdrop-blur p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">
            <FormattedMessage id="hostLobby.title" defaultMessage="Session code" />: {session.code}
          </h2>
          <p className="opacity-70 text-xs">
            <FormattedMessage id="hostLobby.instructions" defaultMessage="Share this code or QR with your family." />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch(resetSession())}
            className="px-2 py-1 text-xs rounded border border-white/20 text-white hover:bg-white/10 transition"
          >
            <FormattedMessage id="hostLobby.backToDashboard" defaultMessage="← Dashboard" />
          </button>
          <button className="px-2 py-1 text-xs rounded bg-[var(--color-primary)] text-white" onClick={copyCode}>
            <FormattedMessage id="hostLobby.copy" defaultMessage="Copy" />
          </button>
          <span className="text-xs opacity-70">
            <FormattedMessage
              id="hostLobby.players"
              defaultMessage="{count}/{max} joined"
              values={{ count: lobbyParticipants.length, max: session.maxPlayers }}
            />
          </span>
        </div>
      </header>

      <section className="grid gap-2 md:grid-cols-2">
        <div className="rounded-lg bg-white/5 backdrop-blur p-3 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            <FormattedMessage id="hostLobby.participants" defaultMessage="Lobby participants" />
          </h3>
          <ul className="space-y-1 max-h-32 overflow-auto pr-1">
            {lobbyParticipants.map((p) => (
              <li key={p.id} className="rounded bg-white/10 px-2 py-1 flex items-center justify-between gap-2 text-xs">
                <span className="flex-shrink-0">{p.displayName}</span>
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <select
                    value={p.teamId ?? ''}
                    onChange={(e) => handleAssignToTeam(p.id, e.target.value || null)}
                    className="text-xs px-1.5 py-0.5 rounded border border-white/20 bg-black/30 min-w-[100px]"
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
                    className="px-1.5 py-0.5 text-xs border border-red-400/50 text-red-300 rounded hover:bg-red-500/20 transition"
                    title={`Remove ${p.displayName}`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
            {lobbyParticipants.length === 0 && (
              <li className="italic opacity-60 text-xs">
                <FormattedMessage id="hostLobby.waiting" defaultMessage="Waiting for players..." />
              </li>
            )}
          </ul>
        </div>

        <form onSubmit={handleAddTeam} className="rounded-lg bg-white/5 backdrop-blur p-3 space-y-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide">
              <FormattedMessage id="hostLobby.createTeam" defaultMessage="Create a team" />
            </h3>
            <p className="text-xs opacity-60">
              <FormattedMessage id="hostLobby.createTeamHint" defaultMessage="Add teams now or later during the game." />
            </p>
          </div>

          {(teamError || sessionError) && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-200">
              {teamError || sessionError}
            </div>
          )}

          <label className="flex flex-col gap-0.5 text-xs">
            <span><FormattedMessage id="hostLobby.teamName" defaultMessage="Team name" /></span>
            <input
              className="rounded border border-white/20 bg-black/20 px-2 py-1 text-xs"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={intl.formatMessage({ id: 'hostLobby.teamNamePlaceholder', defaultMessage: 'e.g., Lightning Lions' })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span><FormattedMessage id="hostLobby.teamColor" defaultMessage="Team color" /></span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-10 border border-white/30 rounded" />
          </label>
          <button type="submit" className="self-start px-2 py-1 text-xs rounded bg-[var(--color-primary)] text-white">
            <FormattedMessage id="hostLobby.addTeam" defaultMessage="Add team" />
          </button>
        </form>
      </section>

      <div className="rounded-lg border border-white/20 bg-white/5 p-2">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            <FormattedMessage id="hostLobby.teams" defaultMessage="Teams" />
          </h3>
          {session.teams.length === 0 && (
            <p className="italic opacity-60 text-xs">
              <FormattedMessage id="hostLobby.noTeams" defaultMessage="No teams yet. Add one to get started." />
            </p>
          )}
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
            {session.teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      </div>

      {/* Overall Leaderboard - Shows cumulative scores across all games */}
      {session.teams.length > 0 && (
        <section className="rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 backdrop-blur p-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🏆</span>
            <h3 className="text-xs font-semibold uppercase tracking-wide">
              <FormattedMessage id="hostLobby.overallLeaderboard" defaultMessage="Overall Leaderboard" />
            </h3>
          </div>
          <div className="space-y-1">
            {(() => {
              // Compute overall scores across all games
              const overallScores = computeTeamScores(session);
              // Sort by total score descending
              const sortedScores = [...overallScores].sort((a, b) => b.total - a.total);

              return sortedScores.map(({ team, total }, index) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between px-2 py-1 rounded bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold opacity-60 w-5 text-center">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: team.color || 'var(--color-primary)' }}
                      />
                      <span className="font-semibold text-xs">{team.name}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold">{total}</span>
                </div>
              ));
            })()}
          </div>
        </section>
      )}

      {/* Game Control Panel - Shows all games with scores and navigation */}
      {session.games && session.games.length > 0 && (
        <section className="rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/20 backdrop-blur p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide">
              <FormattedMessage id="hostLobby.gameControl" defaultMessage="Game Control" />
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (session.activeGameIndex > 0) {
                    dispatch(setActiveGameIndex(session.activeGameIndex - 1));
                  }
                }}
                disabled={session.activeGameIndex === 0}
                className="px-2 py-1 text-xs rounded border border-white/20 text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="px-2 py-1 text-xs rounded border border-white/20 text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FormattedMessage id="hostLobby.nextGame" defaultMessage="Next" /> →
              </button>
              <button
                onClick={handleResetAllGames}
                disabled={isResetting}
                className={`px-2 py-1 text-xs rounded border transition ${
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
          <div className="grid gap-1.5 md:grid-cols-3 lg:grid-cols-4">
            {session.games.map((game, idx) => (
              <div
                key={game.id}
                className={`rounded-lg border p-2 transition-all cursor-pointer ${
                  idx === session.activeGameIndex
                    ? 'bg-white/10 border-green-500/50 shadow-lg shadow-green-500/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                }`}
                onClick={() => {
                  console.log('[HostLobby] Switching to game index:', idx, 'Game:', game.name);
                  dispatch(setActiveGameIndex(idx));
                }}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{game.type === 'quiz' ? '📝' : '🎬'}</span>
                    <div>
                      <h4 className="font-semibold text-xs truncate">{game.name}</h4>
                      <p className="text-xs opacity-40">
                        {game.type === 'quiz' ? 'Quiz' : 'Bioscope'}
                      </p>
                    </div>
                  </div>
                  {idx === session.activeGameIndex && (
                    <span className="px-1 py-0.5 text-xs rounded bg-green-500/20 text-green-600 border border-green-500/30 whitespace-nowrap">
                      Active
                    </span>
                  )}
                </div>

                {/* Team Scores for this game */}
                {(() => {
                  // Compute scores filtered by this specific game's type
                  const gameScores = computeTeamScores(session, game.type);
                  return gameScores.length > 0 && (
                    <div className="space-y-0.5 pt-1.5 border-t border-white/10">
                      <p className="text-xs uppercase tracking-wider opacity-40 mb-0.5">Scores</p>
                      {gameScores.map(({ team, total }) => (
                        <div key={team.id} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 truncate">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: team.color || 'var(--color-primary)' }}
                            />
                            <span className="truncate">{team.name}</span>
                          </span>
                          <span className="font-bold ml-1">{total}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Game Card - Only render the currently active game */}
      <div className="space-y-2">
        {session.games && session.games.length > 0 ? (
          (() => {
            const activeGame = session.games[session.activeGameIndex];
            if (!activeGame) {
              return <div className="text-center text-xs opacity-60">No active game selected.</div>;
            }

            return (
              <div className="!rounded-lg !border !border-white/20 !bg-white/5 !p-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm font-semibold">{activeGame.type === 'quiz' ? '📝' : '🎬'} {activeGame.name}</span>
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-600 border border-green-500/30">Active</span>
                </div>
                {/* Render the appropriate game panel based on type */}
                <div className="[&>*]:!p-0 [&>*]:!bg-transparent [&>*]:!border-0 [&>*]:!rounded-none">
                  {activeGame.type === 'quiz' && (
                    <ErrorBoundary fallback={
                      <div className="rounded-lg border border-red-800 bg-red-900/20 p-2 text-center">
                        <p className="text-red-200 text-xs">Quiz panel failed to load. Please refresh the page.</p>
                      </div>
                    }>
                      <HostQuizPanel />
                    </ErrorBoundary>
                  )}
                  {activeGame.type === 'bioscope' && (
                    <ErrorBoundary fallback={
                      <div className="rounded-lg border border-red-800 bg-red-900/20 p-2 text-center">
                        <p className="text-red-200 text-xs">Bioscope panel failed to load. Please refresh the page.</p>
                      </div>
                    }>
                      <HostBioscopePanel />
                    </ErrorBoundary>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="text-center text-xs opacity-60">No games attached to this session.</div>
        )}
      </div>

      <div className="rounded-lg border border-white/20 bg-white/5 p-2">
        <HostBuzzerControls />
      </div>
      <ThemeStudioPanel />
    </div>
  );
}


