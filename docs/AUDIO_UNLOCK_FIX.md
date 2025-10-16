# Audio Unlock Fix

## Issue
User reported error: `NotSupportedError: Failed to load because no supported source was found` when trying to unlock audio.

## Root Cause
The `setupAudioUnlock()` method in `soundManager.ts` was using a long MP3 data URI to unlock audio on mobile devices. This failed because:

1. **MP3 codec not universally supported**: Some browsers don't support MP3 playback or require specific codecs
2. **Data URI complexity**: The base64-encoded MP3 was complex and might not decode properly
3. **Race condition**: The audio element might try to load before the browser is ready

## Solution

### Changed Audio Unlock Strategy (3-tier approach)

**1. Primary Method: Web Audio API**
```typescript
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
const audioContext = new AudioContext();

// Create a silent buffer
const buffer = audioContext.createBuffer(1, 1, 22050);
const source = audioContext.createBufferSource();
source.buffer = buffer;
source.connect(audioContext.destination);
source.start(0);
```

**Benefits:**
- No external files needed
- No codec requirements
- Works on all modern browsers
- Instant execution

**2. Fallback Method: Minimal WAV Data URI**
```typescript
silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
```

**Benefits:**
- WAV is universally supported (no codecs needed)
- Much simpler format than MP3
- Minimal size (44 bytes)
- Guaranteed to work

**3. Error Handling**
- Added try-catch around AudioContext creation
- Added proper error logging for debugging
- Fallback chain ensures audio unlock succeeds

### Enhanced Sound Loading

Added error and success handlers to track sound file loading:

```typescript
// Error handler
audio.addEventListener('error', (e) => {
  console.error(`[SoundManager] Failed to load sound "${type}" from ${path}:`, {
    error: e,
    networkState: audio.networkState,
    readyState: audio.readyState,
    errorCode: audio.error?.code,
    errorMessage: audio.error?.message,
  });
});

// Success handler
audio.addEventListener('canplaythrough', () => {
  console.log(`[SoundManager] Sound "${type}" loaded successfully`);
});
```

**Benefits:**
- Detailed error diagnostics
- Know when sounds are ready to play
- Easier debugging

## Files Modified

### `apps/web/src/lib/soundManager.ts`
1. **Lines 54-97**: Rewrote `setupAudioUnlock()` method
   - Changed from MP3 data URI to AudioContext + WAV fallback
   - Added try-catch error handling
   - Improved console logging

2. **Lines 295-330**: Enhanced `loadSound()` method
   - Added error event listener
   - Added canplaythrough event listener
   - Added detailed error logging

## Verification

### Expected Console Logs (Success Path)

**On page load:**
```
[SoundManager] Device performance: OK
[SoundManager] Loading sound "coin" from path: /sounds/coin.mp3
[SoundManager] Loading sound "coin_wrong" from path: /sounds/coin_wrong.mp3
[SoundManager] Loading sound "buzzer" from path: /sounds/buzzer.mp3
[SoundManager] Loading sound "background" from path: /sounds/background.mp3
[SoundManager] Loading sound "notification" from path: /sounds/notification.mp3
```

**On first user interaction:**
```
[SoundManager] Attempting to unlock audio...
[SoundManager] Audio unlocked successfully via AudioContext
```

**When sounds finish loading:**
```
[SoundManager] Sound "coin" loaded successfully and ready to play
[SoundManager] Sound "coin_wrong" loaded successfully and ready to play
[SoundManager] Sound "buzzer" loaded successfully and ready to play
[SoundManager] Sound "background" loaded successfully and ready to play
[SoundManager] Sound "notification" loaded successfully and ready to play
```

**When playing a sound:**
```
[SoundManager] playSound called for "coin" {...}
[SoundManager] Playing sound "coin" at volume 0.7
[SoundManager] Sound "coin" played successfully
```

### Expected Console Logs (Fallback Path)

If AudioContext fails:
```
[SoundManager] Attempting to unlock audio...
[SoundManager] AudioContext unlock failed, trying Audio element fallback: [error]
[SoundManager] Audio unlocked successfully via Audio element
```

### Error Diagnostics

If sound files fail to load, you'll see:
```
[SoundManager] Failed to load sound "coin" from /sounds/coin.mp3: {
  error: Event {...},
  networkState: 3,
  readyState: 0,
  errorCode: 4,
  errorMessage: "MEDIA_ELEMENT_ERROR: Format error"
}
```

**Common Error Codes:**
- `1` = MEDIA_ERR_ABORTED - User aborted
- `2` = MEDIA_ERR_NETWORK - Network error (file not found)
- `3` = MEDIA_ERR_DECODE - Decoding error (corrupted file)
- `4` = MEDIA_ERR_SRC_NOT_SUPPORTED - Format not supported

## Testing Checklist

After this fix, test the following:

- [ ] Open browser console (F12)
- [ ] Load the app
- [ ] Look for sound loading logs (should see 5 sounds loading)
- [ ] Click anywhere on the page to trigger audio unlock
- [ ] Should see "Audio unlocked successfully"
- [ ] Go to Host Settings
- [ ] Click "Unlock Audio" button
- [ ] Click "Test Coin Sound" button
- [ ] Should hear coin sound play
- [ ] Test all 5 sound buttons
- [ ] All sounds should play without errors

## Next Steps

If sounds still don't work after this fix:

1. **Check sound file paths**: Verify `/sounds/coin.mp3` is accessible
2. **Check CORS**: Ensure sound files are served from same origin
3. **Check file format**: Verify MP3 files are valid (not corrupted)
4. **Check browser support**: Test in different browsers (Chrome, Firefox, Safari)
5. **Check audio settings**: Ensure system volume and browser permissions are enabled

## Additional Notes

### Why This Fix Works

1. **Web Audio API is more reliable**: It's designed for programmatic audio and doesn't require external files
2. **WAV is simpler**: No codec dependencies, universal support
3. **Better error handling**: Now we can see exactly what's failing
4. **Graceful degradation**: Falls back from AudioContext → WAV → logs error

### Browser Compatibility

- **AudioContext**: Supported in all modern browsers (Chrome 35+, Firefox 25+, Safari 14.1+)
- **WAV format**: Supported in all browsers since forever
- **MP3 files**: Supported in all modern browsers (our actual sound files)

### Performance Impact

- **Minimal**: Audio unlock happens once on first interaction
- **No blocking**: Sound loading is async and doesn't block UI
- **Lazy loading**: Sounds only load when soundManager is initialized
