import { useEffect, useState } from 'react';
import type { QuizState } from '@pkg/core';

interface QuizScreenProps {
  quizState: QuizState;
  sessionCode: string;
}

export default function QuizScreen({ quizState, sessionCode }: QuizScreenProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (quizState.status !== 'running' || !quizState.createdAt) {
      return;
    }

    const createdAt = new Date(quizState.createdAt).getTime();
    const duration = quizState.duration || 30;
    const endTime = createdAt + duration * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining > 0) {
        requestAnimationFrame(updateTimer);
      }
    };

    updateTimer();
  }, [quizState]);

  if (
    (quizState.status !== 'running' && quizState.status !== 'revealed') ||
    !quizState.prompt
  ) {
    return null;
  }

  const totalAnswers = quizState.answers?.length || 0;
  const isRevealed = quizState.status === 'revealed';

  return (
    <div className="quiz-screen">
      <div className="quiz-header">
        <div className="session-badge">
          <span className="badge-label">Session</span>
          <span className="badge-value">{sessionCode}</span>
        </div>

        <div className={`timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
          <span className="timer-value">{timeLeft}s</span>
        </div>
      </div>

      <div className="question-container">
        <h1 className="question-text">{quizState.prompt}</h1>
      </div>

      <div className="answer-grid">
        {quizState.options.map((option: string, index: number) => {
          const answerCount =
            quizState.answers?.filter(
              (answer: QuizState['answers'][number]) => answer.answer === index,
            ).length || 0;
          const percentage =
            totalAnswers > 0 ? (answerCount / totalAnswers) * 100 : 0;
          const colorClasses = [
            'answer-color-a',
            'answer-color-b',
            'answer-color-c',
            'answer-color-d',
          ];
          const colorClass = colorClasses[index % colorClasses.length];
          const isCorrect = isRevealed && quizState.correctOption === index;

          return (
            <div
              key={index}
              className={`answer-option ${colorClass} ${
                isCorrect ? 'answer-correct' : ''
              }`}
            >
              <div className="option-header">
                <span className={`option-letter ${colorClass}-bg`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="option-text">{option}</span>
                {isCorrect && (
                  <span className="correct-indicator">Correct!</span>
                )}
              </div>

              {isRevealed && (
                <div className="answer-stats">
                  <div className="stat-bar-container">
                    <div
                      className={`stat-bar ${colorClass}-bg`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="stat-count">
                    {answerCount} player{answerCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="quiz-footer">
        <div className="stat-item">
          <span className="stat-label">Players Answered</span>
          <span className="stat-value">{totalAnswers}</span>
        </div>
      </div>
    </div>
  );
}
