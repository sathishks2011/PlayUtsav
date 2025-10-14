import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { startQuizThunk, revealQuizThunk, submitQuizAnswerThunk } from '../store/slices/quizSlice';
import type { RootState } from '../store/store';
import { getSessionSocket } from '../lib/socket';

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

interface HostQuizPanelProps {
  showHostControls?: boolean;
  allowPlayerInput?: boolean;
}

export function HostQuizPanel({ showHostControls = true, allowPlayerInput = false }: HostQuizPanelProps) {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const session = useAppSelector((s: RootState) => s.session.current);
  const quizState = useAppSelector((s: RootState) => s.quiz.current);
  const loading = useAppSelector((s: RootState) => s.quiz.loading);
  const autoRevealEnabled = useAppSelector((s: RootState) => s.settings.reveal.autoRevealEnabled);
  const autoRevealTimeout = useAppSelector((s: RootState) => s.settings.reveal.autoRevealTimeout);
  const participantId = useAppSelector((s: RootState) => s.session.participantId);
  const sessionId = useAppSelector((s: RootState) => s.session.current?.id);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [allAnswered, setAllAnswered] = useState(false);
  const [autoRevealTimer, setAutoRevealTimer] = useState<number | null>(null);
  
  // Player input state (only used when allowPlayerInput is true)
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

  // Reset allAnswered state when quiz changes
  useEffect(() => {
    if (quizState?.status === 'running') {
      console.log('[HostQuizPanel] Quiz running, resetting allAnswered state');
      setAllAnswered(false);
      setAutoRevealTimer(null);
    } else if (quizState?.status === 'revealed') {
      console.log('[HostQuizPanel] Quiz revealed, resetting allAnswered state');
      setAllAnswered(false);
      setAutoRevealTimer(null);
    }
  }, [quizState?.questionId, quizState?.status]);

  // Auto-reveal countdown when all players have answered
  useEffect(() => {
    console.log('[HostQuizPanel] Auto-reveal effect triggered', {
      autoRevealEnabled,
      allAnswered,
      quizStatus: quizState?.status,
      sessionId: session?.id,
    });

    if (!autoRevealEnabled || !allAnswered || !quizState || quizState.status !== 'running' || !session) {
      return;
    }

    console.log('[HostQuizPanel] Starting auto-reveal countdown:', autoRevealTimeout, 'seconds');
    setAutoRevealTimer(autoRevealTimeout);
    
    const countdown = window.setInterval(() => {
      setAutoRevealTimer((prev) => {
        if (prev === null || prev <= 1) {
          // Time's up, trigger auto-reveal
          clearInterval(countdown);
          
          // Trigger reveal with current quiz state
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
          
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdown);
    };
  }, [allAnswered, autoRevealEnabled, autoRevealTimeout, quizState?.status, quizState?.answers, session, question, dispatch]);

  // Listen for 'quiz:all-answered' WebSocket event
  useEffect(() => {
    if (!session?.id) return;

    let socketRef: Awaited<ReturnType<typeof getSessionSocket>> | null = null;

    const handler = (data: unknown) => {
      console.log('[HostQuizPanel] Received quiz:all-answered event', data);
      setAllAnswered(true);
    };

    getSessionSocket()
      .then((s) => {
        socketRef = s;
        s.on('quiz:all-answered', handler);
        console.log('[HostQuizPanel] Subscribed to quiz:all-answered events');
      })
      .catch((err) => {
        console.error('Failed to setup quiz:all-answered listener:', err);
      });

    return () => {
      if (socketRef) {
        socketRef.off('quiz:all-answered', handler);
      }
    };
  }, [session?.id]);

  // Reset player input state when question changes (for allowPlayerInput mode)
  useEffect(() => {
    if (!allowPlayerInput || !quizState) return;
    setSelected(null);
    setSubmitted(false);
  }, [quizState?.questionId, quizState?.status, allowPlayerInput]);

  if (!session) return null;

  // Player submit handler (only used when allowPlayerInput is true)
  const handlePlayerSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!allowPlayerInput || selected == null || quizState?.status !== 'running' || !sessionId || !participantId) return;
    dispatch(submitQuizAnswerThunk({ sessionId, participantId, answer: selected }));
    setSubmitted(true);
  };

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

  const handleReveal = async () => {
    console.log('[HostQuizPanel] ===== REVEAL BUTTON CLICKED =====');
    console.log('[HostQuizPanel] showHostControls:', showHostControls);
    console.log('[HostQuizPanel] Quiz state:', quizState);
    console.log('[HostQuizPanel] Session:', session);
    console.log('[HostQuizPanel] Question:', question);
    
    // Guard: Only allow reveal if host controls are enabled
    if (!showHostControls) {
      console.error('[HostQuizPanel] Cannot reveal - not a host session');
      alert('Cannot reveal: This action is only available to hosts');
      return;
    }
    
    if (!quizState || !session) {
      console.error('[HostQuizPanel] Cannot reveal - missing quizState or session');
      alert('Cannot reveal: Missing quiz state or session');
      return;
    }
    
    const awards = session.teams
      .filter((team) =>
        team.participants.some((p) =>
          quizState.answers.some((ans) => ans.participantId === p.id && ans.answer === question.correct)
        )
      )
      .map((team) => ({ teamId: team.id, delta: 10, reason: 'quiz-correct' }));

    console.log('[HostQuizPanel] Awards calculated:', awards);
    console.log('[HostQuizPanel] Correct answer:', question.correct);
    console.log('[HostQuizPanel] Dispatching reveal...');
    
    try {
      console.log('[HostQuizPanel] Calling revealQuizThunk with:', {
        sessionId: session.id,
        correctOption: question.correct,
        awards: awards.length ? awards : undefined,
      });
      
      const result = await dispatch(
        revealQuizThunk({
          sessionId: session.id,
          correctOption: question.correct,
          awards: awards.length ? awards : undefined,
        })
      ).unwrap();
      
      console.log('[HostQuizPanel] Reveal successful:', result);
    } catch (error: any) {
      console.error('[HostQuizPanel] Reveal failed - Full error:', error);
      console.error('[HostQuizPanel] Error type:', typeof error);
      console.error('[HostQuizPanel] Error keys:', error ? Object.keys(error) : 'N/A');
      
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Try to extract meaningful error info
        errorMessage = error.message || error.error || error.statusText || JSON.stringify(error, null, 2);
      }
      
      console.error('[HostQuizPanel] Error message to display:', errorMessage);
      alert(`Reveal failed:\n${errorMessage}\n\nCheck the console for more details.`);
    }
  };

  const handleNextQuestion = () => {
    if (!session || loading) return;
    
    // Increment question index
    const newIndex = questionIndex + 1;
    setQuestionIndex(newIndex);
    
    // Get the new question
    const newQuestion = SAMPLE_QUESTIONS[newIndex % SAMPLE_QUESTIONS.length];
    
    // Reset local state
    setAllAnswered(false);
    setAutoRevealTimer(null);
    
    // Automatically start the new question
    dispatch(
      startQuizThunk({
        sessionId: session.id,
        questionId: newQuestion.questionId,
        prompt: newQuestion.prompt,
        options: newQuestion.options,
        duration: newQuestion.duration,
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
    <div id="quiz-panel" className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-4">
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
        {showHostControls && (
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
              onClick={handleNextQuestion}
              disabled={loading || running}
            >
              <FormattedMessage id="hostQuiz.nextQuestion" defaultMessage="Next question" />
            </button>
            {/* Debug button to test auto-reveal */}
            {running && autoRevealEnabled && (
              <button
                type="button"
                className="px-4 py-2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs"
                onClick={() => {
                  console.log('[DEBUG] Manually triggering allAnswered state');
                  setAllAnswered(true);
                }}
              >
                [DEBUG] Trigger Auto-Reveal
              </button>
            )}
          </div>
        )}
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
            {allowPlayerInput ? (
              <form onSubmit={handlePlayerSubmit} className="mt-3 space-y-3">
                {quizState.options.map((option, idx) => (
                  <label
                    key={option}
                    className={`flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 cursor-pointer ${
                      revealed && idx === quizState.correctOption
                        ? 'bg-emerald-500/20 border-emerald-400/40'
                        : 'bg-black/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="player-answer"
                      value={idx}
                      checked={selected === idx}
                      onChange={() => setSelected(idx)}
                      disabled={revealed || submitted}
                      className="cursor-pointer"
                    />
                    <span className="flex-1">{option}</span>
                    {revealed && idx === quizState.correctOption && (
                      <span className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                        <FormattedMessage id="hostQuiz.correct" defaultMessage="Correct" />
                      </span>
                    )}
                  </label>
                ))}
                {!submitted && !revealed && (
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[var(--color-primary)] text-white disabled:bg-white/10 disabled:text-white/50 w-full"
                    disabled={selected == null || quizState.status !== 'running'}
                  >
                    <FormattedMessage id="playerQuiz.submit" defaultMessage="Submit answer" />
                  </button>
                )}
                {submitted && !revealed && (
                  <div className="px-4 py-3 rounded bg-emerald-500/20 border border-emerald-400/40 text-sm text-emerald-100">
                    <FormattedMessage
                      id="playerQuiz.waitingForOthers"
                      defaultMessage="Answer submitted! Waiting for others..."
                    />
                  </div>
                )}
              </form>
            ) : (
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
            )}
          </div>

          <div className="rounded-lg bg-black/30 border border-white/10 p-3 text-sm">
            <div className="flex items-center justify-between">
              <FormattedMessage
                id="hostQuiz.answers"
                defaultMessage="{count} answers received"
                values={{ count: quizState.answers.length }}
              />
              {allAnswered && autoRevealTimer !== null && running && (
                <span className="text-xs uppercase tracking-[0.2em] text-amber-300 animate-pulse">
                  <FormattedMessage
                    id="hostQuiz.autoReveal"
                    defaultMessage="Auto-reveal in {seconds}s"
                    values={{ seconds: autoRevealTimer }}
                  />
                </span>
              )}
              {allAnswered && !autoRevealEnabled && running && (
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                  <FormattedMessage
                    id="hostQuiz.allAnswered"
                    defaultMessage="All players answered!"
                  />
                </span>
              )}
            </div>
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

          {showHostControls && (
            <div className="flex gap-2">
              {allAnswered && autoRevealEnabled && running && (
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200"
                  onClick={handleReveal}
                  disabled={revealed}
                >
                  <FormattedMessage id="hostQuiz.revealNow" defaultMessage="Reveal Now" />
                </button>
              )}
              <button
                type="button"
                className="px-4 py-2 rounded bg-white/10"
                onClick={handleReveal}
                disabled={revealed}
              >
                <FormattedMessage id="hostQuiz.reveal" defaultMessage="Reveal & award" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
