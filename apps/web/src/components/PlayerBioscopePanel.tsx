import React from 'react';
import type { BioscopeGameState } from '../store/slices/bioscopeSlice';
import { PlayerBioscopeBuzzerButton } from './PlayerBioscopeBuzzerButton';
import { useBioscopeBuzzerSync } from '../hooks/useBioscopeBuzzerSync';

interface PlayerBioscopePanelProps {
  gameState: BioscopeGameState | null;
  sessionId: string;
  participantId: string;
  playerEngagementType?: string;
  onSubmitAnswer: (answer: string) => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

export const PlayerBioscopePanel: React.FC<PlayerBioscopePanelProps> = ({
  gameState,
  sessionId,
  participantId,
  playerEngagementType,
  onSubmitAnswer,
  isSubmitting,
  disabled,
}) => {
  const [answer, setAnswer] = React.useState('');
  
  // Sync buzzer state via WebSocket
  // Temporarily disabled to fix blank screen issue
  // useBioscopeBuzzerSync(sessionId);

  if (!gameState) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-6 text-center">
        <p className="text-gray-400">Waiting for host to start the game...</p>
      </div>
    );
  }

  const currentRound = gameState.template?.currentRound;
  const revealedImageIds = gameState.revealedImages || [];
  const revealedSet = React.useMemo(() => new Set((revealedImageIds || []).map((v) => String(v))), [revealedImageIds]);
  const timeRemaining = gameState.timeRemaining ?? null;
  const showFinalAnswer = gameState.status === 'revealed' || gameState.status === 'completed';
  const isAnswering = gameState.status === 'answering';

  // Get all images for the current round
  const allImages = currentRound?.images || [];
  const totalImages = allImages.length;

  return (
    <div className="space-y-4">
      {/* Game Status Header */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white">{currentRound?.title || 'Bioscope Round'}</h3>
          {timeRemaining !== null && (
            <div className={`px-3 py-1 rounded-lg font-bold ${
              timeRemaining <= 10 
                ? 'bg-red-500/20 text-red-200 border border-red-500/40' 
                : 'bg-blue-500/20 text-blue-200 border border-blue-500/40'
            }`}>
              ⏱️ {timeRemaining}s
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Images Revealed: {revealedImageIds.length} / {totalImages}</span>
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 text-xs">
            {gameState.status === 'idle' ? 'Waiting to Start' :
             gameState.status === 'revealing' ? 'Revealing Images' :
             gameState.status === 'answering' ? 'Answer Now!' :
             gameState.status === 'revealed' ? 'Answer Revealed' : 'Completed'}
          </span>
        </div>
      </div>

      {/* Image Grid - Shows all images, revealed ones are visible */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
          Image Clues ({revealedImageIds.length} revealed)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allImages.map((image, idx) => {
              const imageNumber = idx + 1;
              const imageIndexKey = String(imageNumber);
              const imageIdKey = image.id ? String(image.id) : null;
              const isRevealed = revealedSet.has(imageIndexKey) || (imageIdKey && revealedSet.has(imageIdKey));
            
            return (
              <div
                key={image.id || idx}
                className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                  isRevealed
                    ? 'border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                    : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                {isRevealed ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2">
                    {image.file ? (
                      <img
                        src={image.file}
                        alt={`Image ${imageNumber}`}
                        className="max-w-full max-h-full object-contain rounded"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            console.error('[PlayerBioscopePanel] Image load failed:', img.src);
                            try {
                              const src = img.getAttribute('src') || '';
                              if (src && !src.startsWith('/') && !src.startsWith('http')) {
                                img.onerror = null;
                                img.src = '/' + src;
                                return;
                              }
                            } catch (err) {
                              // ignore
                            }

                            img.style.display = 'none';
                          }}
                      />
                    ) : (
                      <div className="text-gray-400 text-xs">No image</div>
                    )}
                    {image.hint && (
                      <p className="text-xs text-emerald-200 mt-2 text-center line-clamp-2">{image.hint}</p>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🔒</div>
                      <div className="text-xs text-gray-500">Image {imageNumber}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Answer Section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-6 space-y-4">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Your Answer</h4>
        
        {/* Buzzer Mode */}
        {playerEngagementType === 'BUZZER' && !showFinalAnswer && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Press the buzzer to answer!</p>
            {/* Buzzer component will be shown at the bottom of the screen when enabled */}
            <div className="text-xs text-gray-500 italic">
              Buzzer will appear at the bottom when opened by host
            </div>
          </div>
        )}

        {/* Text Input Mode */}
        {(!playerEngagementType || playerEngagementType !== 'BUZZER') && !showFinalAnswer && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!disabled && !isSubmitting && answer.trim()) {
                onSubmitAnswer(answer.trim());
                setAnswer('');
              }
            }}
            className="space-y-3"
          >
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={disabled || isSubmitting || !isAnswering}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={disabled || isSubmitting || !answer.trim() || !isAnswering}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                disabled || isSubmitting || !answer.trim() || !isAnswering
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/30'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>
            {!isAnswering && !showFinalAnswer && (
              <p className="text-xs text-gray-500 text-center">
                Wait for the host to reveal images and start the timer
              </p>
            )}
          </form>
        )}

        {/* Show Final Answer */}
        {showFinalAnswer && currentRound?.answer && (
          <div className="text-center space-y-2">
            <div className="text-sm text-gray-400">Correct Answer:</div>
            <div className="text-2xl font-bold text-emerald-300">
              {currentRound.answer.title}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
