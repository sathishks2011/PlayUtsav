import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Team } from '@pkg/core';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addTeamThunk, removeParticipantThunk, resetSession, assignParticipantToTeamThunk } from '../store/slices/sessionSlice';
import { HostQuizPanel } from '../components/HostQuizPanel';
import { ThemeStudioPanel } from '../components/ThemeStudioPanel';
import { computeTeamScores } from '@pkg/core';

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
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const [teamName, setTeamName] = useState('');
  const [color, setColor] = useState('#5b8cff');

  if (!session) return null;

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    dispatch(addTeamThunk({ sessionId: session.id, name: teamName.trim(), color }));
    setTeamName('');
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
    if (confirm(`Remove ${displayName} from the session?`)) {
      dispatch(removeParticipantThunk({ sessionId: session.id, participantId }));
    }
  };

  const handleAssignToTeam = (participantId: string, teamId: string | null) => {
    dispatch(assignParticipantToTeamThunk({ sessionId: session.id, participantId, teamId }));
  };

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

      {scores.length > 0 && (
        <section id="host-scoreboard" className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-3">
          <h3 className="text-xl font-semibold">
            <FormattedMessage id="hostLobby.scoreboard" defaultMessage="Scoreboard" />
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {scores.map(({ team, total, streak }) => (
              <div key={team.id} className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: team.color ?? 'var(--color-primary)' }}>
                    {team.name}
                  </span>
                  <span id={`team-score-${team.id}`} className="text-xl font-bold">{total}</span>
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

      <HostQuizPanel />
      <ThemeStudioPanel />
    </div>
  );
}


