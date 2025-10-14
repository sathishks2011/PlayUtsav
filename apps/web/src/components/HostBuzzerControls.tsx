import { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  openBuzzerThunk,
  closeBuzzerThunk,
  resetBuzzerThunk,
  overrideBuzzerThunk,
} from '../store/slices/quizSlice';
import { TeamNameBadge } from './TeamNameBadge';

function computeRemainingSeconds(buzzerOpenedAt?: string, duration?: number) {
  if (!buzzerOpenedAt || !duration) return null;
  const opened = new Date(buzzerOpenedAt).getTime();
  if (Number.isNaN(opened)) return null;
  const elapsed = (Date.now() - opened) / 1000;
  return Math.max(duration - elapsed, 0);
}

export function HostBuzzerControls() {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session.current);
  const quiz = useAppSelector((s) => s.quiz.current);
  const buzzerState = quiz?.buzzerState;

  const teamsById = useMemo(() => {
    const record = new Map<string, { name: string; color?: string | null }>();
    session?.teams.forEach((team) => {
      record.set(team.id, { name: team.name, color: team.color });
    });
    return record;
  }, [session?.teams]);

  if (!session || session.playerEngagementType !== 'BUZZER') {
    return null;
  }

  const presses = buzzerState?.buzzPresses ?? [];
  const open = Boolean(buzzerState?.isOpen);
  const lockedParticipantId = buzzerState?.lockedForParticipantId ?? null;
  const remainingSeconds = computeRemainingSeconds(buzzerState?.buzzerOpenedAt, buzzerState?.timerDuration);

  const handleOpen = () => {
    if (!session) return;
    dispatch(openBuzzerThunk({ sessionId: session.id }));
  };

  const handleClose = () => {
    if (!session) return;
    dispatch(closeBuzzerThunk({ sessionId: session.id }));
  };

  const handleReset = () => {
    if (!session) return;
    dispatch(resetBuzzerThunk({ sessionId: session.id }));
  };

  const handleOverride = (participantId: string) => {
    if (!session) return;
    dispatch(overrideBuzzerThunk({ sessionId: session.id, participantId }));
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">
            <FormattedMessage id="hostBuzzer.title" defaultMessage="Buzzer Controls" />
          </h3>
          <p className="text-sm text-white/70">
            <FormattedMessage id="hostBuzzer.subtitle" defaultMessage="Manage fast-response rounds and see who buzzed first." />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em]">
          <span
            className={`rounded-full px-3 py-1 ${open ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40' : 'bg-white/10 text-white/60 border border-white/10'}`}
          >
            {open ? (
              <FormattedMessage id="hostBuzzer.status.open" defaultMessage="Buzzer Open" />
            ) : (
              <FormattedMessage id="hostBuzzer.status.closed" defaultMessage="Buzzer Closed" />
            )}
          </span>
          {lockedParticipantId && (
            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200">
              <FormattedMessage id="hostBuzzer.status.locked" defaultMessage="Locked" />
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleOpen}
          className="rounded bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
          aria-label={intl.formatMessage({ id: 'hostBuzzer.actions.open', defaultMessage: 'Open Buzzer' })}
          disabled={open}
        >
          <FormattedMessage id="hostBuzzer.actions.open" defaultMessage="Open Buzzer" />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="rounded border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 disabled:opacity-50"
          aria-label={intl.formatMessage({ id: 'hostBuzzer.actions.close', defaultMessage: 'Close' })}
          disabled={!open}
        >
          <FormattedMessage id="hostBuzzer.actions.close" defaultMessage="Close" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          aria-label={intl.formatMessage({ id: 'hostBuzzer.actions.reset', defaultMessage: 'Reset' })}
        >
          <FormattedMessage id="hostBuzzer.actions.reset" defaultMessage="Reset" />
        </button>
      </div>

      {remainingSeconds != null && open && (
        <div className="rounded border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
          <FormattedMessage
            id="hostBuzzer.timer"
            defaultMessage="Time remaining: {seconds}s"
            values={{ seconds: Math.max(Math.ceil(remainingSeconds), 0) }}
          />
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            <FormattedMessage id="hostBuzzer.presses" defaultMessage="Buzzer Presses" />
          </h4>
          {presses.length > 0 && (
            <span className="text-xs text-white/50">
              <FormattedMessage id="hostBuzzer.first" defaultMessage="First buzz" />: {presses[0].participantName}
            </span>
          )}
        </div>

        {presses.length === 0 ? (
          <p className="rounded border border-dashed border-white/20 bg-white/5 px-4 py-5 text-center text-sm text-white/60">
            <FormattedMessage id="hostBuzzer.empty" defaultMessage="No buzzers yet. Open the buzzer to start a quick-fire round." />
          </p>
        ) : (
          <ul className="space-y-2">
            {presses.map((press, index) => {
              const teamInfo = press.teamId ? teamsById.get(press.teamId) : undefined;
              const locked = lockedParticipantId === press.participantId;
              const orderNumber = index + 1;
              return (
                <li
                  key={`${press.participantId}-${press.timestamp}`}
                  className={`flex items-center justify-between gap-3 rounded border ${
                    index === 0 
                      ? 'border-red-400/60 bg-red-500/10 ring-2 ring-red-400/40' 
                      : 'border-white/15 bg-white/5'
                  } px-4 py-3`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      index === 0 
                        ? 'bg-red-500 text-white' 
                        : 'bg-white/10 text-white/60'
                    }`}>
                      {orderNumber}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white/90">
                        {press.participantName}
                        {locked && (
                          <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                            <FormattedMessage id="hostBuzzer.badges.answering" defaultMessage="Answering" />
                          </span>
                        )}
                      </span>
                      {teamInfo && (
                        <TeamNameBadge
                          name={teamInfo.name}
                          color={teamInfo.color}
                          className="text-xs uppercase tracking-[0.2em] text-white/60"
                        />
                      )}
                      <span className="text-xs text-white/50">
                        {new Date(press.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-200 uppercase tracking-[0.2em]">
                        <FormattedMessage id="hostBuzzer.badges.first" defaultMessage="1st" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOverride(press.participantId)}
                      className={`rounded border px-3 py-1 text-xs font-semibold hover:bg-white/10 ${
                        locked
                          ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/20 text-white/80'
                      }`}
                      aria-label={intl.formatMessage(
                        { id: 'hostBuzzer.actions.allow', defaultMessage: 'Allow this player to answer' },
                      )}
                    >
                      <FormattedMessage 
                        id={locked ? 'hostBuzzer.actions.selected' : 'hostBuzzer.actions.allow'} 
                        defaultMessage={locked ? 'Selected' : 'Allow'} 
                      />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
