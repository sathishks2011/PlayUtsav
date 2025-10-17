import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useWebSocket } from '../contexts/WebSocketContext';
import { setSnapshot } from '../store/slices/sessionSlice';
import { soundManager } from '../lib/soundManager';
import type { ScoreAnimationEvent } from '@pkg/core';

export function useSessionSync() {
  const sessionId = useAppSelector((s) => s.session.current?.id);
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
        console.log('[useSessionSync] Received session update');
        dispatch(setSnapshot(snapshot));
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

    // Cleanup
    return () => {
      console.log('[useSessionSync] Cleaning up session sync');
      socket.unsubscribe(sessionId);
      socket.off('score:animated', handleScoreAnimation);
    };
  }, [dispatch, sessionId, socket, isConnected, soundSettings]);

  return { scoreAnimation };
}

