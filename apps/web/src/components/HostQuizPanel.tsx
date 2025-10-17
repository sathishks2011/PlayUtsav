import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { startQuizThunk, revealQuizThunk, submitQuizAnswerThunk } from '../store/slices/quizSlice';
import type { RootState } from '../store/store';
import { getSessionSocket } from '../lib/socket';
import { getRoundQuestions, updateRound, advanceToNextRound, advanceToPreviousRound } from '../lib/api';
import type { QuestionResponse, CategoryResponse } from '@pkg/core';
import { RoundSelector } from './RoundSelector';
import { RoundInfoHeader } from './RoundInfoHeader';

const SAMPLE_QUESTIONS = [
  {
    questionId: 'holiday-fireworks',
    prompt: "Which city hosts the world's largest New Year's Eve fireworks display?",
    options: ['Sydney', 'Dubai', 'Rio de Janeiro', 'Singapore'],
    correct: 1,
    duration: 30,
    points: 10,
  },
  {
    questionId: 'festival-flavors',
    prompt: 'Pongal is celebrated predominantly in which Indian state?',
    options: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh'],
    correct: 0,
    duration: 30,
    points: 10,
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
  
  // Template questions state
  const [templateQuestions, setTemplateQuestions] = useState<QuestionResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [templateName, setTemplateName] = useState('');
  const [usingTemplate, setUsingTemplate] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  
  // Player input state (only used when allowPlayerInput is true)
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState<number | null>(null); // Track which answer was actually submitted

  // Use template questions if available, otherwise fall back to sample questions
  const question = useMemo(() => {
    if (usingTemplate && templateQuestions.length > 0) {
      const currentQuestion = templateQuestions[currentQuestionIndex];
      if (!currentQuestion) {
        console.warn('[HostQuizPanel] Template question not found at index', currentQuestionIndex);
        return SAMPLE_QUESTIONS[0];
      }
      
      return {
        questionId: currentQuestion.id,
        prompt: currentQuestion.question,
        options: currentQuestion.options,
        correct: currentQuestion.correctAnswer,
        duration: currentQuestion.timeLimit || 30,
        points: currentQuestion.points || 10,
      };
    }
    
    // Fallback to sample questions
    return SAMPLE_QUESTIONS[questionIndex % SAMPLE_QUESTIONS.length];
  }, [usingTemplate, templateQuestions, currentQuestionIndex, questionIndex]);

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

  // Load template questions when a template is attached to the session
  useEffect(() => {
    if (!session?.id || !session.quizTemplateId) {
      console.log('[HostQuizPanel] No template attached, using sample questions');
      setUsingTemplate(false);
      return;
    }

    console.log('[HostQuizPanel] Template detected, loading questions...');
    setLoadingTemplate(true);

    getRoundQuestions(session.id)
      .then((roundInfo) => {
        console.log('[HostQuizPanel] Template questions loaded:', roundInfo);
        setTemplateQuestions(roundInfo.questions);
        setCategories(session.quizTemplate?.categories || []);
        setCurrentCategoryIndex(roundInfo.session.currentCategoryIndex);
        setCurrentQuestionIndex(roundInfo.session.currentQuestionIndex);
        setTemplateName(roundInfo.template.name);
        setUsingTemplate(true);
      })
      .catch((error) => {
        console.error('[HostQuizPanel] Failed to load template questions:', error);
        setUsingTemplate(false);
        // Show user-friendly error
        if (showHostControls) {
          alert('Failed to load quiz template. Using sample questions instead.');
        }
      })
      .finally(() => {
        setLoadingTemplate(false);
      });
  }, [session?.id, session?.quizTemplateId, session?.quizTemplate, showHostControls]);

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
            .map((team) => ({ 
              teamId: team.id, 
              delta: question.points || 10, // Use template points if available
              reason: 'quiz-correct' 
            }));

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
    setSubmittedAnswer(null);
  }, [quizState?.questionId, allowPlayerInput]); // Removed quizState?.status to preserve submitted answer when revealed

  if (!session) return null;

  // Buzzer mode access control for players
  const isBuzzerMode = session.playerEngagementType === 'BUZZER';
  const buzzerState = quizState?.buzzerState;
  const isLockedToMe = buzzerState?.lockedForParticipantId === participantId;
  const isLockedToSomeoneElse = Boolean(buzzerState?.lockedForParticipantId) && !isLockedToMe;
  const canPlayerSubmit = !isBuzzerMode || isLockedToMe; // Allow submit if not buzzer mode OR if buzzer locked to this player

  // Player submit handler (only used when allowPlayerInput is true)
  const handlePlayerSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!allowPlayerInput || selected == null || quizState?.status !== 'running' || !sessionId || !participantId) return;
    if (isBuzzerMode && !canPlayerSubmit) return; // Block submit if buzzer mode and not locked to player
    dispatch(submitQuizAnswerThunk({ sessionId, participantId, answer: selected }));
    setSubmitted(true);
    setSubmittedAnswer(selected); // Save which answer was submitted
  };

  // Handle round/question navigation (for template mode)
  const handleRoundChange = async (categoryIndex: number, questionIndex: number) => {
    if (!session?.id || !usingTemplate) {
      console.warn('[HostQuizPanel] Cannot change round - no session or not using template');
      return;
    }

    console.log('[HostQuizPanel] Changing round to:', { categoryIndex, questionIndex });

    try {
      // Update round on backend
      await updateRound(session.id, categoryIndex, questionIndex);

      // Fetch new questions for the selected round
      const roundInfo = await getRoundQuestions(session.id);
      setTemplateQuestions(roundInfo.questions);
      setCurrentCategoryIndex(categoryIndex);
      setCurrentQuestionIndex(questionIndex);
      
      console.log('[HostQuizPanel] Round changed successfully');
    } catch (error) {
      console.error('[HostQuizPanel] Failed to change round:', error);
      alert('Failed to change round. Please try again.');
    }
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
      .map((team) => ({ 
        teamId: team.id, 
        delta: question.points || 10, // Use template points if available
        reason: 'quiz-correct' 
      }));

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

  const handleNextQuestion = async () => {
    if (!session || loading) return;
    
    // Reset local state
    setAllAnswered(false);
    setAutoRevealTimer(null);
    
    if (usingTemplate && templateQuestions.length > 0) {
      // Template mode: Check if we need to advance to next round
      const nextQuestionIndex = currentQuestionIndex + 1;
      
      if (nextQuestionIndex >= templateQuestions.length) {
        // All questions in current round are done - advance to next round
        console.log('[HostQuizPanel] All questions in round complete, advancing to next round...');
        
        try {
          await advanceToNextRound(session.id);
          
          // Reload questions for the new round
          const roundInfo = await getRoundQuestions(session.id);
          console.log('[HostQuizPanel] Advanced to next round:', roundInfo);
          
          setTemplateQuestions(roundInfo.questions);
          setCurrentCategoryIndex(roundInfo.session.currentCategoryIndex);
          setCurrentQuestionIndex(0); // Start at first question of new round
          
          // Start first question of new round
          const firstQuestion = roundInfo.questions[0];
          if (firstQuestion) {
            dispatch(
              startQuizThunk({
                sessionId: session.id,
                questionId: firstQuestion.id,
                prompt: firstQuestion.question,
                options: Array.isArray(firstQuestion.options) ? firstQuestion.options : [],
                duration: firstQuestion.timeLimit || 30,
              })
            );
          }
        } catch (error: any) {
          console.error('[HostQuizPanel] Failed to advance round:', error);
          if (error.message?.includes('last round')) {
            alert('🎉 Quiz Complete! All rounds finished.');
          } else {
            alert('Failed to advance to next round. Check console for details.');
          }
        }
      } else {
        // More questions in current round
        setCurrentQuestionIndex(nextQuestionIndex);
        
        const nextQuestion = templateQuestions[nextQuestionIndex];
        if (nextQuestion) {
          dispatch(
            startQuizThunk({
              sessionId: session.id,
              questionId: nextQuestion.id,
              prompt: nextQuestion.question,
              options: Array.isArray(nextQuestion.options) ? nextQuestion.options : [],
              duration: nextQuestion.timeLimit || 30,
            })
          );
        }
      }
    } else {
      // Sample questions mode: Simple cycling
      const newIndex = questionIndex + 1;
      setQuestionIndex(newIndex);
      
      const newQuestion = SAMPLE_QUESTIONS[newIndex % SAMPLE_QUESTIONS.length];
      
      dispatch(
        startQuizThunk({
          sessionId: session.id,
          questionId: newQuestion.questionId,
          prompt: newQuestion.prompt,
          options: newQuestion.options,
          duration: newQuestion.duration,
        })
      );
    }
  };

  const handleManualNextRound = async () => {
    if (!session || loading || !usingTemplate) return;
    
    console.log('[HostQuizPanel] Manually advancing to next round...');
    
    try {
      await advanceToNextRound(session.id);
      
      // Reload questions for the new round
      const roundInfo = await getRoundQuestions(session.id);
      console.log('[HostQuizPanel] Advanced to next round:', roundInfo);
      
      setTemplateQuestions(roundInfo.questions);
      setCurrentCategoryIndex(roundInfo.session.currentCategoryIndex);
      setCurrentQuestionIndex(0);
      
      // Don't auto-start - let host click "Start Question"
      alert(`✅ Advanced to Round ${roundInfo.session.currentCategoryIndex + 1}: ${roundInfo.currentCategory.name}`);
    } catch (error: any) {
      console.error('[HostQuizPanel] Failed to advance round:', error);
      if (error.message?.includes('last round')) {
        alert('🎉 Quiz Complete! You are already at the last round.');
      } else {
        alert('Failed to advance to next round. Check console for details.');
      }
    }
  };

  const handleManualPreviousRound = async () => {
    if (!session || loading || !usingTemplate) return;
    
    console.log('[HostQuizPanel] Manually going back to previous round...');
    
    try {
      await advanceToPreviousRound(session.id);
      
      // Reload questions for the previous round
      const roundInfo = await getRoundQuestions(session.id);
      console.log('[HostQuizPanel] Moved back to previous round:', roundInfo);
      
      setTemplateQuestions(roundInfo.questions);
      setCurrentCategoryIndex(roundInfo.session.currentCategoryIndex);
      setCurrentQuestionIndex(0);
      
      // Don't auto-start - let host click "Start Question"
      alert(`⬅️ Moved back to Round ${roundInfo.session.currentCategoryIndex + 1}: ${roundInfo.currentCategory.name}`);
    } catch (error: any) {
      console.error('[HostQuizPanel] Failed to go to previous round:', error);
      if (error.message?.includes('first round')) {
        alert('Already at the first round.');
      } else {
        alert('Failed to go to previous round. Check console for details.');
      }
    }
  };

  // Skip current question and move to next one
  const handleSkipQuestion = async () => {
    if (!session || loading) return;
    
    console.log('[HostQuizPanel] Skipping current question...');
    
    // If quiz is running, reveal it first with no correct answer (null)
    // This will end the current quiz properly
    if (quizState && quizState.status === 'running') {
      try {
        await dispatch(
          revealQuizThunk({
            sessionId: session.id,
            correctOption: null, // No correct answer when skipping
          })
        ).unwrap();
        
        console.log('[HostQuizPanel] Quiz revealed (skipped), moving to next question...');
        
        // Wait a moment for the reveal to process
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('[HostQuizPanel] Failed to reveal quiz before skipping:', error);
      }
    }
    
    // Now move to next question
    handleNextQuestion();
  };

  const revealed = quizState?.status === 'revealed';
  const running = quizState?.status === 'running';
  const progress = (() => {
    if (!quizState || quizState.duration <= 0 || timeLeft == null) return 0;
    return Math.max(Math.min(timeLeft / quizState.duration, 1), 0);
  })();

  return (
    <div id="quiz-panel" className="rounded-xl bg-white/5 backdrop-blur p-5 space-y-4">
      {/* Loading Template Indicator */}
      {loadingTemplate && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-blue-400">
          <FormattedMessage 
            id="hostQuiz.loadingTemplate" 
            defaultMessage="⏳ Loading quiz template questions..." 
          />
        </div>
      )}

      {/* Round Info Header - Visible to all when using template */}
      {usingTemplate && templateName && categories.length > 0 && (
        <RoundInfoHeader
          templateName={templateName}
          categoryName={categories[currentCategoryIndex]?.name || ''}
          currentCategoryIndex={currentCategoryIndex}
          currentQuestionIndex={currentQuestionIndex}
          totalCategories={categories.length}
          totalQuestionsInCategory={templateQuestions.length}
        />
      )}

      {/* Round Selector - Only for host controls */}
      {showHostControls && usingTemplate && categories.length > 0 && (
        <RoundSelector
          categories={categories}
          currentCategoryIndex={currentCategoryIndex}
          currentQuestionIndex={currentQuestionIndex}
          onRoundChange={handleRoundChange}
          disabled={quizState?.status === 'running'}
        />
      )}

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
            {/* Skip Question button - only show when quiz is running */}
            {running && (
              <button
                type="button"
                className="px-4 py-2 rounded border border-orange-500/40 bg-orange-500/10 text-orange-300"
                onClick={handleSkipQuestion}
                disabled={loading}
                title="Skip current question and move to next"
              >
                <FormattedMessage id="hostQuiz.skipQuestion" defaultMessage="⏭️ Skip Question" />
              </button>
            )}
            {/* Manual Round Navigation buttons - only show when using template */}
            {usingTemplate && (
              <>
                <button
                  type="button"
                  className="px-4 py-2 rounded border border-blue-500/40 bg-blue-500/10 text-blue-300"
                  onClick={handleManualPreviousRound}
                  disabled={loading || running || currentCategoryIndex === 0}
                  title="Go back to previous round"
                >
                  <FormattedMessage id="hostQuiz.previousRound" defaultMessage="⏮️ Previous Round" />
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300"
                  onClick={handleManualNextRound}
                  disabled={loading || running}
                  title="Skip remaining questions and advance to next round"
                >
                  <FormattedMessage id="hostQuiz.nextRound" defaultMessage="Next Round ⏭️" />
                </button>
              </>
            )}
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

      {/* Question Preview - Show next question when no quiz is active */}
      {!quizState && question && (
        <div className="space-y-3 border-2 border-dashed border-white/20 rounded-lg p-4 bg-white/5">
          <div className="flex items-center gap-2 text-sm opacity-70">
            <span>📝</span>
            <FormattedMessage id="hostQuiz.nextQuestionPreview" defaultMessage="Next Question Preview" />
          </div>
          <div>
            <h4 className="font-semibold text-lg">{question.prompt}</h4>
            <div className="mt-3 space-y-2">
              {question.options.map((option: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 bg-black/20"
                >
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                  {idx === question.correct && showHostControls && (
                    <span className="ml-auto text-emerald-400 text-xs">✓ Correct</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs opacity-70">
              <FormattedMessage 
                id="hostQuiz.questionDetails" 
                defaultMessage="Duration: {duration}s • Points: {points}" 
                values={{ duration: question.duration, points: question.points }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Quiz */}
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
                {/* Buzzer mode access message */}
                {isBuzzerMode && isLockedToSomeoneElse && !revealed && (
                  <div className="px-4 py-3 rounded bg-yellow-500/20 border border-yellow-400/40 text-sm text-yellow-100">
                    <FormattedMessage
                      id="playerQuiz.buzzerLocked"
                      defaultMessage="Another player buzzed first. Wait for host to reset buzzer."
                    />
                  </div>
                )}
                {isBuzzerMode && !buzzerState?.lockedForParticipantId && !revealed && (
                  <div className="px-4 py-3 rounded bg-blue-500/20 border border-blue-400/40 text-sm text-blue-100">
                    <FormattedMessage
                      id="playerQuiz.buzzerWaiting"
                      defaultMessage="Press the buzzer at the bottom to answer this question!"
                    />
                  </div>
                )}
                {quizState.options.map((option, idx) => {
                  const isCorrect = revealed && idx === quizState.correctOption;
                  // Use submittedAnswer (not selected) to show which answer the player actually submitted
                  const isWrongSelection = revealed && submittedAnswer === idx && quizState.correctOption !== idx;
                  
                  return (
                    <label
                      key={option}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                        canPlayerSubmit && !revealed && !submitted ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      } ${
                        isCorrect
                          ? 'bg-emerald-500/20 border-emerald-400/40'
                          : isWrongSelection
                          ? 'bg-red-500/20 border-red-400/40'
                          : 'border-white/10 bg-black/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="player-answer"
                        value={idx}
                        checked={selected === idx}
                        onChange={() => setSelected(idx)}
                        disabled={revealed || submitted || !canPlayerSubmit}
                        className="cursor-pointer"
                      />
                      <span className={`flex-1 ${isWrongSelection ? 'text-red-300' : ''}`}>
                        {option}
                      </span>
                      {isCorrect && (
                        <span className="text-xs uppercase tracking-[0.2em] text-emerald-200 flex items-center gap-1">
                          ✓ <FormattedMessage id="hostQuiz.correct" defaultMessage="Correct" />
                        </span>
                      )}
                      {isWrongSelection && (
                        <span className="text-xs uppercase tracking-[0.2em] text-red-300 flex items-center gap-1">
                          ✗ <FormattedMessage id="hostQuiz.wrong" defaultMessage="Wrong" />
                        </span>
                      )}
                    </label>
                  );
                })}
                {!submitted && !revealed && (
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[var(--color-primary)] text-white disabled:bg-white/10 disabled:text-white/50 w-full"
                    disabled={selected == null || quizState.status !== 'running' || !canPlayerSubmit}
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
