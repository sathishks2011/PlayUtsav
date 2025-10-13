/**
 * SoundManager
 * 
 * Centralized audio playback utility for the quiz application.
 * Manages sound loading, playback, volume control, and performance detection.
 * 
 * Features:
 * - Master volume control
 * - Individual sound type toggles
 * - Performance detection (auto-disable on slow devices)
 * - Preloading for smooth playback
 * - Multiple sound types: coin, buzzer, background music, notifications
 * 
 * Usage:
 * ```ts
 * const soundManager = SoundManager.getInstance();
 * soundManager.initialize(settingsState);
 * soundManager.playSound('coin', 0.8);
 * soundManager.setMasterVolume(0.5);
 * ```
 */

export type SoundType = 'coin' | 'buzzer' | 'background' | 'notification';

interface SoundSettings {
  masterVolume: number; // 0-100
  soundsEnabled: boolean;
  coinSoundEnabled: boolean;
  buzzerSoundEnabled: boolean;
  backgroundMusicEnabled: boolean;
  notificationsEnabled: boolean;
  coinSoundPath: string;
  buzzerSoundPath: string;
  backgroundMusicPath: string;
  notificationSoundPath: string;
}

interface SoundCache {
  audio: HTMLAudioElement;
  enabled: boolean;
}

export class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<SoundType, SoundCache> = new Map();
  private settings: SoundSettings | null = null;
  private isLowPerformanceDevice: boolean = false;
  private backgroundMusic: HTMLAudioElement | null = null;
  private isBackgroundPlaying: boolean = false;

  private constructor() {
    this.detectPerformance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Initialize sound manager with settings from Redux store
   */
  initialize(settings: SoundSettings): void {
    this.settings = settings;
    this.loadSounds();
  }

  /**
   * Update settings (call when Redux settings change)
   */
  updateSettings(settings: Partial<SoundSettings>): void {
    if (!this.settings) return;
    this.settings = { ...this.settings, ...settings };
    
    // Update sound paths if changed
    if (settings.coinSoundPath) this.loadSound('coin', settings.coinSoundPath);
    if (settings.buzzerSoundPath) this.loadSound('buzzer', settings.buzzerSoundPath);
    if (settings.backgroundMusicPath) this.loadSound('background', settings.backgroundMusicPath);
    if (settings.notificationSoundPath) this.loadSound('notification', settings.notificationSoundPath);
    
    // Update enabled states
    this.updateSoundState('coin', settings.coinSoundEnabled);
    this.updateSoundState('buzzer', settings.buzzerSoundEnabled);
    this.updateSoundState('background', settings.backgroundMusicEnabled);
    this.updateSoundState('notification', settings.notificationsEnabled);
  }

  /**
   * Play a sound effect
   */
  playSound(type: SoundType, volumeOverride?: number): void {
    console.log(`[SoundManager] playSound called for "${type}"`, {
      settings: this.settings,
      soundsEnabled: this.settings?.soundsEnabled,
      isLowPerf: this.isLowPerformanceDevice,
      soundCache: this.sounds.get(type),
    });
    
    if (!this.settings || !this.settings.soundsEnabled) {
      console.warn(`[SoundManager] Sound "${type}" blocked: settings not ready or sounds disabled`);
      return;
    }
    if (this.isLowPerformanceDevice) {
      console.warn(`[SoundManager] Sound "${type}" blocked: low performance device`);
      return; // Skip sounds on low-perf devices
    }

    const soundCache = this.sounds.get(type);
    if (!soundCache || !soundCache.enabled) {
      console.warn(`[SoundManager] Sound "${type}" blocked: cache not found or disabled`, {
        hasCache: !!soundCache,
        enabled: soundCache?.enabled,
      });
      return;
    }

    const audio = soundCache.audio;
    const volume = volumeOverride ?? this.settings.masterVolume / 100;
    
    console.log(`[SoundManager] Playing sound "${type}" at volume ${volume}`);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0; // Reset to start
    
    // Play and handle errors gracefully
    audio.play()
      .then(() => {
        console.log(`[SoundManager] Sound "${type}" played successfully`);
      })
      .catch((error) => {
        console.error(`[SoundManager] Failed to play sound "${type}":`, error);
      });
  }

  /**
   * Start background music (looped)
   */
  startBackgroundMusic(): void {
    if (!this.settings?.backgroundMusicEnabled || !this.settings.soundsEnabled) return;
    if (this.isLowPerformanceDevice) return;
    if (this.isBackgroundPlaying) return;

    const soundCache = this.sounds.get('background');
    if (!soundCache || !soundCache.enabled) return;

    this.backgroundMusic = soundCache.audio;
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = this.settings.masterVolume / 100;
    
    this.backgroundMusic.play().catch((error) => {
      console.warn('Failed to start background music:', error);
    });
    
    this.isBackgroundPlaying = true;
  }

  /**
   * Stop background music
   */
  stopBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.isBackgroundPlaying = false;
    }
  }

  /**
   * Set master volume (0-100)
   */
  setMasterVolume(volume: number): void {
    if (!this.settings) return;
    
    this.settings.masterVolume = Math.max(0, Math.min(100, volume));
    
    // Update background music volume if playing
    if (this.backgroundMusic && this.isBackgroundPlaying) {
      this.backgroundMusic.volume = this.settings.masterVolume / 100;
    }
  }

  /**
   * Detect device performance and auto-disable sounds if needed
   */
  private detectPerformance(): boolean {
    try {
      // Check if device reports low memory
      const memoryInfo = (performance as any).memory;
      if (memoryInfo && memoryInfo.jsHeapSizeLimit < 500 * 1024 * 1024) {
        this.isLowPerformanceDevice = true;
        return true;
      }

      // Check hardware concurrency (CPU cores)
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        this.isLowPerformanceDevice = true;
        return true;
      }

      // Check device pixel ratio (high DPR on low-end devices can strain performance)
      if (window.devicePixelRatio > 2) {
        this.isLowPerformanceDevice = true;
        return true;
      }

      this.isLowPerformanceDevice = false;
      return false;
    } catch (error) {
      console.warn('Performance detection failed:', error);
      this.isLowPerformanceDevice = false;
      return false;
    }
  }

  /**
   * Get whether device is low performance
   */
  isLowPerformance(): boolean {
    return this.isLowPerformanceDevice;
  }

  /**
   * Load all sounds based on current settings
   */
  private loadSounds(): void {
    if (!this.settings) return;

    this.loadSound('coin', this.settings.coinSoundPath);
    this.loadSound('buzzer', this.settings.buzzerSoundPath);
    this.loadSound('background', this.settings.backgroundMusicPath);
    this.loadSound('notification', this.settings.notificationSoundPath);
  }

  /**
   * Load a single sound file
   */
  private loadSound(type: SoundType, path: string): void {
    if (!path) {
      console.warn(`No path provided for sound type "${type}"`);
      return;
    }

    const audio = new Audio(path);
    audio.preload = 'auto';
    
    const enabled = this.getSoundEnabledState(type);
    
    this.sounds.set(type, {
      audio,
      enabled,
    });
  }

  /**
   * Get enabled state for a sound type from settings
   */
  private getSoundEnabledState(type: SoundType): boolean {
    if (!this.settings) return false;
    
    switch (type) {
      case 'coin':
        return this.settings.coinSoundEnabled;
      case 'buzzer':
        return this.settings.buzzerSoundEnabled;
      case 'background':
        return this.settings.backgroundMusicEnabled;
      case 'notification':
        return this.settings.notificationsEnabled;
      default:
        return false;
    }
  }

  /**
   * Update enabled state for a sound type
   */
  private updateSoundState(type: SoundType, enabled?: boolean): void {
    if (enabled === undefined) return;
    
    const soundCache = this.sounds.get(type);
    if (soundCache) {
      soundCache.enabled = enabled;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopBackgroundMusic();
    this.sounds.clear();
    this.settings = null;
  }
}

// Export singleton instance
export const soundManager = SoundManager.getInstance();
