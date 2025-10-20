import { useMemo, useState } from 'react';
import { QuizTemplateManager } from './templates/QuizTemplateManager';
import { BioscopeTemplateManager } from './templates/BioscopeTemplateManager';

type GameTab = {
  id: 'quiz' | 'bioscope';
  label: string;
  description: string;
  component: () => JSX.Element;
};

const GAME_TABS: GameTab[] = [
  {
    id: 'quiz',
    label: 'Quiz Game',
    description: 'Multiple-choice and buzzer rounds driven by reusable question banks.',
    component: QuizTemplateManager,
  },
  {
    id: 'bioscope',
    label: 'Bioscope',
    description: 'Progressive image reveal with timers, hints, and manual scoring.',
    component: BioscopeTemplateManager,
  },
];

export default function TemplateManager() {
  const [activeTab, setActiveTab] = useState<GameTab['id']>('quiz');

  const ActiveComponent = useMemo(() => {
    const entry = GAME_TABS.find((tab) => tab.id === activeTab) ?? GAME_TABS[0];
    return entry.component;
  }, [activeTab]);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[220px_1fr]">
      <aside className="rounded-lg border border-[var(--fg)]/15 bg-[var(--card)]/60 p-4 shadow-sm">
        <div className="text-xs uppercase tracking-widest text-[var(--fg)]/60">Template Libraries</div>
        <nav className="mt-3 flex flex-row gap-2 md:flex-col">
          {GAME_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? 'border-[var(--fg)]/25 bg-[var(--fg)]/10 text-[var(--fg)]'
                    : 'border-transparent bg-transparent text-[var(--fg)]/70 hover:border-[var(--fg)]/15 hover:bg-[var(--fg)]/5'
                }`}
              >
                <div className="font-medium">{tab.label}</div>
                <div className="text-xs text-[var(--fg)]/60">{tab.description}</div>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="space-y-6">
        <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--card)]/60 p-4 text-sm text-[var(--fg)]/70">
          <p className="font-medium text-[var(--fg)]">Sessions and scoring settings are shared across the platform.</p>
          <p className="mt-1">
            Choose a game below to manage its templates. Hosts can attach any mix of games to a single session so final scores and winner announcements include every round.
          </p>
        </div>

        <ActiveComponent />
      </section>
    </div>
  );
}
