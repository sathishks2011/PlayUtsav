import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppSelector } from '../store/hooks';
import { HostDashboard } from '../screens/HostDashboard';
import { HostLobby } from '../screens/HostLobby';
import { HostQuizPanel } from './HostQuizPanel';
import { HostBioscopePanel } from './HostBioscopePanel';
import { ThemeStudioPanel } from './ThemeStudioPanel';
import { HostSettingsPanel } from './HostSettingsPanel';
import { HostMetricsPanel } from './HostMetricsPanel';
import TemplateManager from './TemplateManager';
import { QuizTemplateManager } from './templates/QuizTemplateManager';
import { BioscopeTemplateManager } from './templates/BioscopeTemplateManager';
import { useBuzzerSync } from '../hooks/useBuzzerSync';

type NavKey = 'dashboard' | 'lobby' | 'control' | 'bioscope' | 'settings' | 'metrics' | 'theme' | 'templates' | 'quiz-templates' | 'bioscope-templates';

type MenuItem = {
  id: NavKey | string;
  label: string;
  requiresSession?: boolean;
  requiresAuth?: boolean;
  children?: MenuItem[];
};

type MenuSection = {
  id: string;
  label: string;
  icon?: string;
  children: MenuItem[];
};

// JSON-like menu structure - can be externalized to a config file later
const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'session',
    label: 'Session',
    icon: '🎮',
    children: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'lobby', label: 'Lobby', requiresSession: true },
    ],
  },
  {
    id: 'games',
    label: 'Games',
    icon: '🎯',
    children: [
      { id: 'control', label: 'Game Control', requiresSession: true },
      { id: 'bioscope', label: 'Bioscope', requiresAuth: true },
      {
        id: 'templates',
        label: 'Templates',
        children: [
          { id: 'quiz-templates', label: 'Quiz Templates' },
          { id: 'bioscope-templates', label: 'Bioscope Templates' },
        ],
      },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    icon: '⚙️',
    children: [
      { id: 'settings', label: 'Settings' },
      { id: 'theme', label: 'Theme Studio' },
      { id: 'metrics', label: 'Metrics' },
    ],
  },
];

export function HostPortal() {
  const [nav, setNav] = useState<NavKey>('dashboard');
  const [expandedSections, setExpandedSections] = useState<string[]>(['session', 'games', 'configuration']);
  const [expandedItems, setExpandedItems] = useState<string[]>(['templates']); // Track child-level expansions
  const session = useAppSelector((s) => s.session.current);
  const user = useAppSelector((s) => s.auth.user);

  const hasActiveSession = Boolean(session);
  const canAccessBioscope = Boolean(session || user);

  useBuzzerSync();

  // Auto switch to Lobby when session becomes active and user is on dashboard
  // Also preserve the nav state when session exists
  useEffect(() => {
    if (session && nav === 'dashboard') {
      setNav('lobby');
    }
  }, [session, nav]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isItemDisabled = (item: MenuItem) => {
    if (item.requiresSession && !session) return true;
    if (item.requiresAuth && item.id === 'bioscope' && !canAccessBioscope) return true;
    return false;
  };

  const handleItemClick = (item: MenuItem) => {
    // If item has children, toggle expansion instead of navigating
    if (item.children && item.children.length > 0) {
      toggleItem(item.id);
    } else {
      // Navigate to the view
      setNav(item.id as NavKey);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
      <aside className="md:sticky md:top-6 h-max rounded-lg border border-[var(--fg)]/20 bg-[var(--card)] p-3 shadow-sm">
        <div className="text-sm uppercase tracking-widest opacity-60 mb-3">
          <FormattedMessage id="host.nav.title" defaultMessage="Host Console" />
        </div>
        <nav className="flex flex-col gap-1">
          {MENU_SECTIONS.map((section) => {
            const isExpanded = expandedSections.includes(section.id);
            return (
              <div key={section.id} className="space-y-1">
                {/* Parent Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded text-left text-sm font-medium border border-transparent hover:bg-[var(--fg)]/5 transition"
                >
                  <span className="flex items-center gap-2">
                    {section.icon && <span className="text-base">{section.icon}</span>}
                    {section.label}
                  </span>
                  <span className="text-xs opacity-60">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </button>

                {/* Child Items */}
                {isExpanded && (
                  <div className="ml-4 pl-2 border-l-2 border-[var(--fg)]/10 space-y-1">
                    {section.children.map((item) => {
                      const isActive = nav === item.id;
                      const disabled = isItemDisabled(item);
                      const hasChildren = item.children && item.children.length > 0;
                      const isItemExpanded = expandedItems.includes(item.id);

                      return (
                        <div key={item.id} className="space-y-1">
                          {/* Child Item */}
                          <button
                            title={item.label}
                            className={`w-full px-3 py-1.5 rounded text-left text-sm border transition flex items-center justify-between ${
                              isActive && !hasChildren
                                ? 'bg-[var(--fg)]/10 border-[var(--fg)]/20 font-medium'
                                : 'border-transparent hover:bg-[var(--fg)]/5'
                            } ${
                              disabled
                                ? 'opacity-40 cursor-not-allowed'
                                : 'cursor-pointer'
                            }`}
                            onClick={() => !disabled && handleItemClick(item)}
                            disabled={disabled}
                          >
                            <span>{item.label}</span>
                            {hasChildren && (
                              <span className="text-xs opacity-60">
                                {isItemExpanded ? '▼' : '▶'}
                              </span>
                            )}
                          </button>

                          {/* Sub-Child Items (3rd level) */}
                          {hasChildren && isItemExpanded && (
                            <div className="ml-4 pl-2 border-l-2 border-[var(--fg)]/10 space-y-1">
                              {item.children!.map((subItem) => {
                                const isSubActive = nav === subItem.id;
                                const subDisabled = isItemDisabled(subItem);
                                return (
                                  <button
                                    key={subItem.id}
                                    title={subItem.label}
                                    className={`w-full px-3 py-1.5 rounded text-left text-xs border transition ${
                                      isSubActive
                                        ? 'bg-[var(--fg)]/10 border-[var(--fg)]/20 font-medium'
                                        : 'border-transparent hover:bg-[var(--fg)]/5'
                                    } ${
                                      subDisabled
                                        ? 'opacity-40 cursor-not-allowed'
                                        : 'cursor-pointer'
                                    }`}
                                    onClick={() => !subDisabled && setNav(subItem.id as NavKey)}
                                    disabled={subDisabled}
                                  >
                                    {subItem.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
        {nav === 'bioscope' && (
          <div className="space-y-4">
            {!hasActiveSession && (
              <div className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/70 p-4 text-sm text-[var(--fg)]/80">
                <FormattedMessage
                  id="host.nav.bioscope.noSession"
                  defaultMessage="Create or restore a session from the dashboard to unlock live Bioscope controls. You can still review templates here while you get set up."
                />
              </div>
            )}
            <HostBioscopePanel />
          </div>
        )}
        {nav === 'settings' && <HostSettingsPanel />}
        {nav === 'metrics' && <HostMetricsPanel />}
        {nav === 'theme' && <ThemeStudioPanel />}
        {nav === 'templates' && <TemplateManager />}
        {nav === 'quiz-templates' && <QuizTemplateManager />}
        {nav === 'bioscope-templates' && <BioscopeTemplateManager />}
      </section>
    </div>
  );
}
