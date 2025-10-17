import React from 'react';
import type { BioscopeGameState } from '../store/slices/bioscopeSlice';

interface BioscopeImageRevealControlProps {
  gameState: BioscopeGameState | null;
  onRevealNext: () => void;
  onRevealAnswer: () => void;
  isRevealing: boolean;
  disabled?: boolean;
}

export const BioscopeImageRevealControl: React.FC<BioscopeImageRevealControlProps> = ({
  gameState,
  onRevealNext,
  onRevealAnswer,
  isRevealing,
  disabled,
}) => {
  const currentRound = gameState?.template.currentRound;
  const totalImages = currentRound?.images?.length || 0;
  const revealedCount = gameState?.revealedImages.length || 0;
  const hasMoreImages = revealedCount < totalImages;

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-white text-lg font-semibold">Image Reveal Control</h3>
          <p className="text-sm text-gray-400">
            Reveal images one at a time. Earlier guesses earn more points.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm">
          {revealedCount}/{totalImages} revealed
        </div>
      </header>

      {/* Image Frames */}
      <div className="flex gap-2">
        {currentRound?.images?.map((image, index) => {
          const isRevealed = gameState?.revealedImages.includes(index + 1);
          const isCurrent = gameState?.currentImageId === index + 1;

          return (
            <div
              key={image.id || index}
              className={`flex-1 h-20 rounded-lg border-2 flex items-center justify-center text-xs text-center px-2 transition-all ${
                isRevealed
                  ? 'border-green-400/60 bg-green-500/10 text-green-200'
                  : 'border-gray-700 bg-gray-800 text-gray-500'
              } ${isCurrent ? 'animate-pulse border-blue-400/60 bg-blue-500/10 text-blue-200' : ''}`}
            >
              <div className="space-y-1">
                <p className="font-semibold">Image {index + 1}</p>
                {image.hint && <p className="text-[10px] leading-tight text-gray-400">{image.hint}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onRevealNext}
          disabled={!hasMoreImages || isRevealing || disabled}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
            !hasMoreImages || disabled
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          {isRevealing ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Revealing...
            </span>
          ) : (
            <>
              <span role="img" aria-label="reveal">
                🖼️
              </span>
              Reveal Next Image
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onRevealAnswer}
          disabled={!gameState || disabled}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
            !gameState || disabled
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
          }`}
        >
          <span role="img" aria-label="answer">
            🎉
          </span>
          Reveal Answer
        </button>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 bg-gray-900/80 border border-gray-800 rounded-lg p-3">
        <p className="font-semibold text-gray-300 mb-1">Scoring Tip</p>
        <p>
          Players earn more points for guessing on earlier images. Final image awards a common score.
          Timer starts when an image is revealed.
        </p>
      </div>
    </div>
  );
};
