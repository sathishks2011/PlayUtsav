import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppSelector } from '../store/hooks';
import { HostDashboard } from '../screens/HostDashboard';
import { HostLobby } from '../screens/HostLobby';
import { HostQuizPanel } from './HostQuizPanel';
import { ThemeStudioPanel } from './ThemeStudioPanel';
import { HostSettingsPanel } from './HostSettingsPanel';
import { HostMetricsPanel } from './HostMetricsPanel';
import TemplateManager from './TemplateManager';
import { useBuzzerSync } from '../hooks/useBuzzerSync';

type NavKey = 'dashboard' | 'lobby' | 'control' | 'settings' | 'metrics' | 'theme' | 'templates';

export function HostPortal() {
  const [nav, setNav] = useState<NavKey>('dashboard');
  const session = useAppSelector((s) => s.session.current);

  useBuzzerSync();

  // Auto switch to Lobby when session becomes active and user is on dashboard
  // Also preserve the nav state when session exists
  useEffect(() => {
    if (session && nav === 'dashboard') {
      setNav('lobby');
    }
  }, [session, nav]);

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
      <aside className="md:sticky md:top-6 h-max rounded-lg border border-[var(--fg)]/20 bg-[var(--card)] p-3 shadow-sm">
        <div className="text-sm uppercase tracking-widest opacity-60 mb-3">
          <FormattedMessage id="host.nav.title" defaultMessage="Host Console" />
        </div>
        <nav className="flex flex-row md:flex-col gap-2">
          <button title="Dashboard" className={`px-3 py-2 rounded text-left border whitespace-nowrap ${nav==='dashboard'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'}`} onClick={() => setNav('dashboard')}>
            <FormattedMessage id="host.nav.dashboard" defaultMessage="Dashboard" />
          </button>
          <button title="Lobby" className={`px-3 py-2 rounded text-left border whitespace-nowrap ${nav==='lobby'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'} ${!session ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => setNav('lobby')} disabled={!session}>
            <FormattedMessage id="host.nav.lobby" defaultMessage="Lobby" />
          </button>
          <button title="Game Control" className={`px-3 py-2 rounded text-left border whitespace-nowrap ${nav==='control'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'} ${!session ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => setNav('control')} disabled={!session}>
            <FormattedMessage id="host.nav.control" defaultMessage="Game Control" />
          </button>
          <button title="Settings" className={`px-3 py-2 rounded text-left border whitespace-nowrap ${nav==='settings'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'}`} onClick={() => setNav('settings')}>
            <FormattedMessage id="host.nav.settings" defaultMessage="Settings" />
          </button>
          <button title="Metrics" className={`px-3 py-2 rounded text-left border whitespace-nowrap ${nav==='metrics'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'}`} onClick={() => setNav('metrics')}>
            <FormattedMessage id="host.nav.metrics" defaultMessage="Metrics" />
          </button>
          <button title="Theme Studio" className={`px-3 py-2 rounded text-left border whitespace-nowrap ${nav==='theme'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'}`} onClick={() => setNav('theme')}>
            <FormattedMessage id="host.nav.theme" defaultMessage="Theme Studio" />
          </button>
          <button title="Quiz Templates" className={`px-3 py-2 rounded text-left border whitespace-nowrap ${nav==='templates'?'bg-[var(--fg)]/10 border-[var(--fg)]/20':'border-transparent hover:bg-[var(--fg)]/5'}`} onClick={() => setNav('templates')}>
            <FormattedMessage id="host.nav.templates" defaultMessage="Templates" />
          </button>
        </nav>
      </aside>
      <section className="space-y-4">
        {nav === 'dashboard' && <HostDashboard />}
        {nav === 'lobby' && session && <HostLobby />}
        {nav === 'control' && session && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--card)] p-4">
              <h3 className="text-xl font-semibold mb-3"><FormattedMessage id="host.control.title" defaultMessage="Host Game Control" /></h3>
              <HostQuizPanel />
            </div>
          </div>
        )}
        {nav === 'settings' && <HostSettingsPanel />}
        {nav === 'metrics' && <HostMetricsPanel />}
        {nav === 'theme' && <ThemeStudioPanel />}
        {nav === 'templates' && <TemplateManager />}
      </section>
    </div>
  );
}
