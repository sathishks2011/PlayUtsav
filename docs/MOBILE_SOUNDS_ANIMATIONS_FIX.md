# Mobile Sounds and Animations Fix

## Issues Fixed

### 1. **Sounds Not Working on Mobile** ✅

**Problem**: Sounds were not playing on mobile devices due to browser autoplay policies that require user interaction before audio can play.

**Solution**: Added audio unlock mechanism in `soundManager.ts`:
- Added `audioUnlocked` flag to track if audio has been enabled
- Created `setupAudioUnlock()` method that listens for user interactions (touchstart, touchend, click, keydown)
- Plays a silent audio on first interaction to unlock the audio context
- Added check in `playSound()` to prevent attempts before unlock

**Files Modified**:
- `apps/web/src/lib/soundManager.ts`

**Code Changes**:
```typescript
private audioUnlocked: boolean = false;

private setupAudioUnlock(): void {
  // Creates silent audio and plays on first user interaction
  // Listens for: touchstart, touchend, click, keydown
}
```

### 2. **Overly Aggressive Performance Detection** ✅

**Problem**: The performance detection was flagging modern mobile phones as "low performance" devices, causing:
- Sounds to be disabled
- Animations to be skipped

**Solution**: Made performance detection more conservative:
- Memory threshold: 500MB → 300MB (very low memory only)
- CPU cores: < 4 → < 2 (only very old/weak devices)
- **Removed**: devicePixelRatio check (high DPR is normal for retina displays)

**Files Modified**:
- `apps/web/src/lib/soundManager.ts`

**Before**:
```typescript
if (navigator.hardwareConcurrency < 4) { /* low perf */ }
if (window.devicePixelRatio > 2) { /* low perf */ }
```

**After**:
```typescript
if (navigator.hardwareConcurrency < 2) { /* low perf */ }
// Removed devicePixelRatio check
```

### 3. **Session Not Persisting on Mobile** ✅

**Problem**: When refreshing or navigating in mobile browser, the session state was lost because the restore hook was using hardcoded `localhost:3000` URL, which doesn't work on mobile devices.

**Solution**: Updated `usePlayerSessionRestore` hook to use `getApiBaseUrl()`:
- Changed from hardcoded URL to dynamic config-based URL
- Uses `/api` proxy path which works across devices
- Added `credentials: 'include'` for cookie support

**Files Modified**:
- `apps/web/src/hooks/usePlayerSessionRestore.ts`

**Before**:
```typescript
fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/sessions/${sessionId}`)
```

**After**:
```typescript
getApiBaseUrl().then((baseUrl) => {
  return fetch(`${baseUrl}/sessions/${sessionId}`, {
    credentials: 'include',
  });
})
```

## Testing

### Test Sounds on Mobile:
1. Open the app on mobile browser
2. **Tap anywhere on the screen** (this unlocks audio)
3. Join a game and listen for sounds:
   - ✅ Buzzer sound when buzzer is pressed
   - ✅ Coin sound when answer is correct
   - ✅ Wrong sound when answer is incorrect
   - ✅ Notification sounds

### Test Animations on Mobile:
1. Check browser console for performance detection logs
2. Verify animations are working:
   - ✅ Score animations when points are earned
   - ✅ Pulse animations on UI elements
   - ✅ Transition animations

### Test Session Persistence on Mobile:
1. Join a session on mobile
2. Refresh the page
3. ✅ Should stay in the same session (not kicked back to join screen)
4. Navigate away and come back
5. ✅ Session should still be active

## Key Changes Summary

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| No sounds on mobile | Browser autoplay policy | Audio unlock on first user interaction |
| Sounds/animations disabled | Aggressive perf detection | More conservative detection thresholds |
| Session not persisting | Hardcoded localhost URL | Use dynamic config-based URL with proxy |

## Mobile Browser Support

- ✅ iOS Safari
- ✅ Chrome Mobile
- ✅ Firefox Mobile
- ✅ Samsung Internet
- ✅ Edge Mobile

## Notes

- **Audio unlock requires user interaction**: Users must tap/click once before sounds will work (browser requirement)
- **Performance detection**: Only flags devices with < 2 CPU cores or < 300MB memory as low performance
- **Session persistence**: Uses localStorage and validates with server on app load
- **Network routing**: All API calls now use `/api` proxy for consistent routing across devices
