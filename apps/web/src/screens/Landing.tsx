import { FormEvent, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createSessionThunk, joinSessionThunk, setError } from '../store/slices/sessionSlice';
import { FormattedMessage, useIntl } from 'react-intl';

export function Landing() {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const status = useAppSelector((s) => s.session.status);
  const error = useAppSelector((s) => s.session.error);
  const [hostName, setHostName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const isBusy = status === 'loading';

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    dispatch(setError(undefined));
    dispatch(createSessionThunk({ hostName: hostName || undefined, maxPlayers }));
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode || !playerName) return;
    dispatch(setError(undefined));
    dispatch(joinSessionThunk({ code: joinCode.toUpperCase(), displayName: playerName.trim() }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={onJoin} className="rounded-2xl bg-[var(--card)] backdrop-blur p-8 space-y-4 shadow-lg">
        <h2 className="text-2xl font-bold">
          <FormattedMessage id="landing.joinTitle" defaultMessage="Join a game" />
        </h2>
        <p className="text-sm opacity-80">
          <FormattedMessage id="landing.joinDescription" defaultMessage="Enter the code shared by your host to join the fun." />
        </p>
        <label className="flex flex-col gap-1 text-sm uppercase tracking-wide text-xs opacity-80">
          <span><FormattedMessage id="landing.code" defaultMessage="Game code" /></span>
          <input
            className="rounded border border-white/20 bg-black/20 px-3 py-2 text-lg tracking-[0.4em] text-center"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span><FormattedMessage id="landing.playerName" defaultMessage="Your name" /></span>
          <input
            className="rounded border border-white/20 bg-black/20 px-3 py-2"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder={intl.formatMessage({ id: 'landing.playerNamePlaceholder', defaultMessage: 'Nickname' })}
          />
        </label>
        <button type="submit" className="px-4 py-2 rounded bg-[var(--color-accent)] text-black font-semibold" disabled={isBusy}>
          {isBusy ? (
            <FormattedMessage id="landing.joining" defaultMessage="Joining..." />
          ) : (
            <FormattedMessage id="landing.join" defaultMessage="Join session" />
          )}
        </button>
        {error && <p className="text-sm text-red-300">{error}</p>}
      </form>
    </div>
  );
}


