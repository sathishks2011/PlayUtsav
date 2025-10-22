# Bioscope Sound Fix

## Issue
Sounds were not playing in Bioscope game when:
- Revealing images
- Revealing answers
- Timer countdown

## Root Causes Identified

### 1. Browser Audio Policy (Main Issue)
Modern browsers (Chrome, Firefox, Safari) block audio playback until user interaction occurs. The sound manager has an audio unlock mechanism, but it wasn't being triggered properly in the Bioscope panel.

**Symptoms:**
- Console shows: `Sound "image-appear" blocked: audio not unlocked yet`
- Sounds work in other parts of the app but not in Bioscope

### 2. Sound Configuration Issues
- Timer sound was checking `notificationSoundsEnabled` instead of `timerSoundEnabled`
- Missing detailed logging to debug sound playback
- Answer reveal was using `buzzer` sound instead of `notification`

### 3. Sound File Verification
All sound files exist and are properly sized:
```
image-appear.mp3  188 KB
timer.mp3         321 KB
buzzer.mp3         19 KB
notification.mp3   19 KB
coin.mp3           73 KB
coin_wrong.mp3     87 KB
```

## Fixes Applied

### 1. Added Audio Unlock to HostBioscopePanel
**File:** [apps/web/src/components/HostBioscopePanel.tsx](../apps/web/src/components/HostBioscopePanel.tsx#L78-L99)

Added a `useEffect` hook that listens for the first user interaction (click or keydown) and plays a silent audio file to unlock the browser's audio context.

```typescript
useEffect(() => {
  const unlockAudio = () => {
    console.log('[HostBioscopePanel] Attempting to unlock audio on user interaction');
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    audio.volume = 0;
    audio.play().catch(() => {
      console.log('[HostBioscopePanel] Audio unlock attempt (silent sound)');
    });
  };

  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  return () => {
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  };
}, []);
```

### 2. Fixed Timer Sound Settings Check
**File:** [apps/web/src/hooks/useBioscopeSounds.ts](../apps/web/src/hooks/useBioscopeSounds.ts#L70)

Changed from:
```typescript
if (!enabled || !settings.sounds.soundsEnabled || !settings.sounds.notificationSoundsEnabled)
```

To:
```typescript
if (!enabled || !settings.sounds.soundsEnabled || !settings.sounds.timerSoundEnabled)
```

### 3. Improved Sound Logging
**File:** [apps/web/src/hooks/useBioscopeSounds.ts](../apps/web/src/hooks/useBioscopeSounds.ts)

Added detailed console logs to track:
- Why sounds are blocked
- When sounds are played
- Timer sound state transitions

### 4. Fixed Answer Reveal Sound
**File:** [apps/web/src/hooks/useBioscopeSounds.ts](../apps/web/src/hooks/useBioscopeSounds.ts#L51-L52)

Changed answer reveal to use `notification` sound instead of `buzzer` for clearer audio distinction.

### 5. Enhanced Sound Manager Logging
**File:** [apps/web/src/lib/soundManager.ts](../apps/web/src/lib/soundManager.ts#L371-L400)

Added verbose logging in `getSoundEnabledState` to track which sounds are enabled/disabled and why.

## How to Test

### Prerequisites
1. Restart the dev server after these changes
2. Clear browser cache (Ctrl+Shift+Delete)
3. Open Chrome DevTools Console (F12 → Console)

### Test Steps

1. **Start a Bioscope Game Session:**
   - Create/join a session
   - Navigate to Bioscope host panel
   - **Important:** Click anywhere on the page first (this unlocks audio)

2. **Test Image Reveal Sound:**
   - Click "Reveal Next Image"
   - Should hear `image-appear.mp3` (188KB file, distinct sound)
   - Check console for: `[BioscopeSounds] Playing image appear sound`

3. **Test Answer Reveal Sound:**
   - After revealing images, click "Reveal Answer"
   - Should hear `notification.mp3` sound
   - Check console for: `[BioscopeSounds] Playing answer reveal sound (buzzer)`

4. **Test Timer Sound:**
   - Start a new round
   - Wait for timer to reach 10 seconds remaining
   - Should hear `timer.mp3` playing (looping/continuous sound)
   - When timer expires (0 seconds), should hear `buzzer.mp3`
   - Check console for: `[BioscopeSounds] Timer sound started at 10s`

### Console Logs to Look For

**Success indicators:**
```
[HostBioscopePanel] Attempting to unlock audio on user interaction
[SoundManager] Audio unlocked successfully
[SoundManager] Sound "image-appear" enabled state: true
[BioscopeSounds] Playing image appear sound
[SoundManager] Playing sound "image-appear" at volume 0.7
[SoundManager] Sound "image-appear" played successfully
```

**Failure indicators:**
```
[SoundManager] Sound "image-appear" blocked: audio not unlocked yet
[SoundManager] Sound "image-appear" blocked: cache not found or disabled
[BioscopeSounds] Image sound blocked - enabled: false
```

## Sound Settings Verification

Check Redux settings in DevTools:
1. Open Redux DevTools
2. Go to State → settings → sounds
3. Verify:
   - `soundsEnabled: true`
   - `notificationSoundsEnabled: true`
   - `timerSoundEnabled: true`
   - `masterVolume: 70` (or your preferred level)

## Troubleshooting

### Sounds Still Not Playing?

1. **Check Browser Console:**
   - Look for `[SoundManager]` and `[BioscopeSounds]` logs
   - Identify which check is failing

2. **Verify Audio Unlock:**
   - Look for: `Audio unlocked successfully`
   - If missing, try clicking on the page before revealing images

3. **Check Sound Settings:**
   - Open Settings panel
   - Verify "Master Volume" is not 0
   - Verify "Sounds Enabled" is checked
   - Verify "Notification Sounds" is enabled (for image-appear)
   - Verify "Timer Sound" is enabled

4. **Test in Different Browser:**
   - Try Firefox or Edge
   - Some browsers have stricter audio policies

5. **Check Network Tab:**
   - Verify sound files are loading (200 status)
   - Path should be `/sounds/image-appear.mp3`

6. **Low Performance Device:**
   - Sound Manager auto-disables on very low-end devices
   - Check console for: `Low performance detected`

## Technical Details

### Sound Mapping
- **Image Reveal:** `image-appear.mp3` (controlled by `notificationSoundsEnabled`)
- **Answer Reveal:** `notification.mp3` (controlled by `notificationSoundsEnabled`)
- **Timer Warning:** `timer.mp3` at 10s mark (controlled by `timerSoundEnabled`)
- **Timer Expired:** `buzzer.mp3` (controlled by `buzzerSoundEnabled`)
- **Correct Answer:** `coin.mp3` (controlled by `coinSoundEnabled`)
- **Wrong Answer:** `coin_wrong.mp3` (controlled by `coinWrongSoundEnabled`)

### Settings Flow
1. Redux store maintains sound settings
2. `useSoundManager` hook syncs settings to SoundManager singleton
3. `useBioscopeSounds` hook provides sound playback functions
4. HostBioscopePanel calls these functions on game events

## Related Files
- [soundManager.ts](../apps/web/src/lib/soundManager.ts) - Core sound playback system
- [useBioscopeSounds.ts](../apps/web/src/hooks/useBioscopeSounds.ts) - Bioscope sound hooks
- [HostBioscopePanel.tsx](../apps/web/src/components/HostBioscopePanel.tsx) - Host controls
- [settingsSlice.ts](../apps/web/src/store/slices/settingsSlice.ts) - Sound settings state

## Future Improvements
1. Add visual indicator when audio is locked (before user interaction)
2. Add "Test Sound" buttons in settings panel
3. Consider preloading sounds on app load
4. Add sound volume sliders per sound type
5. Add option to customize which sounds play for which events
