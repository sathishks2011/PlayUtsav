import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { startQuizThunk, revealQuizThunk } from '../store/slices/quizSlice';
import type { RootState } from '../store/store';

const SAMPLE_QUESTIONS = [
  {
    questionId: 'holiday-fireworks',
    prompt: "Which city hosts the world's largest New Year's Eve fireworks display?",
    options: ['Sydney', 'Dubai', 'Rio de Janeiro', 'Singapore'],
    correct: 1,
    duration: 30,
  },
  {
    questionId: 'festival-flavors',
    prompt: 'Pongal is celebrated predominantly in which Indian state?',
    options: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh'],
    correct: 0,
    duration: 30,
  },
];

export function HostQuizPanel() {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const session = useAppSelector((s: RootState) => s.session.current);
  const quizState = useAppSelector((s: RootState) => s.quiz.current);
  const loading = useAppSelector((s: RootState) => s.quiz.loading);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const question = useMemo(() => SAMPLE_QUESTIONS[questionIndex % SAMPLE_QUESTIONS.length], [questionIndex]);

  useEffect(() => {
    if (!quizState) {
      setTimeLeft(null);
      return;
    }
    const compute = () => {
      const start = new Date(quizState.createdAt).getTime();
      const remaining = quizState.duration - (Date.now() - start) / 1000;
      return Math.max(Number.isFinite(remaining) ? remaining : 0, 0);
    };
    setTimeLeft(compute());
    const timer = window.setInterval(() => setTimeLeft(compute()), 500);
    return () => window.clearInterval(timer);
  }, [quizState?.questionId, quizState?.createdAt, quizState?.duration]);

  if (!session) return null;

  const handleStart = () => {
    if (loading || (quizState && quizState.status === 'running')) return;
    dispatch(
      startQuizThunk({
        sessionId: session.id,
        questionId: question.questionId,
        prompt: question.prompt,
        options: question.options,
        duration: question.duration,
      })
    );
  };

  const handleReveal = () => {
    if (!quizState || !session) return;
    const awards = session.teams
      .filter((team) =>
        team.participants.some((p) =>
          quizState.answers.some((ans) => ans.participantId === p.id && ans.answer === question.correct)
        )
      )
      .map((team) => ({ teamId: team.id, delta: 10, reason: 'quiz-correct' }));

    dispatch(
      revealQuizThunk({
        sessionId: session.id,
        correctOption: question.correct,
        awards: awards.length ? awards : undefined,
      })
    );
  };

  const revealed = quizState?.status === 'revealed';
  const running = quizState?.status === 'running';
  const progress = (() => {
    if (!quizState || quizState.duration <= 0 || timeLeft == null) return 0;
    return Math.max(Math.min(timeLeft / quizState.duration, 1), 0);
  })();

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">
            <FormattedMessage id="hostQuiz.title" defaultMessage="Quiz round" />
          </h3>
          {quizState ? (
            <p className="text-sm opacity-70">
              <FormattedMessage
                id="hostQuiz.running"
                defaultMessage="Question running: {prompt}"
                values={{ prompt: quizState.prompt }}
              />
            </p>
          ) : (
            <p className="text-sm opacity-70">
              <FormattedMessage id="hostQuiz.ready" defaultMessage="Start a quick quiz to earn bonus points." />
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded bg-[var(--color-primary)] text-white disabled:bg-white/10 disabled:text-white/50"
            onClick={handleStart}
            disabled={loading || running}
          >
            <FormattedMessage id="hostQuiz.start" defaultMessage="Start question" />
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded border border-white/20"
            onClick={() => setQuestionIndex((idx) => idx + 1)}
            disabled={loading}
          >
            <FormattedMessage id="hostQuiz.nextQuestion" defaultMessage="Next question" />
          </button>
        </div>
      </div>

      {quizState && (
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-lg">{quizState.prompt}</h4>
            <div className="mt-2 text-xs uppercase tracking-[0.2em] opacity-70 flex items-center gap-2">
              {running ? (
                <span>
                  <FormattedMessage
                    id="hostQuiz.timer"
                    defaultMessage="Time left: {seconds}s"
                    values={{ seconds: Math.ceil(timeLeft ?? quizState.duration) }}
                  />
                </span>
              ) : (
                <span>
                  <FormattedMessage id="hostQuiz.statusComplete" defaultMessage="Round complete" />
                </span>
              )}
            </div>
            <div className="timer-bar">
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>
            <ol className="mt-3 space-y-2">
              {quizState.options.map((option, idx) => (
                <li
                  key={option}
                  className={`rounded border border-white/10 px-3 py-2 flex justify-between items-center ${
                    revealed && idx === quizState.correctOption ? 'bg-emerald-500/20 border-emerald-400/40' : 'bg-black/20'
                  }`}
                >
                  <span>{option}</span>
                  {revealed && idx === quizState.correctOption && (
                    <span className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                      <FormattedMessage id="hostQuiz.correct" defaultMessage="Correct" />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg bg-black/30 border border-white/10 p-3 text-sm">
            <FormattedMessage
              id="hostQuiz.answers"
              defaultMessage="{count} answers received"
              values={{ count: quizState.answers.length }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {quizState.answers.map((answer) => (
                <span key={answer.participantId} className="px-2 py-1 rounded bg-white/10 text-xs uppercase tracking-[0.15em]">
                  {answer.displayName}: {quizState.options[answer.answer] ?? intl.formatMessage({ id: 'hostQuiz.unknown', defaultMessage: 'Unknown' })}
                </span>
              ))}
              {quizState.answers.length === 0 && (
                <span className="text-xs opacity-60">
                  <FormattedMessage id="hostQuiz.waitingForAnswers" defaultMessage="Waiting for answers..." />
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-white/10"
              onClick={handleReveal}
              disabled={revealed}
            >
              <FormattedMessage id="hostQuiz.reveal" defaultMessage="Reveal & award" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
