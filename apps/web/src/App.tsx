import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Landing } from './screens/Landing';
import { HostLobby } from './screens/HostLobby';
import { PlayerLobby } from './screens/PlayerLobby';
import { HostLogin } from './screens/HostLogin';
import { HostSignup } from './screens/HostSignup';
import { HostDashboard } from './screens/HostDashboard';
import { HostPortal } from './components/HostPortal';
import { ScoreAnimation } from './components/ScoreAnimation';
import { useSessionSync } from './hooks/useSessionSync';
import { useThemeSync } from './hooks/useThemeSync';
import { useLocaleSync } from './hooks/useLocaleSync';
import { useQuizSync } from './hooks/useQuizSync';
import { useSoundManager } from './hooks/useSoundManager';
import { usePlayerSessionRestore } from './hooks/usePlayerSessionRestore';
import { useAuth } from './hooks/useAuth';
import { useAppSelector } from './store/hooks';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { LocaleSwitcher } from './components/LocaleSwitcher';

type View = 'landing' | 'host-login' | 'host-signup' | 'host-dashboard';

export default function App() {
  const role = useAppSelector((s) => s.session.role);
  const status = useAppSelector((s) => s.session.status);
  const { user, isAuthenticated } = useAuth();
  const [view, setView] = useState<View>('landing');

  usePlayerSessionRestore();
  const { scoreAnimation } = useSessionSync();
  useThemeSync();
  useLocaleSync();
  useQuizSync();
  useSoundManager();

  // Auto-navigate authenticated hosts to dashboard
  if (isAuthenticated && user?.role === 'HOST' && view !== 'host-dashboard' && role !== 'HOST') {
    setView('host-dashboard');
  }

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
        {/* Session Views - Active Session */}
  {role === 'HOST' && <HostPortal />}
  {role === 'PLAYER' && <PlayerLobby />}

        {/* Auth Views - Host Portal */}
        {role === null && view === 'host-login' && (
          <HostLogin
            onSwitchToSignup={() => setView('host-signup')}
            onCancel={() => setView('landing')}
          />
        )}
        {role === null && view === 'host-signup' && (
          <HostSignup
            onSwitchToLogin={() => setView('host-login')}
            onCancel={() => setView('landing')}
          />
        )}
  {role === null && view === 'host-dashboard' && isAuthenticated && <HostPortal />}

        {/* Landing - Player Join or Host CTA */}
        {role === null && view === 'landing' && status !== 'loading' && (
          <div className="w-full max-w-5xl space-y-4">
            {/* Host CTA */}
            {!isAuthenticated && (
              <div className="bg-[var(--card)] rounded-lg shadow-lg p-6 text-center">
                <h3 className="text-xl font-semibold mb-2">
                  <FormattedMessage id="landing.hostCTA" defaultMessage="Want to host a session?" />
                </h3>
                <p className="text-sm opacity-75 mb-4">
                  <FormattedMessage
                    id="landing.hostCTADesc"
                    defaultMessage="Create an account to manage sessions, teams, and games"
                  />
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setView('host-login')}
                    className="px-6 py-2 border border-[var(--fg)]/20 rounded font-medium hover:bg-[var(--fg)]/5 transition"
                    title="Sign in"
                  >
                    <FormattedMessage id="auth.login.link" defaultMessage="Sign in" />
                  </button>
                  <button
                    onClick={() => setView('host-signup')}
                    className="px-6 py-2 bg-[var(--accent)] text-white rounded font-medium hover:opacity-90 transition"
                    title="Sign up"
                  >
                    <FormattedMessage id="auth.signup.link" defaultMessage="Sign up" />
                  </button>
                </div>
              </div>
            )}
            <Landing />
          </div>
        )}

        {status === 'loading' && role === null && (
          <div className="py-20 text-center text-lg opacity-80">
            <FormattedMessage id="app.loading" defaultMessage="Preparing your session..." />
          </div>
        )}
      </main>
      
      {/* Score Animation Overlay */}
      {scoreAnimation && (() => {
        // Try to find quiz panel and the specific team's score element
        const quizPanel = document.getElementById('quiz-panel');
        const teamScoreElement = document.getElementById(`team-score-${scoreAnimation.teamId}`);
        const scoreboard = document.getElementById('player-scoreboard');
        
        // Calculate start position (center of quiz panel or middle of screen)
        let startX = window.innerWidth / 2;
        let startY = window.innerHeight / 2;
        if (quizPanel) {
          const rect = quizPanel.getBoundingClientRect();
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
        }
        
        // Calculate target position (specific team score or scoreboard center)
        let targetX = window.innerWidth - 100;
        let targetY = 100;
        
        if (teamScoreElement) {
          // Target the exact score number element
          const rect = teamScoreElement.getBoundingClientRect();
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
          
          // Add pulse animation to the score element
          teamScoreElement.style.transition = 'transform 0.3s ease, color 0.3s ease';
          teamScoreElement.style.transform = 'scale(1.5)';
          teamScoreElement.style.color = '#FFD700'; // Gold color
          
          setTimeout(() => {
            teamScoreElement.style.transform = 'scale(1)';
            teamScoreElement.style.color = '';
          }, 500);
        } else if (scoreboard) {
          // Fallback to scoreboard center if specific score not found
          const rect = scoreboard.getBoundingClientRect();
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + 40;
        }
        
        return (
          <ScoreAnimation
            startX={startX}
            startY={startY}
            targetX={targetX}
            targetY={targetY}
            points={scoreAnimation.points}
            isBonus={scoreAnimation.isBonus}
            onComplete={() => {}}
          />
        );
      })()}
    </div>
  );
}

