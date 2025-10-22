import { useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { soundManager } from '../lib/soundManager';

interface BioscopeSoundOptions {
  enabled: boolean;
  timerWarningThreshold?: number; // Seconds when to start timer tick sound
}

export function useBioscopeSounds(options: BioscopeSoundOptions = { enabled: true }) {
  const settings = useAppSelector((s) => s.settings);
  const timerTickIntervalRef = useRef<number | null>(null);
  const lastTimerTickRef = useRef<number | null>(null);

  const { enabled, timerWarningThreshold = 10 } = options;

  // Play image reveal sound
  const playImageRevealSound = useCallback(() => {
    if (!enabled || !settings.sounds.soundsEnabled) {
      console.log('[BioscopeSounds] Image sound blocked - enabled:', enabled, 'soundsEnabled:', settings.sounds.soundsEnabled);
      return;
    }

    console.log('[BioscopeSounds] Playing image appear sound');
    soundManager.playSound('image-appear', settings.sounds.masterVolume / 100);
  }, [enabled, settings.sounds.soundsEnabled, settings.sounds.masterVolume]);

  // Play correct answer sound
  const playCorrectAnswerSound = useCallback(() => {
    if (!enabled || !settings.sounds.soundsEnabled) return;

    console.log('[BioscopeSounds] Playing correct answer sound');
    soundManager.playSound('coin', settings.sounds.masterVolume / 100);
  }, [enabled, settings.sounds.soundsEnabled, settings.sounds.masterVolume]);

  // Play wrong answer sound
  const playWrongAnswerSound = useCallback(() => {
    if (!enabled || !settings.sounds.soundsEnabled) return;

    console.log('[BioscopeSounds] Playing wrong answer sound');
    soundManager.playSound('coin_wrong', settings.sounds.masterVolume / 100);
  }, [enabled, settings.sounds.soundsEnabled, settings.sounds.masterVolume]);

  // Play answer reveal sound (when host reveals the answer)
  const playAnswerRevealSound = useCallback(() => {
    if (!enabled || !settings.sounds.soundsEnabled) {
      console.log('[BioscopeSounds] Answer reveal sound blocked - enabled:', enabled, 'soundsEnabled:', settings.sounds.soundsEnabled);
      return;
    }

    console.log('[BioscopeSounds] Playing answer reveal sound (buzzer)');
    soundManager.playSound('notification', settings.sounds.masterVolume / 100);
  }, [enabled, settings.sounds.soundsEnabled, settings.sounds.masterVolume]);

  // (removed duplicate stopTimerTick declaration)



  // Stop timer tick sounds
  const stopTimerTick = useCallback(() => {
    if (timerTickIntervalRef.current !== null) {
      window.clearInterval(timerTickIntervalRef.current);
      timerTickIntervalRef.current = null;
    }
    lastTimerTickRef.current = null;
  }, []);

  // Start timer tick sound for last N seconds
  const startTimerTick = useCallback((timeRemaining: number) => {
    if (!enabled || !settings.sounds.soundsEnabled || !settings.sounds.timerSoundEnabled) {
      console.log('[BioscopeSounds] Timer sound blocked - enabled:', enabled, 'soundsEnabled:', settings.sounds.soundsEnabled, 'timerEnabled:', settings.sounds.timerSoundEnabled);
      return;
    }

    // Only start timer sound at the warning threshold (e.g., 10s)
    if (timeRemaining === timerWarningThreshold && lastTimerTickRef.current === null) {
      soundManager.playSound('timer', (settings.sounds.masterVolume / 100) * 0.5);
      lastTimerTickRef.current = timeRemaining;
      console.log(`[BioscopeSounds] Timer sound started at ${timeRemaining}s`);
    }

    // Stop after 0th second and play buzzer
    if (timeRemaining < 1 && lastTimerTickRef.current !== null) {
      stopTimerTick();
      lastTimerTickRef.current = null;
      soundManager.playSound('buzzer', (settings.sounds.masterVolume / 100));
      console.log('[BioscopeSounds] Timer expired - buzzer sound played');
    }
  }, [enabled, settings.sounds.soundsEnabled, settings.sounds.timerSoundEnabled, settings.sounds.masterVolume, timerWarningThreshold, stopTimerTick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimerTick();
    };
  }, [stopTimerTick]);

  return {
    playImageRevealSound,
    playCorrectAnswerSound,
    playWrongAnswerSound,
    playAnswerRevealSound,
    startTimerTick,
    stopTimerTick,
  };
}
