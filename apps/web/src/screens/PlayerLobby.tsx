import { FormattedMessage } from 'react-intl';
import { useAppSelector } from '../store/hooks';

export function PlayerLobby() {
  const session = useAppSelector((s) => s.session.current);
  const participantId = useAppSelector((s) => s.session.participantId);

  if (!session) return null;

  const me = session.participants.find((p) => p.id === participantId);

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
      </header>

      <section className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-4">
        <h3 className="text-xl font-semibold">
          <FormattedMessage id="playerLobby.players" defaultMessage="Players in lobby" />
        </h3>
        <ul className="space-y-2">
          {session.participants.map((participant) => (
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

      {session.teams.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xl font-semibold">
            <FormattedMessage id="playerLobby.teams" defaultMessage="Teams" />
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {session.teams.map((team) => (
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
    </div>
  );
}

