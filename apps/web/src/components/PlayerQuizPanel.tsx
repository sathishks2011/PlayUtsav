import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { submitQuizAnswerThunk } from '../store/slices/quizSlice';
import { soundManager } from '../lib/soundManager';

export function PlayerQuizPanel() {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const quiz = useAppSelector((s) => s.quiz.current);
  const participantId = useAppSelector((s) => s.session.participantId);
  const sessionId = useAppSelector((s) => s.session.current?.id);
  const session = useAppSelector((s) => s.session.current);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!quiz) return;
    setSelected(null);
    setSubmitted(false);
  }, [quiz?.questionId, quiz?.status]);

  // Play wrong answer sound when quiz is revealed and player got it wrong
  useEffect(() => {
    if (!quiz || quiz.status !== 'revealed' || !submitted || selected == null) return;
    
    const isCorrect = quiz.correctOption === selected;
    if (!isCorrect) {
      // Play wrong answer sound
      soundManager.playSound('coin_wrong');
    }
  }, [quiz?.status, quiz?.correctOption, selected, submitted]);

  useEffect(() => {
    if (!quiz) return;
    const compute = () => {
      const start = new Date(quiz.createdAt).getTime();
      const remaining = quiz.duration - (Date.now() - start) / 1000;
      return Math.max(Number.isFinite(remaining) ? remaining : 0, 0);
    };
    setTimeLeft(compute());
    const interval = window.setInterval(() => setTimeLeft(compute()), 500);
    return () => window.clearInterval(interval);
  }, [quiz?.questionId, quiz?.status, quiz]);

  // Guard clause after all hooks
  if (!quiz || !sessionId || !participantId) return null;

  // Buzzer mode: check if this player is locked out
  const buzzerState = quiz.buzzerState;
  const isBuzzerMode = session?.playerEngagementType === 'BUZZER';
  const isLockedToMe = buzzerState?.lockedForParticipantId === participantId;
  const isLockedToSomeoneElse = Boolean(buzzerState?.lockedForParticipantId) && !isLockedToMe;
  
  // In buzzer mode, can ONLY answer if explicitly locked to me
  // In normal mode, can always answer
  const canAnswer = isBuzzerMode ? isLockedToMe : true;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selected == null || quiz.status !== 'running' || !sessionId || !participantId) return;
    dispatch(submitQuizAnswerThunk({ sessionId, participantId, answer: selected }));
    setSubmitted(true);
  };

  const hasRevealed = quiz.status === 'revealed';
  const statusLabel = intl.formatMessage({ id: `playerQuiz.state.${quiz.status}`, defaultMessage: quiz.status });
  const progress = (() => {
    if (quiz.duration <= 0 || timeLeft == null) return 0;
    return Math.max(Math.min(timeLeft / quiz.duration, 1), 0);
  })();
  
  const disabled = selected == null || hasRevealed || submitted || quiz.status !== 'running' || !canAnswer;

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-4">
      {isBuzzerMode && !buzzerState?.lockedForParticipantId && (
        <div className="rounded border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-center text-blue-200">
          <FormattedMessage
            id="playerQuiz.buzzerWaiting"
            defaultMessage="🔒 Quiz locked. Press the buzzer and wait for host to allow you to answer."
          />
        </div>
      )}
      {isBuzzerMode && isLockedToSomeoneElse && (
        <div className="rounded border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-center text-amber-200">
          <FormattedMessage
            id="playerQuiz.buzzerLocked"
            defaultMessage="Another player is answering. Wait for the next round."
          />
        </div>
      )}
      {isBuzzerMode && isLockedToMe && (
        <div className="rounded border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-center text-emerald-200">
          <FormattedMessage
            id="playerQuiz.buzzerYourTurn"
            defaultMessage="✅ You buzzed first! Select your answer."
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          <FormattedMessage id="playerQuiz.title" defaultMessage="Quiz time" />
        </h3>
        <span className="text-xs uppercase tracking-[0.2em] opacity-60">
          {statusLabel}
        </span>
      </div>
      <p className="text-lg font-medium">{quiz.prompt}</p>
      <div className="text-xs uppercase tracking-[0.2em] opacity-70">
        {quiz.status === 'running' ? (
          <FormattedMessage
            id="playerQuiz.timer"
            defaultMessage="Time left: {seconds}s"
            values={{ seconds: Math.ceil(timeLeft ?? quiz.duration) }}
          />
        ) : (
          <FormattedMessage id="hostQuiz.statusComplete" defaultMessage="Round complete" />
        )}
      </div>
      <div className="timer-bar">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {quiz.options.map((option, index) => (
          <label
            key={option}
            className={`flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 ${
              hasRevealed && quiz.correctOption === index
                ? 'bg-emerald-500/20 border-emerald-400/40'
                : 'bg-black/20'
            }`}
          >
            <input
              type="radio"
              name="player-answer"
              value={index}
              checked={selected === index}
              onChange={() => setSelected(index)}
              disabled={hasRevealed || !canAnswer}
            />
            <span>{option}</span>
          </label>
        ))}
        {!submitted && !hasRevealed && (
          <button
            type="submit"
            className="px-4 py-2 rounded bg-[var(--color-primary)] text-white disabled:bg-white/10 disabled:text-white/50"
            disabled={disabled}
          >
            <FormattedMessage id="playerQuiz.submit" defaultMessage="Submit answer" />
          </button>
        )}
        {submitted && !hasRevealed && (
          <div className="px-4 py-3 rounded bg-emerald-500/20 border border-emerald-400/40 text-sm text-emerald-100">
            <FormattedMessage
              id="playerQuiz.waitingForOthers"
              defaultMessage="Answer submitted! Waiting for others..."
            />
          </div>
        )}
        {hasRevealed && quiz.correctOption != null && (
          <div className="text-sm opacity-80">
            <FormattedMessage
              id="playerQuiz.revealed"
              defaultMessage="Correct answer: {answer}"
              values={{ answer: quiz.options[quiz.correctOption] }}
            />
          </div>
        )}
      </form>
    </div>
  );
}
