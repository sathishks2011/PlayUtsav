import React, { useCallback, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { pressBioscopeBuzzer } from '../lib/api';

interface PlayerBioscopeBuzzerButtonProps {
  sessionId: string;
  participantId: string;
}

export function PlayerBioscopeBuzzerButton({
  sessionId,
  participantId,
}: PlayerBioscopeBuzzerButtonProps) {
  const buzzerState = useAppSelector((s) => s.bioscope.buzzer);
  const [pressing, setPressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePress = useCallback(async () => {
    if (!buzzerState.isOpen || buzzerState.lockedForParticipantId) {
      return;
    }

    setPressing(true);
    setError(null);
    try {
      await pressBioscopeBuzzer(sessionId, participantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to press buzzer');
    } finally {
      setPressing(false);
    }
  }, [sessionId, participantId, buzzerState.isOpen, buzzerState.lockedForParticipantId]);

  const isDisabled = !buzzerState.isOpen || Boolean(buzzerState.lockedForParticipantId) || pressing;
  const iWon = buzzerState.lockedForParticipantId === participantId;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Buzzer</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            buzzerState.isOpen && !buzzerState.lockedForParticipantId
              ? 'bg-green-500/20 text-green-300 border border-green-500/40 animate-pulse'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          {buzzerState.isOpen && !buzzerState.lockedForParticipantId
            ? 'Ready'
            : buzzerState.lockedForParticipantId
            ? 'Locked'
            : 'Waiting'}
        </span>
      </div>

      {iWon && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-center">
          <p className="text-lg font-semibold text-green-200">🎉 You got it!</p>
          <p className="text-sm text-green-300 mt-1">Wait for the host to award points</p>
        </div>
      )}

      {buzzerState.pressedBy && !iWon && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-center">
          <p className="text-sm text-red-200">
            <strong>{buzzerState.pressedBy.displayName}</strong> buzzed first
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handlePress}
        disabled={isDisabled}
        className={`w-full rounded-lg px-6 py-8 text-2xl font-bold transition-all ${
          isDisabled
            ? 'cursor-not-allowed border-2 border-gray-700 bg-gray-800 text-gray-500'
            : 'border-4 border-yellow-500 bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30 hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/20'
        }`}
      >
        {pressing ? '...' : iWon ? '✓ BUZZED' : '🔔 BUZZ!'}
      </button>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 text-center">
          {error}
        </div>
      )}

      {buzzerState.isOpen && !buzzerState.lockedForParticipantId && (
        <p className="text-xs text-center text-gray-400 animate-pulse">
          Press the buzzer when you know the answer!
        </p>
      )}
    </div>
  );
}
