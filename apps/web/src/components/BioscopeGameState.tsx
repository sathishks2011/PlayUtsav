import React from 'react';
import type { BioscopeGameState as BioscopeGameStateModel } from '../store/slices/bioscopeSlice';

interface BioscopeGameStateProps {
  gameState: BioscopeGameStateModel | null;
}

export const BioscopeGameStatePanel: React.FC<BioscopeGameStateProps> = ({ gameState }) => {
  if (!gameState) {
    return (
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 text-center text-gray-400">
        <p>Start a Bioscope game to see live progress here.</p>
      </div>
    );
  }

  const { template, currentRoundId, status, answers, revealedImages, timerDuration, timeRemaining } = gameState;
  const currentRound = template?.currentRound;

  const revealedSet = React.useMemo(() => new Set((revealedImages || []).map((v) => String(v))), [revealedImages]);

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-white text-lg font-semibold">Current Game State</h3>
          <p className="text-sm text-gray-400">
            Round {currentRoundId + 1}: {currentRound?.title || 'Loading...'}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'answering'
              ? 'bg-blue-500/20 text-blue-300'
              : status === 'revealed'
              ? 'bg-purple-500/20 text-purple-300'
              : status === 'completed'
              ? 'bg-green-500/20 text-green-300'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Status: {status}
        </span>
      </header>

      {/* Round Details */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Round Details</h4>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Images Revealed</span>
              <span className="text-white font-medium">
                {revealedImages?.length || 0} / {currentRound?.images?.length || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Timer</span>
              <span className="text-white font-medium">
                {timeRemaining !== null ? `${timeRemaining}s` : '—'} / {timerDuration}s
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Answer</span>
              <span className="text-white font-medium">
                {status === 'revealed' || status === 'completed'
                  ? currentRound?.answer?.title || 'N/A'
                  : 'Hidden'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Player Answers</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            {!answers || answers.length === 0 ? (
              <p className="text-sm text-gray-500">No answers submitted yet.</p>
            ) : (
              answers.map((answer) => (
                <div
                  key={`${answer.participantId}-${answer.submittedAt}`}
                  className="flex items-center justify-between bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2 text-sm"
                >
                  <div>
                    <p className="text-gray-200 font-medium">{answer.participantName}</p>
                    <p className="text-xs text-gray-500">
                      Image {answer.imageRevealedAt} · {new Date(answer.submittedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${answer.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {answer.isCorrect ? 'Correct' : 'Incorrect'}
                    </p>
                    <p className="text-xs text-gray-400">+{answer.pointsAwarded} pts</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Image Reveal Overview */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Image Progress</h4>
        <div className="flex gap-2">
          {currentRound?.images?.map((image, index) => {
            const imageIndexKey = String(index + 1);
            const imageIdKey = image.id ? String(image.id) : null;
            const isRevealed = revealedSet.has(imageIndexKey) || (imageIdKey && revealedSet.has(imageIdKey));
            return (
              <div
                key={image.id || index}
                className={`flex-1 h-16 rounded-lg border flex flex-col items-center justify-center text-xs text-center px-2 ${
                  isRevealed
                    ? 'border-green-500/60 bg-green-500/10 text-green-200'
                    : 'border-gray-700 bg-gray-900 text-gray-500'
                }`}
              >
                <span className="font-semibold">Image {index + 1}</span>
                {image.hint && <span className="text-[10px] text-gray-400">{image.hint}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
