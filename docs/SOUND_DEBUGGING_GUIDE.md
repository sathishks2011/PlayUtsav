# Sound System Debugging Guide

## Sound Not Playing - Troubleshooting Steps

### Changes Made
1. **Added sound playback to score animations** (`useSessionSync.ts`)
   - Coin sound plays when `score:animated` WebSocket event fires
   - Checks if sounds are enabled before playing
   - Uses master volume from settings

2. **Added comprehensive logging** (`soundManager.ts`, `useSessionSync.ts`)
   - Logs every sound play attempt
   - Shows why sounds are blocked if they don't play
   - Displays current settings state

### How to Debug

#### 1. Check Browser Console
When you click "Reveal & award", you should see these console logs:

```
[useSessionSync] Score animation event: {teamId: "...", points: 10, ...}
[useSessionSync] Sound settings: {soundsEnabled: true, coinSoundEnabled: true, masterVolume: 70}
[useSessionSync] Triggering coin sound...
[SoundManager] playSound called for "coin" {...}
[SoundManager] Playing sound "coin" at volume 0.7
[SoundManager] Sound "coin" played successfully
```

#### 2. If Sound is Blocked

**Check Settings State**:
```
[useSessionSync] Coin sound blocked by settings
```
→ **Solution**: Enable sounds in Host Settings → Sound Settings

**Check SoundManager Initialization**:
```
[SoundManager] Sound "coin" blocked: settings not ready or sounds disabled
```
→ **Solution**: Ensure `useSoundManager()` hook is called in App.tsx (already done)

**Check Sound Cache**:
```
[SoundManager] Sound "coin" blocked: cache not found or disabled
```
→ **Solution**: Sound file not loaded. Check:
  - File exists: `apps/web/public/sounds/coin.mp3` ✅ (confirmed)
  - Path is correct: `/sounds/coin.mp3` ✅ (confirmed in settingsSlice)
  - Check browser Network tab for 404 errors

**Low Performance Device**:
```
[SoundManager] Sound "coin" blocked: low performance device
```
→ **Solution**: Disable auto-detect performance in settings or use better device

#### 3. Check Sound File Accessibility

Open browser DevTools:
1. **Network Tab** → Filter by "media" or "mp3"
2. Trigger sound (click test button or reveal answer)
3. Look for `/sounds/coin.mp3` request
4. Check status code:
   - **200**: File loaded successfully ✅
   - **404**: File not found ❌
   - **403**: Permission denied ❌

#### 4. Test Sound Directly

**Test Button** (already added):
- Go to Host Console → Settings → Sound Settings
- Click "🔊 Test Sound (Coin)"
- Should play coin sound immediately

**Browser Console Test**:
```javascript
const { SoundManager } = await import('./lib/soundManager');
const manager = SoundManager.getInstance();
manager.playSound('coin', 0.8);
```

#### 5. Common Issues

**Issue**: "User interaction required"
- **Cause**: Browser autoplay policy requires user interaction
- **Solution**: Click anywhere on page first, then sounds work
- **Note**: Score animations happen AFTER user clicks "Reveal" so this should be fine

**Issue**: File path not found (404)
- **Cause**: Vite dev server not serving public files correctly
- **Solution**: 
  1. Restart Vite dev server: `pnpm dev`
  2. Check file exists: `apps/web/public/sounds/coin.mp3`
  3. Clear browser cache (Ctrl+Shift+R)

**Issue**: "NotAllowedError: play() failed"
- **Cause**: Browser blocked autoplay
- **Solution**: User must interact with page first (click button)

**Issue**: Sound plays but volume is 0
- **Cause**: Master volume set to 0 in settings
- **Solution**: Host Settings → Sound Settings → Master Volume slider

### Settings Structure

```typescript
settings.sounds = {
  masterVolume: 70,           // 0-100
  soundsEnabled: true,        // Master on/off
  coinSoundEnabled: true,     // Individual sound toggle
  coinSoundPath: '/sounds/coin.mp3',
  buzzerSoundEnabled: true,
  buzzerSoundPath: '/sounds/buzzer.mp3',
  backgroundMusicEnabled: false,
  backgroundMusicPath: '/sounds/background.mp3',
  notificationSoundsEnabled: true,
  notificationSoundPath: '/sounds/notification.mp3',
}
```

### Sound Trigger Flow

```
Host clicks "Reveal & award"
        ↓
Backend emits 'score:animated' WebSocket event
        ↓
useSessionSync receives event
        ↓
Checks soundSettings.soundsEnabled && coinSoundEnabled
        ↓
Calls soundManager.playSound('coin', volume)
        ↓
SoundManager checks:
  - Settings initialized? ✓
  - Sounds enabled? ✓
  - Low performance? ✗
  - Sound cache exists? ✓
  - Sound enabled? ✓
        ↓
Plays audio file
        ↓
🔊 Sound plays!
```

### Quick Fixes

1. **Enable sounds in settings**:
   - Host Console → Settings → Sound Settings
   - Toggle "Enable Sounds" ON
   - Set "Master Volume" to 50-100

2. **Check coin sound specifically**:
   - Toggle "Coin Sound" ON
   - Use "Test Sound" button

3. **Verify file exists**:
   ```bash
   ls apps/web/public/sounds/coin.mp3
   ```

4. **Check browser DevTools Console** for error messages

5. **Try different browser** (Chrome, Firefox, Edge)

### Expected Behavior

✅ **Host View**:
- Click "Reveal & award" → Coin sound plays
- See animation fly to scoreboard
- Score number pulses gold

✅ **Player View**:
- When host reveals → Coin sound plays
- See animation fly to scoreboard
- Score number pulses gold

### Files Modified

1. **`apps/web/src/hooks/useSessionSync.ts`**
   - Added `soundManager` import
   - Added `soundSettings` from Redux
   - Plays coin sound on `score:animated` event
   - Added comprehensive logging

2. **`apps/web/src/lib/soundManager.ts`**
   - Enhanced `playSound()` with detailed logging
   - Logs each check (settings, cache, enabled, etc.)
   - Logs success and error states

### Testing Checklist

- [ ] Host Settings shows "Enable Sounds" toggle
- [ ] Master Volume slider works (0-100)
- [ ] "Test Sound (Coin)" button plays sound
- [ ] Browser console shows no errors
- [ ] Network tab shows coin.mp3 loads (200 status)
- [ ] Host reveal triggers coin sound
- [ ] Player hears coin sound when host reveals
- [ ] Console logs show successful playback

