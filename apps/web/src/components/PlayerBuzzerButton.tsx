import { useEffect, useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { pressBuzzerThunk } from '../store/slices/quizSlice';
import { soundManager } from '../lib/soundManager';

function computeCountdown(buzzerOpenedAt?: string, timerDuration?: number) {
  if (!buzzerOpenedAt || !timerDuration) return null;
  const started = new Date(buzzerOpenedAt).getTime();
  if (Number.isNaN(started)) return null;
  const elapsedSeconds = (Date.now() - started) / 1000;
  return Math.max(timerDuration - elapsedSeconds, 0);
}

export function PlayerBuzzerButton() {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const session = useAppSelector((s) => s.session.current);
  const participantId = useAppSelector((s) => s.session.participantId);
  const quiz = useAppSelector((s) => s.quiz.current);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const buzzerState = quiz?.buzzerState;
  const team = useMemo(() => {
    if (!session || !participantId) return undefined;
    return session.teams.find((t) => t.participants.some((p) => p.id === participantId));
  }, [session, participantId]);

  // Find my position in the buzzer order
  const myBuzzPosition = useMemo(() => {
    if (!buzzerState?.buzzPresses || !participantId) return null;
    const index = buzzerState.buzzPresses.findIndex((press) => press.participantId === participantId);
    return index >= 0 ? index + 1 : null;
  }, [buzzerState?.buzzPresses, participantId]);

  const buzzerOpen = Boolean(buzzerState?.isOpen);
  const isLockedToSomeone = Boolean(buzzerState?.lockedForParticipantId);
  const isLockedToMe = buzzerState?.lockedForParticipantId === participantId;
  const hasAlreadyBuzzed = myBuzzPosition !== null;

  const disabled = !session || !participantId || !buzzerOpen || isLockedToSomeone || hasAlreadyBuzzed;
  const countdown = computeCountdown(buzzerState?.buzzerOpenedAt, buzzerState?.timerDuration);

  const statusMessage = (() => {
    if (!buzzerState) return 'playerBuzzer.status.waiting';
    if (!buzzerOpen) {
      if (isLockedToMe) return 'playerBuzzer.status.answering';
      if (isLockedToSomeone) return 'playerBuzzer.status.locked';
      return 'playerBuzzer.status.closed';
    }
    if (hasAlreadyBuzzed) return 'playerBuzzer.status.alreadyBuzzed';
    return 'playerBuzzer.status.ready';
  })();

  const handlePress = () => {
    if (!session || !participantId || disabled) return;
    
    // Play buzzer sound
    soundManager.playSound('buzzer');
    
    dispatch(pressBuzzerThunk({ sessionId: session.id, participantId }));
  };

  useEffect(() => {
    if (!cardRef.current) return;
    const accent = team?.color ?? 'var(--color-primary)';
    cardRef.current.style.setProperty('--player-team-accent', accent);
  }, [team?.color]);

  // Only show for buzzer mode sessions (AFTER all hooks)
  if (!session || session.playerEngagementType !== 'BUZZER') {
    return null;
  }

  // Only show buzzer if there's an active quiz (AFTER all hooks)
  if (!quiz || quiz.status === 'idle' || !quiz.questionId) {
    return null;
  }

  // Get first buzzer press info for notification
  const firstPress = buzzerState?.buzzPresses?.[0];
  const isMe = firstPress?.participantId === participantId;

  return (
    <section
      ref={cardRef}
      className={`player-buzzer-card relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 text-center transition transform ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'
      }`}
    >
      {/* Notification banner showing who pressed first (visible to all players) */}
      {firstPress && (
        <div className={`mb-4 rounded border px-3 py-2 text-sm ${
          isMe 
            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' 
            : 'border-blue-400/40 bg-blue-500/10 text-blue-200'
        }`}>
          {isMe ? (
            <FormattedMessage 
              id="playerBuzzer.youPressedFirst" 
              defaultMessage="🎉 You pressed first!"
            />
          ) : (
            <FormattedMessage 
              id="playerBuzzer.otherPressedFirst" 
              defaultMessage="📢 {name} pressed first"
              values={{ name: firstPress.participantName }}
            />
          )}
        </div>
      )}
      <div className="mb-3 text-sm uppercase tracking-[0.3em] text-white/60">
        <FormattedMessage id="playerBuzzer.title" defaultMessage="Buzzer" />
      </div>
      <button
        type="button"
        onClick={handlePress}
        disabled={disabled}
        className="player-buzzer-trigger w-full rounded-full py-6 text-2xl font-bold text-white shadow-lg transition active:scale-95"
        aria-label={intl.formatMessage({ id: 'playerBuzzer.press', defaultMessage: 'Press buzzer' })}
      >
        <FormattedMessage id="playerBuzzer.press" defaultMessage="Press Buzzer" />
      </button>
      {myBuzzPosition && (
        <div className={`mt-3 rounded border px-4 py-2 text-center ${
          myBuzzPosition === 1 
            ? 'border-red-400/60 bg-red-500/10' 
            : 'border-white/20 bg-white/5'
        }`}>
          <div className={`text-3xl font-bold ${
            myBuzzPosition === 1 ? 'text-red-300' : 'text-white/80'
          }`}>
            #{myBuzzPosition}
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            <FormattedMessage 
              id="playerBuzzer.position" 
              defaultMessage="Your position"
            />
          </p>
        </div>
      )}
      <p className="mt-4 text-sm text-white/80">
        <FormattedMessage id={statusMessage} defaultMessage="Waiting for host to open the buzzer" />
      </p>
      {countdown != null && buzzerOpen && (
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/60">
          <FormattedMessage
            id="playerBuzzer.timer"
            defaultMessage="Time left: {seconds}s"
            values={{ seconds: Math.max(Math.ceil(countdown), 0) }}
          />
        </p>
      )}
      {team && (
        <p className="mt-4 text-xs text-white/70">
          <FormattedMessage
            id="playerBuzzer.team"
            defaultMessage="Playing for {team}"
            values={{ team: team.name }}
          />
        </p>
      )}
    </section>
  );
}
