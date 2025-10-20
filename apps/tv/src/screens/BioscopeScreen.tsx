import type { BioscopeGameState } from '../lib/bioscopeSocket';

type RawBioscopeAnswer = NonNullable<BioscopeGameState['answers']>[number];

interface BioscopeScreenProps {
  sessionCode: string;
  gameState: BioscopeGameState | null;
  revealedImages: Array<{ id: string; url?: string }>;
  buzzerEvents: Array<{ participantName: string; teamName?: string; timestamp: string }>;
  recentAnswers: Array<{ participantName: string; answer: string; points?: number }>;
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'Waiting',
  active: 'Images Hidden',
  revealing: 'Revealing',
  answering: 'Players Answering',
  revealed: 'Answer Revealed',
  completed: 'Completed',
};

export default function BioscopeScreen({
  sessionCode,
  gameState,
  revealedImages,
  buzzerEvents,
  recentAnswers,
}: BioscopeScreenProps) {
  if (!gameState) {
    return (
      <div className="bioscope-screen bioscope-screen--empty">
        <div className="bioscope-empty-card">
          <h2>No Bioscope game running yet</h2>
          <p>When the host starts a Bioscope round it will appear here automatically.</p>
          <div className="bioscope-session-code">
            <span>Session</span>
            <strong>{sessionCode || '----'}</strong>
          </div>
        </div>
      </div>
    );
  }

  const round = gameState.template?.currentRound;
  const totalImages = round?.images?.length ?? 0;
  const configuration = gameState.template?.configuration as { max_images?: number } | undefined;
  const configuredMaxImages =
    configuration && typeof configuration.max_images === 'number' ? configuration.max_images : undefined;
  const maxImagesDisplay = (configuredMaxImages ?? totalImages) || undefined;
  const revealedSet = new Set((gameState.revealedImages ?? []).map((item) => String(item)));

  const mergedRecentAnswers =
    recentAnswers.length > 0
      ? recentAnswers
      : (gameState.answers ?? []).map((answer: RawBioscopeAnswer) => ({
          participantName: answer.participantName,
          answer: answer.answer,
          points: answer.pointsAwarded,
        }));

  const statusLabel = STATUS_LABELS[gameState.status] ?? gameState.status;

  return (
    <div className="bioscope-screen">
      <header className="bioscope-header">
        <div>
          <h1 className="bioscope-title">{round?.title || gameState.template?.name || 'Bioscope Round'}</h1>
          <p className="bioscope-subtitle">
            Round {gameState.currentRoundId + 1} of {maxImagesDisplay ?? '?'}
          </p>
        </div>
        <div className="bioscope-header-meta">
          <div className="bioscope-session-code">
            <span>Session</span>
            <strong>{sessionCode || '----'}</strong>
          </div>
          <div className={`bioscope-status bioscope-status--${gameState.status}`}>
            {statusLabel}
          </div>
          <div className="bioscope-timer">
            <span>Timer</span>
            <strong>
              {gameState.timeRemaining !== null && gameState.timeRemaining !== undefined
                ? `${gameState.timeRemaining}s`
                : 'Ready'}
            </strong>
          </div>
        </div>
      </header>

      <main className="bioscope-content">
        <section className="bioscope-images">
          <h2 className="bioscope-section-title">Image Progress</h2>
          <div className="bioscope-image-grid">
            {round?.images && round.images.length > 0 ? (
              round.images.map((image, index) => {
                const key = image.id ? String(image.id) : String(index + 1);
                const isRevealed = revealedSet.has(key) || revealedSet.has(String(index + 1));
                return (
                  <div
                    key={key}
                    className={`bioscope-image-card ${isRevealed ? 'bioscope-image-card--revealed' : ''}`}
                  >
                    <div className="bioscope-image-index">Image {index + 1}</div>
                    {image.hint && <div className="bioscope-image-hint">{image.hint}</div>}
                    <div className="bioscope-image-state">{isRevealed ? 'Revealed' : 'Hidden'}</div>
                  </div>
                );
              })
            ) : (
              <div className="bioscope-image-placeholder">
                Waiting for the host to select a Bioscope template...
              </div>
            )}
          </div>
          <div className="bioscope-recent-images">
            <h3>Recently Revealed</h3>
            <div className="bioscope-recent-image-list">
              {revealedImages.slice(-6).map((image) => (
                <div key={image.id} className="bioscope-recent-image">
                  Image {image.id}
                </div>
              ))}
              {revealedImages.length === 0 && <span className="bioscope-empty-text">No images revealed yet</span>}
            </div>
          </div>
        </section>

        <aside className="bioscope-sidebar">
          <section className="bioscope-panel">
            <h2 className="bioscope-section-title">Live Answers</h2>
            <div className="bioscope-list">
              {mergedRecentAnswers.length === 0 ? (
                <p className="bioscope-empty-text">No answers submitted yet.</p>
              ) : (
                mergedRecentAnswers.slice(0, 6).map((answer, index) => (
                  <div key={`${answer.participantName}-${index}`} className="bioscope-list-item">
                    <div>
                      <strong>{answer.participantName}</strong>
                      <span className="bioscope-answer-value">{String(answer.answer)}</span>
                    </div>
                    {answer.points !== undefined && (
                      <span
                        className={`bioscope-answer-points ${
                          answer.points > 0 ? 'positive' : answer.points < 0 ? 'negative' : ''
                        }`}
                      >
                        {answer.points > 0 ? `+${answer.points}` : answer.points}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bioscope-panel">
            <h2 className="bioscope-section-title">Buzzer Activity</h2>
            <div className="bioscope-list">
              {buzzerEvents.length === 0 ? (
                <p className="bioscope-empty-text">No buzzer presses yet.</p>
              ) : (
                buzzerEvents.slice(0, 6).map((event, index) => (
                  <div key={`${event.timestamp}-${index}`} className="bioscope-list-item">
                    <div>
                      <strong>{event.participantName}</strong>
                      {event.teamName && <span className="bioscope-team-tag">{event.teamName}</span>}
                    </div>
                    <span className="bioscope-timestamp">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {(gameState.status === 'revealed' || gameState.status === 'completed') && round?.answer?.title && (
            <section className="bioscope-panel bioscope-answer-panel">
              <h2 className="bioscope-section-title">Correct Answer</h2>
              <div className="bioscope-answer-card">
                <strong>{round.answer.title}</strong>
                {round.answer.alternatives && round.answer.alternatives.length > 0 && (
                  <p className="bioscope-answer-alt">
                    Also accepted: {round.answer.alternatives.join(', ')}
                  </p>
                )}
              </div>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
