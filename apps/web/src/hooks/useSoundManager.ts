import { useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { soundManager } from '../lib/soundManager';

/**
 * useSoundManager Hook
 * 
 * Initializes and synchronizes the SoundManager with Redux settings.
 * Call this hook once at the app root level (e.g., in App.tsx or main.tsx).
 * 
 * Features:
 * - Auto-initializes SoundManager on mount
 * - Syncs volume and enabled states when settings change
 * - Handles background music play/stop
 * - Cleans up on unmount
 * 
 * Usage:
 * ```tsx
 * function App() {
 *   useSoundManager();
 *   return <YourApp />;
 * }
 * ```
 */
export function useSoundManager() {
  const soundSettings = useAppSelector((state) => state.settings.sounds);
  const animationSettings = useAppSelector((state) => state.settings.animations);

  // Initialize sound manager on mount
  useEffect(() => {
    soundManager.initialize({
      ...soundSettings,
      notificationsEnabled: soundSettings.notificationSoundsEnabled,
    });

    return () => {
      soundManager.dispose();
    };
  }, []); // Run only once on mount

  // Sync settings when they change
  useEffect(() => {
    soundManager.updateSettings({
      ...soundSettings,
      notificationsEnabled: soundSettings.notificationSoundsEnabled,
    });
  }, [soundSettings]);

  // Handle background music play/stop based on enabled state
  useEffect(() => {
    if (soundSettings.backgroundMusicEnabled && soundSettings.soundsEnabled) {
      soundManager.startBackgroundMusic();
    } else {
      soundManager.stopBackgroundMusic();
    }
  }, [soundSettings.backgroundMusicEnabled, soundSettings.soundsEnabled]);

  // Auto-detect performance and disable animations if needed
  useEffect(() => {
    if (animationSettings.autoDetectPerformance && soundManager.isLowPerformance()) {
      // You can dispatch an action here to update Redux state
      console.info('Low performance device detected - sounds may be disabled');
    }
  }, [animationSettings.autoDetectPerformance]);
}
