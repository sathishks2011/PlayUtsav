import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { submitQuizAnswerThunk } from '../store/slices/quizSlice';

export function PlayerQuizPanel() {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const quiz = useAppSelector((s) => s.quiz.current);
  const participantId = useAppSelector((s) => s.session.participantId);
  const sessionId = useAppSelector((s) => s.session.current?.id);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!quiz || !sessionId || !participantId) return null;

  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
  }, [quiz.questionId, quiz.status]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selected == null || quiz.status !== 'running') return;
    dispatch(submitQuizAnswerThunk({ sessionId, participantId, answer: selected }));
    setSubmitted(true);
  };

  const hasRevealed = quiz.status === 'revealed';
  const statusLabel = intl.formatMessage({ id: `playerQuiz.state.${quiz.status}`, defaultMessage: quiz.status });
  
  const disabled = selected == null || hasRevealed || submitted || quiz.status !== 'running';

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          <FormattedMessage id="playerQuiz.title" defaultMessage="Quiz time" />
        </h3>
        <span className="text-xs uppercase tracking-[0.2em] opacity-60">
          {statusLabel}
        </span>
      </div>
      <p className="text-lg font-medium">{quiz.prompt}</p>
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
              disabled={hasRevealed}
            />
            <span>{option}</span>
          </label>
        ))}
        <button
          type="submit"
          className="px-4 py-2 rounded bg-[var(--color-primary)] text-white disabled:bg-white/10 disabled:text-white/50"
          disabled={disabled}
        >
          <FormattedMessage id="playerQuiz.submit" defaultMessage="Submit answer" />
        </button>
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
