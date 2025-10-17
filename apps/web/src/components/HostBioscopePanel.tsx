import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Team } from '@pkg/core';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  startBioscopeGame,
  revealBioscopeImage,
  revealBioscopeAnswer,
  awardManualScore,
  nextBioscopeRound,
  fetchBioscopeGameState,
  updateTimeRemaining,
  clearError,
} from '../store/slices/bioscopeSlice';
import { BioscopeTemplateSelector } from './BioscopeTemplateSelector';
import { BioscopeImageRevealControl } from './BioscopeImageRevealControl';
import { BioscopeManualScoring } from './BioscopeManualScoring';
import { BioscopeTimer } from './BioscopeTimer';
import { BioscopeGameStatePanel } from './BioscopeGameState';

type ManualParticipant = {
  id: string;
  name: string;
  teamId?: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Something went wrong. Please try again.';
}

export function HostBioscopePanel() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session.current);
  const user = useAppSelector((s) => s.auth.user);
  const { selectedTemplate, currentGame, loading, error, lastAction } = useAppSelector((s) => s.bioscope);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const sessionId = session?.id;
  const hostId = session?.hostId ?? user?.id ?? undefined;

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  useEffect(() => {
    if (!sessionId || currentGame) {
      return;
    }

    dispatch(fetchBioscopeGameState({ sessionId }))
      .unwrap()
      .catch(() => {
        dispatch(clearError());
      });
  }, [dispatch, sessionId, currentGame]);

  useEffect(() => {
    if (!currentGame || !currentGame.timerStartedAt || currentGame.status !== 'answering') {
      return;
    }

    const startedAt = new Date(currentGame.timerStartedAt).getTime();
    if (Number.isNaN(startedAt)) {
      return;
    }

    const deadline = startedAt + currentGame.timerDuration * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      dispatch(updateTimeRemaining(remaining));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [dispatch, currentGame?.timerStartedAt, currentGame?.timerDuration, currentGame?.status]);

  const participantsForScoring = useMemo<ManualParticipant[]>(() => {
    if (!session) {
      return [];
    }

    return session.participants
      .filter((participant) => participant.role !== 'HOST')
      .map((participant) => ({
        id: participant.id,
        name: participant.displayName,
        teamId: participant.teamId ?? null,
      }));
  }, [session]);

  const teams: Team[] = session?.teams ?? [];

  const allowManualScoring = currentGame?.template.configuration.allow_manual_scoring ??
    selectedTemplate?.configuration?.allow_manual_scoring ?? true;

  const isRevealing = loading && lastAction === 'reveal-image';
  const revealDisabled = !currentGame || loading || currentGame.status === 'completed';
  const canRevealAnswer = Boolean(
    currentGame &&
      currentGame.revealedImages.length > 0 &&
      currentGame.status !== 'revealed' &&
      currentGame.status !== 'completed'
  );
  const canAdvanceRound = Boolean(currentGame && currentGame.status === 'revealed');

  const duration = currentGame?.timerDuration ?? selectedTemplate?.configuration?.timer_seconds ?? 30;
  const timeRemaining = currentGame?.timeRemaining ?? null;
  const isTimerActive = Boolean(currentGame && currentGame.status === 'answering');

  const clearMessages = useCallback(() => {
    setFeedback(null);
    setLocalError(null);
  }, []);

  const handleStartGame = useCallback(async () => {
    if (!sessionId || !selectedTemplate) {
      return;
    }

    clearMessages();
    try {
      await dispatch(startBioscopeGame({ sessionId, templateId: selectedTemplate.id })).unwrap();
      setFeedback(`Started "${selectedTemplate.name}"`);
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  }, [dispatch, sessionId, selectedTemplate, clearMessages]);

  const handleRevealNext = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    clearMessages();
    try {
      await dispatch(revealBioscopeImage({ sessionId })).unwrap();
      setFeedback('Revealed next image');
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  }, [dispatch, sessionId, clearMessages]);

  const handleRevealAnswer = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    clearMessages();
    try {
      await dispatch(revealBioscopeAnswer({ sessionId })).unwrap();
      setFeedback('Answer revealed');
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  }, [dispatch, sessionId, clearMessages]);

  const handleNextRound = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    clearMessages();
    try {
      await dispatch(nextBioscopeRound({ sessionId })).unwrap();
      setFeedback('Advanced to next round');
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  }, [dispatch, sessionId, clearMessages]);

  const handleManualScore = useCallback(
    async (participantId: string, participantName: string, points: number, reason?: string) => {
      if (!sessionId) {
        return;
      }

      clearMessages();
      try {
        await dispatch(
          awardManualScore({ sessionId, participantId, participantName, points, reason })
        ).unwrap();
        await dispatch(fetchBioscopeGameState({ sessionId })).unwrap();
        setFeedback(`Awarded ${points} points to ${participantName}`);
      } catch (err) {
        setLocalError(getErrorMessage(err));
      }
    },
    [dispatch, sessionId, clearMessages]
  );

  const handleRefreshState = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    clearMessages();
    try {
      await dispatch(fetchBioscopeGameState({ sessionId })).unwrap();
      setFeedback('Game state refreshed');
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  }, [dispatch, sessionId, clearMessages]);

  const handleTimerExpired = useCallback(() => {
    if (!sessionId) {
      return;
    }
    dispatch(fetchBioscopeGameState({ sessionId }));
  }, [dispatch, sessionId]);

  const isStartDisabled = !selectedTemplate || !sessionId || loading || Boolean(currentGame);

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 space-y-5 shadow-lg shadow-black/20">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Bioscope Host Controls</h2>
            <p className="text-sm text-gray-400">
              Load a template, reveal images, award points, and keep the game flowing.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <span className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1">
              {currentGame ? `Status: ${currentGame.status}` : 'Not started'}
            </span>
            {currentGame && (
              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-blue-200">
                Round {currentGame.currentRoundId + 1}
              </span>
            )}
          </div>
        </header>

        <BioscopeTemplateSelector
          hostId={hostId}
          onTemplateSelect={() => {
            clearMessages();
          }}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleStartGame}
            disabled={isStartDisabled}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              isStartDisabled
                ? 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
                : 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
            }`}
          >
            Start Bioscope
          </button>
          <button
            type="button"
            onClick={handleRefreshState}
            disabled={!sessionId}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              sessionId
                ? 'border border-blue-500/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20'
                : 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
            }`}
          >
            Refresh State
          </button>
        </div>

        {!sessionId && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            Create a host session from the Dashboard to enable game controls. Template previews remain available while you prep.
          </div>
        )}

        {(feedback || localError) && (
          <div
            role="status"
            className={`rounded-lg border px-4 py-2 text-sm ${
              localError
                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {localError ?? feedback}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 space-y-4">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Live Round Overview</h3>
                <p className="text-sm text-gray-400">
                  Keep an eye on the timer and revealed images to pace the round.
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {currentGame?.template.currentRound?.title ?? 'No round active'}
              </div>
            </header>

            <BioscopeTimer
              timeRemaining={timeRemaining}
              duration={duration}
              isActive={isTimerActive}
              onTimeUp={handleTimerExpired}
            />
          </div>

          <BioscopeImageRevealControl
            gameState={currentGame ?? null}
            onRevealNext={handleRevealNext}
            onRevealAnswer={handleRevealAnswer}
            isRevealing={isRevealing}
            disabled={revealDisabled}
          />
        </div>

        <div className="space-y-6">
          {allowManualScoring && (
            <BioscopeManualScoring
              teams={teams}
              participants={participantsForScoring}
              onAwardPoints={handleManualScore}
            />
          )}

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Round Controls</h3>
              {currentGame?.template.currentRound && (
                <span className="text-sm text-gray-400">
                  Images revealed: {currentGame.revealedImages.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleNextRound}
              disabled={!canAdvanceRound}
              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                canAdvanceRound
                  ? 'border border-purple-500/40 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30'
                  : 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
              }`}
            >
              {currentGame?.status === 'completed' ? 'Game Completed' : 'Next Round'}
            </button>
            {!allowManualScoring && (
              <p className="text-xs text-gray-500">
                Manual scoring is disabled for this template. Enable it in template settings if you need manual awards.
              </p>
            )}
          </div>
        </div>
      </div>

      <BioscopeGameStatePanel gameState={currentGame ?? null} />
    </section>
  );
}
