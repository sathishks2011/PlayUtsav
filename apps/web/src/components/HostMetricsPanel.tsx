import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppSelector } from '../store/hooks';

export function HostMetricsPanel() {
  const session = useAppSelector((s) => s.session.current);
  const metrics = useMemo(() => {
    const participants = session?.participants.length ?? 0;
    const teams = session?.teams.length ?? 0;
    const avgPerTeam = teams > 0 && session ? Math.round(participants / teams) : 0;
    const answers = (session as any)?.quizAnswers?.length ?? 0; // placeholder
    return { participants, teams, avgPerTeam, answers };
  }, [session]);

  return (
    <div className="rounded-lg border border-[var(--fg)]/10 bg-[var(--card)] p-4 space-y-4">
      <h3 className="text-xl font-semibold"><FormattedMessage id="host.metrics.title" defaultMessage="Engagement & Metrics" /></h3>
      {!session && (
        <p className="opacity-75 text-sm"><FormattedMessage id="host.metrics.noSession" defaultMessage="Create or open a session to view metrics." /></p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded border border-[var(--fg)]/10 p-3">
          <div className="text-sm opacity-70"><FormattedMessage id="host.metrics.participants" defaultMessage="Participants" /></div>
          <div className="text-2xl font-semibold">{metrics.participants}</div>
        </div>
        <div className="rounded border border-[var(--fg)]/10 p-3">
          <div className="text-sm opacity-70"><FormattedMessage id="host.metrics.teams" defaultMessage="Teams" /></div>
          <div className="text-2xl font-semibold">{metrics.teams}</div>
        </div>
        <div className="rounded border border-[var(--fg)]/10 p-3">
          <div className="text-sm opacity-70"><FormattedMessage id="host.metrics.avgPerTeam" defaultMessage="Avg per team" /></div>
          <div className="text-2xl font-semibold">{metrics.avgPerTeam}</div>
        </div>
        <div className="rounded border border-[var(--fg)]/10 p-3">
          <div className="text-sm opacity-70"><FormattedMessage id="host.metrics.answers" defaultMessage="Answers submitted" /></div>
          <div className="text-2xl font-semibold">{metrics.answers}</div>
        </div>
      </div>
      <p className="text-xs opacity-70"><FormattedMessage id="host.metrics.hint" defaultMessage="More detailed analytics will be added in a future sprint." /></p>
    </div>
  );
}
