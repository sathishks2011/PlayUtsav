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

export type SoundType = 'coin' | 'coin_wrong' | 'buzzer' | 'background' | 'notification';

interface SoundSettings {
  masterVolume: number; // 0-100
  soundsEnabled: boolean;
  coinSoundEnabled: boolean;
  coinWrongSoundEnabled: boolean;
  buzzerSoundEnabled: boolean;
  backgroundMusicEnabled: boolean;
  notificationsEnabled: boolean;
  coinSoundPath: string;
  coinWrongSoundPath: string;
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
  private audioUnlocked: boolean = false;

  private constructor() {
    this.detectPerformance();
    this.setupAudioUnlock();
  }

  /**
   * Setup audio unlock for mobile devices
   * Mobile browsers require user interaction before audio can play
   */
  private setupAudioUnlock(): void {
    const unlockAudio = () => {
      if (this.audioUnlocked) return;

      console.log('[SoundManager] Attempting to unlock audio...');
      
      // Create a silent audio to unlock using Web Audio API
      // This is more reliable than using Audio elements
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        
        // Create a silent buffer
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        
        console.log('[SoundManager] Audio unlocked successfully via AudioContext');
        this.audioUnlocked = true;
        
        // Close the context after a short delay
        setTimeout(() => {
          audioContext.close();
        }, 100);
        
        // Remove listeners
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('touchend', unlockAudio);
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      } catch (error) {
        console.warn('[SoundManager] AudioContext unlock failed, trying Audio element fallback:', error);
        
        // Fallback to Audio element with a very short silent sound
        const silentAudio = new Audio();
        // Use a minimal WAV file data URI instead of MP3
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        
        const playPromise = silentAudio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('[SoundManager] Audio unlocked successfully via Audio element');
              this.audioUnlocked = true;
              silentAudio.pause();
              silentAudio.currentTime = 0;
              
              // Remove listeners
              document.removeEventListener('touchstart', unlockAudio);
              document.removeEventListener('touchend', unlockAudio);
              document.removeEventListener('click', unlockAudio);
              document.removeEventListener('keydown', unlockAudio);
            })
            .catch((error) => {
              console.error('[SoundManager] Audio unlock failed:', error);
            });
        }
      }
    };

    // Try to unlock on various user interactions
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('touchend', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
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
    if (settings.coinWrongSoundPath) this.loadSound('coin_wrong', settings.coinWrongSoundPath);
    if (settings.buzzerSoundPath) this.loadSound('buzzer', settings.buzzerSoundPath);
    if (settings.backgroundMusicPath) this.loadSound('background', settings.backgroundMusicPath);
    if (settings.notificationSoundPath) this.loadSound('notification', settings.notificationSoundPath);
    
    // Update enabled states
    this.updateSoundState('coin', settings.coinSoundEnabled);
    this.updateSoundState('coin_wrong', settings.coinWrongSoundEnabled);
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
      audioUnlocked: this.audioUnlocked,
      soundCache: this.sounds.get(type),
    });
    
    if (!this.audioUnlocked) {
      console.warn(`[SoundManager] Sound "${type}" blocked: audio not unlocked yet (waiting for user interaction)`);
      return;
    }
    
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
      // Check if device reports very low memory (less than 300MB)
      const memoryInfo = (performance as any).memory;
      if (memoryInfo && memoryInfo.jsHeapSizeLimit < 300 * 1024 * 1024) {
        console.log('[SoundManager] Low performance detected: low memory');
        this.isLowPerformanceDevice = true;
        return true;
      }

      // Only flag as low performance if very few cores (< 2)
      // Modern phones have 4-8 cores, so this is very conservative
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) {
        console.log('[SoundManager] Low performance detected: low CPU cores');
        this.isLowPerformanceDevice = true;
        return true;
      }

      // Removed devicePixelRatio check - high DPR is normal for modern phones
      // and doesn't indicate low performance

      console.log('[SoundManager] Device performance: OK');
      this.isLowPerformanceDevice = false;
      return false;
    } catch (error) {
      console.warn('[SoundManager] Performance detection failed:', error);
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
    this.loadSound('coin_wrong', this.settings.coinWrongSoundPath);
    this.loadSound('buzzer', this.settings.buzzerSoundPath);
    this.loadSound('background', this.settings.backgroundMusicPath);
    this.loadSound('notification', this.settings.notificationSoundPath);
  }

  /**
   * Load a single sound file
   */
  private loadSound(type: SoundType, path: string): void {
    if (!path) {
      console.warn(`[SoundManager] No path provided for sound type "${type}"`);
      return;
    }

    console.log(`[SoundManager] Loading sound "${type}" from path: ${path}`);
    
    const audio = new Audio(path);
    audio.preload = 'auto';
    
    // Add error handler to catch loading issues
    audio.addEventListener('error', (e) => {
      console.error(`[SoundManager] Failed to load sound "${type}" from ${path}:`, {
        error: e,
        networkState: audio.networkState,
        readyState: audio.readyState,
        errorCode: audio.error?.code,
        errorMessage: audio.error?.message,
      });
    });
    
    // Add success handler
    audio.addEventListener('canplaythrough', () => {
      console.log(`[SoundManager] Sound "${type}" loaded successfully and ready to play`);
    });
    
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
      case 'coin_wrong':
        return this.settings.coinWrongSoundEnabled;
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
