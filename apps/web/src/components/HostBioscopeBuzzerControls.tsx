import React, { useCallback, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { openBioscopeBuzzer, closeBioscopeBuzzer, resetBioscopeBuzzer } from '../lib/api';

interface HostBioscopeBuzzerControlsProps {
  sessionId: string;
}

export function HostBioscopeBuzzerControls({ sessionId }: HostBioscopeBuzzerControlsProps) {
  const buzzerState = useAppSelector((s) => s.bioscope.buzzer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenBuzzer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await openBioscopeBuzzer(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open buzzer');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleCloseBuzzer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await closeBioscopeBuzzer(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close buzzer');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleResetBuzzer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await resetBioscopeBuzzer(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset buzzer');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Buzzer Controls</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            buzzerState.isOpen
              ? 'bg-green-500/20 text-green-300 border border-green-500/40'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          {buzzerState.isOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      {buzzerState.pressedBy && (
        <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3">
          <p className="text-sm text-blue-200">
            <strong>{buzzerState.pressedBy.displayName}</strong>{' '}
            {buzzerState.pressedBy.teamName && `(${buzzerState.pressedBy.teamName})`} pressed the buzzer
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleOpenBuzzer}
          disabled={loading || buzzerState.isOpen}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            loading || buzzerState.isOpen
              ? 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
              : 'border border-green-500/40 bg-green-500/20 text-green-200 hover:bg-green-500/30'
          }`}
        >
          Open Buzzer
        </button>

        <button
          type="button"
          onClick={handleCloseBuzzer}
          disabled={loading || !buzzerState.isOpen}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            loading || !buzzerState.isOpen
              ? 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
              : 'border border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30'
          }`}
        >
          Close Buzzer
        </button>

        <button
          type="button"
          onClick={handleResetBuzzer}
          disabled={loading}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            loading
              ? 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
              : 'border border-yellow-500/40 bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30'
          }`}
        >
          Reset
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Open the buzzer to allow players to buzz in. The first player to press will lock the buzzer.
      </p>
    </div>
  );
}
