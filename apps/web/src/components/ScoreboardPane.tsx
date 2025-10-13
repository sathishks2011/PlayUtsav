import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppSelector } from '../store/hooks';
import { computeTeamScores } from '@pkg/core';

type ScoreboardPaneProps = {
  position?: 'side' | 'center';
  defaultCollapsed?: boolean;
};

export function ScoreboardPane({ position = 'side', defaultCollapsed = false }: ScoreboardPaneProps) {
  const session = useAppSelector((s) => s.session.current);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (!session) return null;

  const scores = computeTeamScores(session);
  // TODO: Track round progress in quiz state or session metadata
  const currentRound = 1;
  const totalRounds = 10;

  // Responsive classes
  const containerClasses =
    position === 'side'
      ? 'fixed right-0 top-16 bottom-0 w-80 bg-[var(--card)] border-l border-[var(--fg)]/10 shadow-lg z-40 transform transition-transform duration-300 md:translate-x-0'
      : 'w-full max-w-2xl mx-auto bg-[var(--card)] rounded-xl border border-[var(--fg)]/10 shadow-lg';

  const collapsedClass = isCollapsed && position === 'side' ? 'translate-x-full' : '';

  return (
    <>
      {/* Collapse/Expand Toggle (side position only) */}
      {position === 'side' && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="fixed right-0 top-24 bg-[var(--card)] border border-[var(--fg)]/10 rounded-l-lg px-2 py-4 shadow-lg z-50 hover:bg-white/5 transition"
          title={isCollapsed ? 'Show scoreboard' : 'Hide scoreboard'}
          aria-label={isCollapsed ? 'Show scoreboard' : 'Hide scoreboard'}
        >
          <span className="text-xl">{isCollapsed ? '◀' : '▶'}</span>
        </button>
      )}

      {/* Scoreboard Container */}
      <div className={`${containerClasses} ${collapsedClass}`}>
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--fg)]/10 bg-[var(--bg)]/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                <FormattedMessage id="scoreboard.title" defaultMessage="Scoreboard" />
              </h3>
              {position === 'center' && (
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="text-sm px-3 py-1 rounded hover:bg-white/5"
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? '▼' : '▲'}
                </button>
              )}
            </div>
            <div className="text-sm opacity-70 mt-1">
              <FormattedMessage
                id="scoreboard.round"
                defaultMessage="Round {current} of {total}"
                values={{ current: currentRound, total: totalRounds }}
              />
            </div>
          </div>

          {/* Scores List */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {scores.length === 0 ? (
                <div className="text-center py-8 opacity-60">
                  <p className="text-sm">
                    <FormattedMessage
                      id="scoreboard.noTeams"
                      defaultMessage="No teams yet. Create teams to see scores."
                    />
                  </p>
                </div>
              ) : (
                <>
                  {scores.map(({ team, total, streak }, index) => (
                    <div
                      key={team.id}
                      className="rounded-lg border border-[var(--fg)]/10 bg-[var(--bg)]/30 p-3 space-y-2 hover:bg-[var(--bg)]/50 transition"
                    >
                      {/* Rank & Team Name */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-2xl font-bold opacity-50"
                            style={{ color: team.color ?? 'var(--color-accent)' }}
                          >
                            #{index + 1}
                          </span>
                          <div>
                            <h4
                              className="font-semibold"
                              style={{ color: team.color ?? 'var(--color-accent)' }}
                            >
                              {team.name}
                            </h4>
                            <p className="text-xs opacity-60">
                              <FormattedMessage
                                id="scoreboard.members"
                                defaultMessage="{count} {count, plural, one {member} other {members}}"
                                values={{ count: team.participants.length }}
                              />
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div id={`team-score-${team.id}`} className="text-2xl font-bold">{total}</div>
                          <div className="text-xs opacity-60">
                            <FormattedMessage id="scoreboard.points" defaultMessage="points" />
                          </div>
                        </div>
                      </div>

                      {/* Streak Badge */}
                      {streak > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 uppercase tracking-wide">
                            🔥 <FormattedMessage
                              id="scoreboard.streak"
                              defaultMessage="Streak: {count}"
                              values={{ count: streak }}
                            />
                          </span>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((total / (scores[0]?.total || 100)) * 100, 100)}%`,
                            backgroundColor: team.color ?? 'var(--color-accent)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay (when side position on small screens) */}
      {position === 'side' && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsCollapsed(true)}
          aria-label="Close scoreboard"
        />
      )}
    </>
  );
}
