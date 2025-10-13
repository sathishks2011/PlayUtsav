import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getSessionSocket } from '../lib/socket';
import { setSnapshot } from '../store/slices/sessionSlice';
import { soundManager } from '../lib/soundManager';
import type { ScoreAnimationEvent } from '@pkg/core';

export function useSessionSync() {
  const sessionId = useAppSelector((s) => s.session.current?.id);
  const soundSettings = useAppSelector((s) => s.settings.sounds);
  const dispatch = useAppDispatch();
  const [scoreAnimation, setScoreAnimation] = useState<ScoreAnimationEvent | null>(null);

  useEffect(() => {
    let mounted = true;
    let activeSessionId = sessionId;
    let socketRef: Awaited<ReturnType<typeof getSessionSocket>> | null = null;

    if (!sessionId) return () => {};

    getSessionSocket()
      .then((socket) => {
        if (!mounted) return;
        socketRef = socket;
        
        // Subscribe to session updates
        socket.subscribe(sessionId, (snapshot) => {
          if (snapshot) {
            dispatch(setSnapshot(snapshot));
          }
        });

        // Listen for score animation events
        const handleScoreAnimation = (...args: unknown[]) => {
          const event = args[0] as ScoreAnimationEvent;
          console.log('[useSessionSync] Score animation event:', event);
          console.log('[useSessionSync] Sound settings:', {
            soundsEnabled: soundSettings.soundsEnabled,
            coinSoundEnabled: soundSettings.coinSoundEnabled,
            masterVolume: soundSettings.masterVolume,
          });
          setScoreAnimation(event);
          
          // Play coin sound when score animation triggers
          if (soundSettings.soundsEnabled && soundSettings.coinSoundEnabled) {
            console.log('[useSessionSync] Triggering coin sound...');
            soundManager.playSound('coin', soundSettings.masterVolume / 100);
          } else {
            console.warn('[useSessionSync] Coin sound blocked by settings');
          }
          
          // Clear animation after 3 seconds
          setTimeout(() => setScoreAnimation(null), 3000);
        };

        socket.on('score:animated', handleScoreAnimation);
      })
      .catch((err) => {
        console.error('Session socket connection failed', err);
      });

    return () => {
      mounted = false;
      if (socketRef && activeSessionId) {
        socketRef.unsubscribe(activeSessionId);
        socketRef.off('score:animated');
      }
    };
  }, [dispatch, sessionId, soundSettings]);

  return { scoreAnimation };
}

