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
  const currentRound = gameState?.template?.currentRound;
  const totalImages = currentRound?.images?.length || 0;
  const revealedCount = gameState?.revealedImages?.length || 0;
  // Normalize revealed identifiers to strings so we can safely check
  // whether an image is revealed regardless of whether the server
  // sent numeric indices (1-based) or string ids.
  const revealedSet = React.useMemo(() => {
    return new Set((gameState?.revealedImages || []).map((v) => String(v)));
  }, [gameState?.revealedImages]);
  const hasMoreImages = revealedCount < totalImages;
  const nextImageIndex = revealedCount; // 0-based index for next image to reveal

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

      {/* Next Image Preview */}
      {hasMoreImages && nextImageIndex < (currentRound?.images?.length || 0) && (
        <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
            Next Image to Reveal
          </h4>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-500/40 bg-gray-900 flex items-center justify-center">
              {currentRound?.images[nextImageIndex]?.file ? (
                <img
                  src={currentRound.images[nextImageIndex].file}
                  alt={`Preview ${nextImageIndex + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    // Log the failing URL so we can diagnose path issues in dev tools
                    console.error('[BioscopeImageRevealControl] Image load failed:', img.src);

                    // If the src looks like a relative path without a leading slash,
                    // try prefixing it with '/' once to correct common mistakes.
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

                    // Otherwise hide the image gracefully. Avoid touching parentElement.innerHTML
                    img.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-gray-500 text-xs">No image</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium mb-1">Image #{nextImageIndex + 1}</p>
              {currentRound?.images[nextImageIndex]?.hint && (
                <p className="text-sm text-gray-400">
                  <span className="text-gray-500">Hint:</span> {currentRound.images[nextImageIndex].hint}
                </p>
              )}
              {currentRound?.images[nextImageIndex]?.points_multiplier && (
                <p className="text-sm text-green-400 mt-1">
                  Points Multiplier: {currentRound.images[nextImageIndex].points_multiplier}×
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Frames */}
  {(gameState?.revealedImages?.length ?? 0) > 0 && (
    <div className="flex flex-col items-center">
      {(gameState?.status === 'revealed' || gameState?.status === 'completed') && currentRound?.answer?.title && (
        <div className="mb-2 text-center">
          <span className="block text-lg font-bold text-purple-300">{currentRound.answer.title}</span>
        </div>
      )}
      <div className="flex gap-2">
        {currentRound?.images?.map((image, index) => {
          // image may be revealed by position (1-based index) or by id
          const imageIndexKey = String(index + 1);
          const imageIdKey = image.id ? String(image.id) : null;
          const isRevealed = revealedSet.has(imageIndexKey) || (imageIdKey && revealedSet.has(imageIdKey));
          if (!isRevealed) return null;
          return (
            <div
              key={image.id || index}
              className="h-20 w-20 rounded-lg border-2 flex items-center justify-center text-xs text-center px-2 transition-all border-green-400/60 bg-green-500/10 text-green-200"
            >
              <div className="w-full h-full flex flex-col items-center justify-center">
                {image.file && (
                  <img
                    src={image.file}
                    alt={`Revealed ${index + 1}`}
                    className="w-12 h-12 object-cover rounded border border-gray-700"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML += `<div class='text-red-400 text-xs text-center p-1'>Image not found</div>`;
                    }}
                  />
                )}
                {image.hint && <p className="text-[10px] leading-tight text-gray-400 mt-1">{image.hint}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

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
          disabled={!gameState || disabled || !gameState.revealedImages?.length || gameState.status === 'revealed' || gameState.status === 'completed'}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
            !gameState || disabled || !gameState.revealedImages?.length || gameState.status === 'revealed' || gameState.status === 'completed'
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
