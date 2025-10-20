import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useWebSocket } from '../contexts/WebSocketContext';
import { setSnapshot, setActiveGameIndex } from '../store/slices/sessionSlice';
import { soundManager } from '../lib/soundManager';
import { transformSession } from '@pkg/core';
import type { ScoreAnimationEvent } from '@pkg/core';

export function useSessionSync() {
  const sessionId = useAppSelector((s) => s.session.current?.id);
  const currentActiveGameIndex = useAppSelector((s) => s.session.current?.activeGameIndex);
  const role = useAppSelector((s) => s.session.role);
  const soundSettings = useAppSelector((s) => s.settings.sounds);
  const dispatch = useAppDispatch();
  const { socket, isConnected } = useWebSocket();
  const [scoreAnimation, setScoreAnimation] = useState<ScoreAnimationEvent | null>(null);

  useEffect(() => {
    if (!sessionId || !socket || !isConnected) {
      console.log('[useSessionSync] Waiting for socket connection...');
      return;
    }

    console.log('[useSessionSync] Setting up session sync for:', sessionId);

    // Subscribe to session updates
    socket.subscribe(sessionId, (snapshot) => {
      if (snapshot) {
        // Preserve the client's current activeGameIndex to avoid snapshots from overriding
        // (this prevents the backend's default index from resetting the client's index)
        const preserveIndex = typeof currentActiveGameIndex === 'number' ? currentActiveGameIndex : undefined;
        console.log('[useSessionSync] Received session update, preserving activeGameIndex:', preserveIndex);

        const transformedSession = transformSession(snapshot, preserveIndex);
        dispatch(setSnapshot(transformedSession));
      }
    });

    // Listen for score animation events
    const handleScoreAnimation = (...args: unknown[]) => {
      const event = args[0] as ScoreAnimationEvent;
      console.log('[useSessionSync] Score animation event:', event);
      
      // Only show animation for positive points (correct answers)
      // Wrong answers (0 points) should not show animation
      if (event.points > 0) {
        setScoreAnimation(event);
        // Clear animation after 3 seconds
        setTimeout(() => setScoreAnimation(null), 3000);
      }
      
      // Play appropriate sound based on points:
      // - 0 points = wrong answer (coin_wrong)
      // - positive points = correct answer (coin)
      // - negative points = penalty (coin_wrong)
      if (soundSettings.soundsEnabled && soundSettings.coinSoundEnabled) {
        const soundType = event.points > 0 ? 'coin' : 'coin_wrong';
        console.log(`[useSessionSync] Triggering ${soundType} sound for ${event.points} points`);
        soundManager.playSound(soundType, soundSettings.masterVolume / 100);
      }
    };

    socket.on('score:animated', handleScoreAnimation);

    // Listen for game-started events that include active game info
    const handleGameStarted = (...args: unknown[]) => {
      const event = args[0] as { sessionId: string; gameType?: string; activeGameIndex?: number };
      console.log('[useSessionSync] Game started event:', event);
      // If the event includes activeGameIndex, update it for players
      if (role === 'PLAYER' && event.activeGameIndex !== undefined) {
        console.log('[useSessionSync] Player switching to active game:', event.activeGameIndex);
        dispatch(setActiveGameIndex(event.activeGameIndex));
      }
    };

    socket.on('session:game-started', handleGameStarted);

    // Listen for bioscope:game-started events (for bioscope game activation)
    const handleBioscopeGameStarted = (...args: unknown[]) => {
      const event = args[0] as { sessionId: string; activeGameIndex?: number };
      console.log('[useSessionSync] Bioscope game started event:', event);
      if (role === 'PLAYER' && event.activeGameIndex !== undefined) {
        console.log('[useSessionSync] Player switching to bioscope game:', event.activeGameIndex);
        dispatch(setActiveGameIndex(event.activeGameIndex));
      }
    };

    socket.on('bioscope:game-started', handleBioscopeGameStarted);

    // Cleanup
    return () => {
      console.log('[useSessionSync] Cleaning up session sync');
      socket.unsubscribe(sessionId);
      socket.off('score:animated', handleScoreAnimation);
      socket.off('session:game-started', handleGameStarted);
      socket.off('bioscope:game-started', handleBioscopeGameStarted);
    };
  }, [dispatch, sessionId, socket, isConnected, soundSettings, role, currentActiveGameIndex]);

  return { scoreAnimation };
}
