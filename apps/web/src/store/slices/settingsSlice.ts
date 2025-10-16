import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SoundSettings = {
  masterVolume: number; // 0-100
  soundsEnabled: boolean; // Master toggle
  coinSoundEnabled: boolean;
  coinSoundPath: string;
  coinWrongSoundEnabled: boolean;
  coinWrongSoundPath: string;
  buzzerSoundEnabled: boolean;
  buzzerSoundPath: string;
  backgroundMusicEnabled: boolean;
  backgroundMusicPath: string;
  notificationSoundsEnabled: boolean;
  notificationSoundPath: string;
  explanationAudioPath: string | null;
};

export type AnimationSettings = {
  animationsEnabled: boolean; // Master toggle
  reduceMotion: boolean; // Manual override
  autoDetectPerformance: boolean; // Auto-disable on slow devices
};

export type RevealSettings = {
  autoRevealEnabled: boolean; // Global default
  autoRevealTimeout: number; // Seconds to wait after all players answer
};

export type SettingsState = {
  // Quiz settings
  timerSeconds: number;
  buzzerEnabled: boolean;
  explainAudioUrl: string | null;
  
  // Sound settings
  sounds: SoundSettings;
  
  // Animation settings
  animations: AnimationSettings;
  
  // Reveal settings
  reveal: RevealSettings;
};

const initialState: SettingsState = {
  timerSeconds: 30,
  buzzerEnabled: true,
  explainAudioUrl: null,
  
  sounds: {
    masterVolume: 70,
    soundsEnabled: true,
    coinSoundEnabled: true,
    coinSoundPath: '/sounds/coin.mp3',
    coinWrongSoundEnabled: true,
    coinWrongSoundPath: '/sounds/coin_wrong.mp3',
    buzzerSoundEnabled: true,
    buzzerSoundPath: '/sounds/buzzer.mp3',
    backgroundMusicEnabled: false,
    backgroundMusicPath: '/sounds/background.mp3',
    notificationSoundsEnabled: true,
    notificationSoundPath: '/sounds/notification.mp3',
    explanationAudioPath: null,
  },
  
  animations: {
    animationsEnabled: true,
    reduceMotion: false,
    autoDetectPerformance: true,
  },
  
  reveal: {
    autoRevealEnabled: false,
    autoRevealTimeout: 5,
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Quiz settings
    setTimerSeconds(state, action: PayloadAction<number>) {
      state.timerSeconds = Math.max(5, Math.min(300, action.payload));
    },
    setBuzzerEnabled(state, action: PayloadAction<boolean>) {
      state.buzzerEnabled = action.payload;
    },
    setExplainAudioUrl(state, action: PayloadAction<string | null>) {
      state.explainAudioUrl = action.payload;
    },
    
    // Sound settings
    setMasterVolume(state, action: PayloadAction<number>) {
      state.sounds.masterVolume = Math.max(0, Math.min(100, action.payload));
    },
    setSoundsEnabled(state, action: PayloadAction<boolean>) {
      state.sounds.soundsEnabled = action.payload;
    },
    setCoinSoundEnabled(state, action: PayloadAction<boolean>) {
      state.sounds.coinSoundEnabled = action.payload;
    },
    setCoinSoundPath(state, action: PayloadAction<string>) {
      state.sounds.coinSoundPath = action.payload;
    },
    setCoinWrongSoundEnabled(state, action: PayloadAction<boolean>) {
      state.sounds.coinWrongSoundEnabled = action.payload;
    },
    setCoinWrongSoundPath(state, action: PayloadAction<string>) {
      state.sounds.coinWrongSoundPath = action.payload;
    },
    setBuzzerSoundEnabled(state, action: PayloadAction<boolean>) {
      state.sounds.buzzerSoundEnabled = action.payload;
    },
    setBuzzerSoundPath(state, action: PayloadAction<string>) {
      state.sounds.buzzerSoundPath = action.payload;
    },
    setBackgroundMusicEnabled(state, action: PayloadAction<boolean>) {
      state.sounds.backgroundMusicEnabled = action.payload;
    },
    setBackgroundMusicPath(state, action: PayloadAction<string>) {
      state.sounds.backgroundMusicPath = action.payload;
    },
    setNotificationSoundsEnabled(state, action: PayloadAction<boolean>) {
      state.sounds.notificationSoundsEnabled = action.payload;
    },
    setNotificationSoundPath(state, action: PayloadAction<string>) {
      state.sounds.notificationSoundPath = action.payload;
    },
    setExplanationAudioPath(state, action: PayloadAction<string | null>) {
      state.sounds.explanationAudioPath = action.payload;
    },
    
    // Animation settings
    setAnimationsEnabled(state, action: PayloadAction<boolean>) {
      state.animations.animationsEnabled = action.payload;
    },
    setReduceMotion(state, action: PayloadAction<boolean>) {
      state.animations.reduceMotion = action.payload;
    },
    setAutoDetectPerformance(state, action: PayloadAction<boolean>) {
      state.animations.autoDetectPerformance = action.payload;
    },
    
    // Reveal settings
    setAutoRevealEnabled(state, action: PayloadAction<boolean>) {
      state.reveal.autoRevealEnabled = action.payload;
    },
    setAutoRevealTimeout(state, action: PayloadAction<number>) {
      state.reveal.autoRevealTimeout = Math.max(3, Math.min(60, action.payload));
    },
  },
});

export const {
  setTimerSeconds,
  setBuzzerEnabled,
  setExplainAudioUrl,
  setMasterVolume,
  setSoundsEnabled,
  setCoinSoundEnabled,
  setCoinSoundPath,
  setCoinWrongSoundEnabled,
  setCoinWrongSoundPath,
  setBuzzerSoundEnabled,
  setBuzzerSoundPath,
  setBackgroundMusicEnabled,
  setBackgroundMusicPath,
  setNotificationSoundsEnabled,
  setNotificationSoundPath,
  setExplanationAudioPath,
  setAnimationsEnabled,
  setReduceMotion,
  setAutoDetectPerformance,
  setAutoRevealEnabled,
  setAutoRevealTimeout,
} = settingsSlice.actions;

export default settingsSlice.reducer;
