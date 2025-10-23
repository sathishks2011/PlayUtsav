import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from './ToastProvider';
import type { Team } from '@pkg/core';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  startBioscopeGame,
  revealBioscopeImage,
  revealBioscopeAnswer,
  awardManualScore,
  nextBioscopeRound,
  fetchBioscopeGameState,
  resetBioscopeGame,
  updateTimeRemaining,
  updateGameState,
  clearError,
} from '../store/slices/bioscopeSlice';
import { BioscopeImageRevealControl } from './BioscopeImageRevealControl';
import { BioscopeManualScoring } from './BioscopeManualScoring';
import { BioscopeTimer } from './BioscopeTimer';
import { BioscopeGameStatePanel } from './BioscopeGameState';
import { HostBioscopeBuzzerControls } from './HostBioscopeBuzzerControls';
import { getBioscopeSocket, type BioscopeGameState } from '../lib/socket';
import { useBioscopeSounds } from '../hooks/useBioscopeSounds';
import { useBioscopeBuzzerSync } from '../hooks/useBioscopeBuzzerSync';

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
  const { currentGame, loading, error, lastAction } = useAppSelector((s) => s.bioscope);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const toast = useToast();

  const sessionId = session?.id;
  const hostId = session?.hostId ?? user?.id ?? undefined;
  
  // Get the active game from the games array
  const activeGame = session?.games?.[session.activeGameIndex];
  const isBioscopeGame = activeGame?.type === 'bioscope';
  const bioscopeSession = isBioscopeGame ? activeGame.state : (session as any)?.bioscopeSession;
  const bioscopeTemplateId = isBioscopeGame ? activeGame.templateId : bioscopeSession?.templateId;

  console.log('[HostBioscopePanel] Debug:', {
    hasGames: Boolean(session?.games),
    gamesCount: session?.games?.length,
    activeGameIndex: session?.activeGameIndex,
    activeGame,
    isBioscopeGame,
    bioscopeSession,
    bioscopeTemplateId,
    bioscopeSessionStatus: bioscopeSession?.status
  });

  // Initialize sound system with safe access
  const timerSoundEnabled = currentGame?.template?.configuration?.timer_sound_enabled ?? true;
  const bioscopeSounds = useBioscopeSounds({
    enabled: timerSoundEnabled,
    timerWarningThreshold: 10,
  });

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      console.log('[HostBioscopePanel] Attempting to unlock audio on user interaction');
      // Try playing a silent sound to unlock audio context
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audio.volume = 0;
      audio.play().catch(() => {
        console.log('[HostBioscopePanel] Audio unlock attempt (silent sound)');
      });
    };

    // Listen for first click anywhere in the document
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Sync buzzer state via WebSocket
  // Temporarily disabled to fix blank screen issue
  // useBioscopeBuzzerSync(sessionId || '');

  // Store sound functions in a ref to avoid re-subscribing to WebSocket
  const soundFunctionsRef = React.useRef(bioscopeSounds);
  soundFunctionsRef.current = bioscopeSounds;

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  // Auto-load game state only if bioscope game has been started
  useEffect(() => {
    if (!sessionId || !bioscopeSession) {
      console.log('[HostBioscopePanel] No bioscope template attached');
      return;
    }

    // Only fetch if game has been started (status is not 'idle')
    if (bioscopeSession.status !== 'idle') {
      console.log('[HostBioscopePanel] Bioscope game in progress, loading state...');
      dispatch(fetchBioscopeGameState({ sessionId }))
        .unwrap()
        .catch((err) => {
          console.error('[HostBioscopePanel] Error loading game state:', err);
          // Error will be shown in UI
        });
    } else {
      console.log('[HostBioscopePanel] Bioscope template attached, ready to start');
    }
  }, [dispatch, sessionId, bioscopeSession]);

  // Play sounds when game state changes (image revealed or answer revealed)
  const prevRevealedCountRef = React.useRef<number>(0);
  const prevStatusRef = React.useRef<string>('');

  useEffect(() => {
    if (!currentGame) return;

    const revealedCount = currentGame.revealedImages.length;
    const status = currentGame.status;

    // Play image reveal sound when a new image is revealed
    if (revealedCount > prevRevealedCountRef.current && prevRevealedCountRef.current > 0) {
      soundFunctionsRef.current.playImageRevealSound();
    }

    // Play correct answer sound (coin.mp3) when status changes to 'revealed'
    if (status === 'revealed' && prevStatusRef.current !== 'revealed' && prevStatusRef.current !== '') {
      soundFunctionsRef.current.playCorrectAnswerSound();
    }

    prevRevealedCountRef.current = revealedCount;
    prevStatusRef.current = status;
  }, [currentGame?.revealedImages.length, currentGame?.status]);

  // Subscribe to bioscope WebSocket events
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let mounted = true;

    getBioscopeSocket().then((socket) => {
      if (!mounted) {
        return;
      }

      console.log('[HostBioscopePanel] Subscribing to bioscope session:', sessionId);
      socket.subscribe(sessionId);

      // Handle game state updates - backend sends full state, no need to fetch
      const handleGameStateUpdate = (...args: unknown[]) => {
        const data = args[0] as BioscopeGameState;
        console.log('[HostBioscopePanel] Received bioscope:game-state-update', data);
        if (data.sessionId === sessionId) {
          // Update Redux state directly with the received data
          dispatch(updateGameState(data));
        }
      };

      // Handle image reveals
      const handleImageRevealed = (...args: unknown[]) => {
        const data = args[0] as { sessionId: string; imageId: number };
        console.log('[HostBioscopePanel] Image revealed:', data);
        // State update will come via STATE_UPDATED event, no need to fetch
      };

      // Handle answer reveals
      const handleAnswerRevealed = (...args: unknown[]) => {
        const data = args[0] as { sessionId: string };
        console.log('[HostBioscopePanel] Answer revealed:', data);
        // State update will come via STATE_UPDATED event, no need to fetch
      };

      // Handle round changes
      const handleRoundChanged = (...args: unknown[]) => {
        const data = args[0] as { sessionId: string; roundId: number };
        console.log('[HostBioscopePanel] Round changed:', data);
        // State update will come via STATE_UPDATED event, no need to fetch
      };

      // Handle game completion
      const handleGameCompleted = (...args: unknown[]) => {
        const data = args[0] as { sessionId: string };
        console.log('[HostBioscopePanel] Game completed:', data);
        // State update will come via STATE_UPDATED event, no need to fetch
      };

      socket.on('bioscope:state-updated', handleGameStateUpdate);
      socket.on('bioscope:image-revealed', handleImageRevealed);
      socket.on('bioscope:answer-revealed', handleAnswerRevealed);
      socket.on('bioscope:round-complete', handleRoundChanged);
      socket.on('bioscope:game-completed', handleGameCompleted);

      return () => {
        console.log('[HostBioscopePanel] Unsubscribing from bioscope session');
        socket.off('bioscope:state-updated', handleGameStateUpdate);
        socket.off('bioscope:image-revealed', handleImageRevealed);
        socket.off('bioscope:answer-revealed', handleAnswerRevealed);
        socket.off('bioscope:round-complete', handleRoundChanged);
        socket.off('bioscope:game-completed', handleGameCompleted);
        socket.unsubscribe(sessionId);
      };
    });

    return () => {
      mounted = false;
    };
  }, [dispatch, sessionId]);

  // Timer effect - update time remaining and play tick sounds
  useEffect(() => {
    if (!currentGame || !currentGame.timerStartedAt || currentGame.status !== 'answering') {
      soundFunctionsRef.current.stopTimerTick();
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
      
      // Play timer tick sound for last 10 seconds
      soundFunctionsRef.current.startTimerTick(remaining);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(interval);
      soundFunctionsRef.current.stopTimerTick();
    };
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

  const allowManualScoring = currentGame?.template?.configuration?.allow_manual_scoring ?? true;

  const isRevealing = loading && lastAction === 'reveal-image';
  const revealDisabled = !currentGame || loading || currentGame.status === 'completed';
  const canRevealAnswer = Boolean(
    currentGame &&
      currentGame.revealedImages.length > 0 &&
      currentGame.status !== 'revealed' &&
      currentGame.status !== 'completed' &&
      !loading
  );
  const canAdvanceRound = Boolean(currentGame && currentGame.status === 'revealed');

  const duration = currentGame?.timerDuration ?? 30;
  const timeRemaining = currentGame?.timeRemaining ?? null;
  const isTimerActive = Boolean(currentGame && currentGame.status === 'answering');

  const clearMessages = useCallback(() => {
    setFeedback(null);
    setLocalError(null);
  }, []);

  const handleStartGame = useCallback(async () => {
    console.log('[HostBioscopePanel] Start button clicked');
    console.log('[HostBioscopePanel] sessionId:', sessionId);
    console.log('[HostBioscopePanel] bioscopeSession:', bioscopeSession);
    console.log('[HostBioscopePanel] bioscopeTemplateId:', bioscopeTemplateId);
    
    if (!sessionId || !bioscopeTemplateId) {
      const errorMsg = 'No bioscope template attached to this session';
      console.error('[HostBioscopePanel]', errorMsg);
      setLocalError(errorMsg);
      return;
    }

    clearMessages();
    try {
      console.log('[HostBioscopePanel] Dispatching startBioscopeGame...');
      const result = await dispatch(startBioscopeGame({ sessionId, templateId: bioscopeTemplateId })).unwrap();
      console.log('[HostBioscopePanel] Game started successfully:', result);
      setFeedback('Bioscope game started!');

      // Find bioscope game index
      const bioscopeGameIndex = session?.games?.findIndex(g => g.type === 'bioscope');
      if (bioscopeGameIndex !== undefined && bioscopeGameIndex !== -1) {
        dispatch({ type: 'session/setActiveGameIndex', payload: bioscopeGameIndex });
        console.log('[HostBioscopePanel] Set activeGameIndex to bioscope:', bioscopeGameIndex);
      } else {
        console.warn('[HostBioscopePanel] Could not find bioscope game index!');
      }

      // Emit game-started event with activeGameIndex for players to sync
      const activeGameIndex = bioscopeGameIndex;
      const activeGameType = session?.games?.[activeGameIndex]?.type;
      console.log('[HostBioscopePanel] Preparing to emit game-started:', {
        sessionId,
        activeGameIndex,
        activeGameType,
        games: session?.games?.map(g => g.type)
      });
      import('../lib/socket').then(({ getSessionSocket }) => {
        getSessionSocket().then((socket: any) => {
          socket.socket?.emit('session:game-started', {
            sessionId,
            gameType: 'bioscope',
            activeGameIndex
          });
          console.log('[HostBioscopePanel] Emitted game-started event with activeGameIndex:', activeGameIndex, 'type:', activeGameType);
        });
      });
    } catch (err) {
      console.error('[HostBioscopePanel] Error starting game:', err);
      setLocalError(getErrorMessage(err));
    }
  }, [dispatch, sessionId, bioscopeTemplateId, clearMessages, session]);

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

  const handleResetGame = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    // Non-blocking reset: perform reset and show toast feedback

    clearMessages();
    try {
      await dispatch(resetBioscopeGame({ sessionId })).unwrap();
      setFeedback('Game reset successfully');
      
      // Emit game-reset event to notify players
      import('../lib/socket').then(({ getSessionSocket }) => {
        getSessionSocket().then((socket: any) => {
          socket.socket?.emit('session:game-reset', {
            sessionId,
            gameType: 'bioscope'
          });
          console.log('[HostBioscopePanel] Emitted game-reset event');
        });
      });
      toast.showToast({ message: 'Bioscope game reset', type: 'success', duration: 3500 });
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

  // Check if we have a valid session
  if (!session || !sessionId) {
    return (
      <section className="space-y-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 text-center">
          <p className="text-gray-400">No active session found.</p>
        </div>
      </section>
    );
  }

  // Debug button state logic
  console.log('[HostBioscopePanel] Button State Debug:');
  console.log('  - bioscopeTemplateId:', bioscopeTemplateId);
  console.log('  - sessionId:', sessionId);
  console.log('  - loading:', loading);
  console.log('  - bioscopeSession?.status:', bioscopeSession?.status);

  // Check if we have a bioscope template attached and can start the game
  const hasBioscopeTemplate = Boolean(bioscopeTemplateId);
  // Check if game is actually started (not idle) rather than just if currentGame exists
  const isGameStarted = bioscopeSession?.status && bioscopeSession.status !== 'idle';
  const isStartDisabled = !hasBioscopeTemplate || !sessionId || loading || isGameStarted;

  console.log('  - hasBioscopeTemplate:', hasBioscopeTemplate);
  console.log('  - isGameStarted:', isGameStarted);
  console.log('  - isStartDisabled:', isStartDisabled);
  console.log('  - Reasons disabled:', {
    noTemplate: !hasBioscopeTemplate,
    noSessionId: !sessionId,
    loading: loading,
    gameStarted: isGameStarted
  });

  // Show warning if no template is attached
  if (!hasBioscopeTemplate) {
    return (
      <section className="space-y-6">
        <div className="rounded-xl border border-yellow-800 bg-yellow-900/20 p-5 text-center">
          <h3 className="text-lg font-semibold text-yellow-200 mb-2">No Bioscope Template Attached</h3>
          <p className="text-sm text-yellow-300">
            Please select a Bioscope template when creating the session from the Dashboard.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="space-y-2">
        <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Bioscope Host Controls</h2>
            <p className="text-xs text-gray-400">
              Reveal images, award points, and keep the game flowing.
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
            onClick={handleResetGame}
            disabled={!sessionId || !bioscopeSession}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              sessionId && bioscopeSession
                ? 'border border-orange-500/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20'
                : 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
            }`}
          >
            Reset Game
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

      <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2">
          <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-2 space-y-2">
            <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Live Round Overview</h3>
                <p className="text-xs text-gray-400">
                  Keep an eye on the timer and revealed images to pace the round.
                </p>
              </div>
              <div className="text-xs text-gray-400">
                {currentGame?.template?.currentRound?.title ?? 'No round active'}
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

        <div className="space-y-2">
          {/* Temporarily disabled buzzer controls to fix blank screen issue */}
          {/* {sessionId && bioscopeSession?.playerEngagementType === 'BUZZER' && (
            <HostBioscopeBuzzerControls sessionId={sessionId} />
          )} */}

          {allowManualScoring && (
            <BioscopeManualScoring
              teams={teams}
              participants={participantsForScoring}
              onAwardPoints={handleManualScore}
            />
          )}

          <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-2 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Round Controls</h3>
              {currentGame?.template?.currentRound && (
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
