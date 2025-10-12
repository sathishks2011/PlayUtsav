import { FormattedMessage } from 'react-intl';
import { Landing } from './screens/Landing';
import { HostLobby } from './screens/HostLobby';
import { PlayerLobby } from './screens/PlayerLobby';
import { useSessionSync } from './hooks/useSessionSync';
import { useThemeSync } from './hooks/useThemeSync';
import { useLocaleSync } from './hooks/useLocaleSync';
import { useQuizSync } from './hooks/useQuizSync';
import { useAppSelector } from './store/hooks';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { LocaleSwitcher } from './components/LocaleSwitcher';

export default function App() {
  const role = useAppSelector((s) => s.session.role);
  const status = useAppSelector((s) => s.session.status);

  useSessionSync();
  useThemeSync();
  useLocaleSync();
  useQuizSync();

  return (
    <div className="min-h-screen text-[var(--fg)]">
      <header className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <FormattedMessage id="app.title" defaultMessage="PlayUtsav" />
          </h1>
          <p className="text-sm opacity-75">
            <FormattedMessage id="app.subtitle" defaultMessage="Bring everyone together with interactive games." />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.3em] opacity-60">
            <FormattedMessage id="app.pwaLabel" defaultMessage="Progressive Web App" />
          </span>
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
      </header>

      <main className="px-6 pb-10 flex justify-center">
        {role === 'HOST' && <HostLobby />}
        {role === 'PLAYER' && <PlayerLobby />}
        {role === null && status !== 'loading' && <Landing />}
        {status === 'loading' && role === null && (
          <div className="py-20 text-center text-lg opacity-80">
            <FormattedMessage id="app.loading" defaultMessage="Preparing your session…" />
          </div>
        )}
      </main>
    </div>
  );
}

