import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppSelector } from '../store/hooks';
import { HostDashboard } from '../screens/HostDashboard';
import { HostLobby } from '../screens/HostLobby';
import { HostQuizPanel } from './HostQuizPanel';
import { ThemeStudioPanel } from './ThemeStudioPanel';
import { HostSettingsPanel } from './HostSettingsPanel';
import { HostMetricsPanel } from './HostMetricsPanel';

type NavKey = 'dashboard' | 'lobby' | 'control' | 'settings' | 'metrics' | 'theme';

export function HostPortal() {
  const [nav, setNav] = useState<NavKey>('dashboard');
  const session = useAppSelector((s) => s.session.current);

  // Auto switch to Lobby when session becomes active and user is on dashboard
  // Also preserve the nav state when session exists
  useEffect(() => {
    if (session && nav === 'dashboard') {
      setNav('lobby');
    }
  }, [session, nav]);

  return (
    <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
      <aside className="md:sticky md:top-6 h-max rounded-lg border border-[var(--fg)]/10 bg-[var(--card)] p-3">
        <div className="text-sm uppercase tracking-widest opacity-60 mb-2">
          <FormattedMessage id="host.nav.title" defaultMessage="Host Console" />
        </div>
        <nav className="flex md:flex-col gap-2">
          <button title="Dashboard" className={`px-3 py-2 rounded text-left border ${nav==='dashboard'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'}`} onClick={() => setNav('dashboard')}>
            <FormattedMessage id="host.nav.dashboard" defaultMessage="Dashboard" />
          </button>
          <button title="Lobby" className={`px-3 py-2 rounded text-left border ${nav==='lobby'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'} ${!session ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => setNav('lobby')} disabled={!session}>
            <FormattedMessage id="host.nav.lobby" defaultMessage="Lobby" />
          </button>
          <button title="Game Control" className={`px-3 py-2 rounded text-left border ${nav==='control'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'} ${!session ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => setNav('control')} disabled={!session}>
            <FormattedMessage id="host.nav.control" defaultMessage="Game Control" />
          </button>
          <button title="Settings" className={`px-3 py-2 rounded text-left border ${nav==='settings'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'}`} onClick={() => setNav('settings')}>
            <FormattedMessage id="host.nav.settings" defaultMessage="Settings" />
          </button>
          <button title="Metrics" className={`px-3 py-2 rounded text-left border ${nav==='metrics'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'}`} onClick={() => setNav('metrics')}>
            <FormattedMessage id="host.nav.metrics" defaultMessage="Metrics" />
          </button>
          <button title="Theme Studio" className={`px-3 py-2 rounded text-left border ${nav==='theme'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'}`} onClick={() => setNav('theme')}>
            <FormattedMessage id="host.nav.theme" defaultMessage="Theme Studio" />
          </button>
        </nav>
      </aside>
      <section className="space-y-4">
        {nav === 'dashboard' && <HostDashboard />}
        {nav === 'lobby' && session && <HostLobby />}
        {nav === 'control' && session && (
          <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--card)] p-4">
            <h3 className="text-xl font-semibold mb-3"><FormattedMessage id="host.control.title" defaultMessage="Host Game Control" /></h3>
            <HostQuizPanel />
          </div>
        )}
        {nav === 'settings' && <HostSettingsPanel />}
        {nav === 'metrics' && <HostMetricsPanel />}
        {nav === 'theme' && <ThemeStudioPanel />}
      </section>
    </div>
  );
}
