# Sounds & Animations Troubleshooting Guide

## Issue Report
User reports: "I dont see buzzer and other sounds, including animation, correct answer, wrong answer"

## System Status

### ✅ **What's Already Implemented**

1. **Sound System**:
   - ✅ `SoundManager` class fully implemented
   - ✅ Sound files exist in `/public/sounds/`:
     - `buzzer.mp3`
     - `coin.mp3` (correct answer)
     - `coin_wrong.mp3` (wrong answer)
   - ✅ `useSoundManager()` hook called in `App.tsx`
   - ✅ Sounds enabled by default in Redux settings

2. **Animation System**:
   - ✅ `ScoreAnimation` component implemented
   - ✅ Score animation events via WebSocket
   - ✅ Animations enabled by default in Redux settings

3. **Trigger Points**:
   - ✅ Buzzer press: `PlayerBuzzerButton.tsx` line 59
   - ✅ Wrong answer: `PlayerQuizPanel.tsx` lines 24-32
   - ✅ Correct answer (score): `useSessionSync.ts` line 40
   - ✅ Score animation: `App.tsx` lines 131-170

## Root Causes (Most Likely)

### 1. **Audio Not Unlocked (Mobile/Browser Restriction)**

**Problem**: Modern browsers require user interaction before audio can play.

**Symptoms**:
- No sounds play on page load
- Console shows: `Sound "buzzer" blocked: audio not unlocked yet`

**Solution**: User must click/tap anywhere on the page first to unlock audio.

**Check in Browser Console**:
```javascript
// Should see this after clicking anywhere:
[SoundManager] Audio unlocked successfully
```

### 2. **Sound Settings Disabled**

**Check Redux State**:
```javascript
// In browser console:
window.__REDUX_DEVTOOLS_EXTENSION__?.()
// Navigate to State → settings → sounds
// Verify:
soundsEnabled: true
coinSoundEnabled: true
buzzerSoundEnabled: true
coinWrongSoundEnabled: true
```

### 3. **WebSocket Not Connected**

**Problem**: If WebSocket isn't connected, real-time events (buzzer, scores) won't trigger.

**Check**:
- Look for green "Connected" status or no banner at top
- Console should show: `[SessionSocket] Connected to server`

**If not connected**: See `WEBSOCKET_URL_FIX.md`

## Debugging Steps

### Step 1: Open Browser Console
**Chrome/Edge**: F12 or Ctrl+Shift+I  
**Firefox**: F12  
**Safari**: Cmd+Option+I (Mac)

### Step 2: Check SoundManager Initialization
Look for these logs:
```
[SoundManager] Initializing with settings: {...}
[SoundManager] Preloading sound "coin": /sounds/coin.mp3
[SoundManager] Preloading sound "coin_wrong": /sounds/coin_wrong.mp3
[SoundManager] Preloading sound "buzzer": /sounds/buzzer.mp3
```

**If missing**: Sound manager not initialized properly.

### Step 3: Test Audio Unlock
1. **Click anywhere** on the page
2. Look for: `[SoundManager] Audio unlocked successfully`
3. If not unlocked, sounds won't play

### Step 4: Trigger a Sound Manually
In browser console:
```javascript
// Import and test
import { soundManager } from './lib/soundManager';
soundManager.playSound('buzzer');
```

Or test via Redux DevTools:
1. Open Redux DevTools
2. Go to "Action" tab
3. Dispatch action: `{ type: 'settings/setMasterVolume', payload: 100 }`
4. Trigger a game event (press buzzer)

### Step 5: Check Sound File Access
Open these URLs directly in browser:
- http://192.168.2.1:5173/sounds/buzzer.mp3
- http://192.168.2.1:5173/sounds/coin.mp3
- http://192.168.2.1:5173/sounds/coin_wrong.mp3

**Should**: Play the sound  
**If 404**: Sound files missing from build

### Step 6: Check Network Tab
1. Open DevTools → Network tab
2. Filter by "Media" or "All"
3. Trigger an event (press buzzer)
4. Look for sound file requests
5. Check if they return 200 OK

## Specific Event Testing

### Test Buzzer Sound

1. **Setup**:
   - Host creates session with "Buzzer Mode"
   - Player joins session
   - Host starts a quiz question

2. **Trigger**:
   - Player presses buzzer button
   
3. **Expected**:
   - Sound plays: "buzzer.mp3"
   - Console: `[SoundManager] Playing sound "buzzer" at volume 0.7`

4. **Debug**:
```javascript
// Check if PlayerBuzzerButton is rendered:
document.querySelector('[data-testid="buzzer-button"]') // or similar
```

### Test Wrong Answer Sound

1. **Setup**:
   - Quiz question running
   - Player selects WRONG answer
   - Player submits answer
   - Host reveals answer

2. **Trigger**:
   - Quiz status changes to 'revealed'
   
3. **Expected**:
   - Sound plays: "coin_wrong.mp3"
   - Console: `[SoundManager] Playing sound "coin_wrong"`

4. **Debug**:
```javascript
// Check quiz state in Redux:
// state.quiz.current.status === 'revealed'
// state.quiz.current.correctOption !== playerAnswer
```

### Test Correct Answer Sound (Score Animation)

1. **Setup**:
   - Quiz question running
   - Player selects CORRECT answer
   - Host reveals answer

2. **Trigger**:
   - Backend emits `score:animated` event
   
3. **Expected**:
   - Sound plays: "coin.mp3"
   - Score animation shows flying coins
   - Console: `[useSessionSync] Score animation event: {...}`

4. **Debug**:
```javascript
// Check WebSocket listener:
// In useSessionSync.ts line 47:
socket.on('score:animated', handleScoreAnimation);

// Check if event is received:
// Console should show:
[useSessionSync] Score animation event: {teamId: "...", points: 10, ...}
```

## Common Issues & Fixes

### Issue 1: "Audio not unlocked"

**Symptoms**:
```
[SoundManager] Sound "buzzer" blocked: audio not unlocked yet
```

**Fix**:
1. Click/tap anywhere on the page
2. Audio will unlock automatically
3. Try triggering sound again

**For Testing**: Add a test button to unlock audio:
```tsx
<button onClick={() => {
  const audio = new Audio('/sounds/buzzer.mp3');
  audio.play();
}}>
  Test Sound
</button>
```

### Issue 2: "Settings not ready or sounds disabled"

**Symptoms**:
```
[SoundManager] Sound "buzzer" blocked: settings not ready or sounds disabled
```

**Fix**:
1. Check Redux state: `state.settings.sounds.soundsEnabled`
2. If false, enable in settings panel
3. Or dispatch action:
```javascript
store.dispatch({ type: 'settings/setSoundsEnabled', payload: true });
```

### Issue 3: "Cache not found or disabled"

**Symptoms**:
```
[SoundManager] Sound "buzzer" blocked: cache not found or disabled
```

**Fix**:
1. Sound files not preloaded
2. Check Network tab for 404 errors on sound files
3. Ensure files exist in `apps/web/public/sounds/`
4. Clear browser cache and reload

### Issue 4: No Score Animation

**Symptoms**:
- Correct answer given
- No flying coins animation
- No coin sound

**Debug**:
1. Check WebSocket connection: Must be connected
2. Check backend logs for `score:animated` emission
3. Check browser console for score animation event
4. Verify `useSessionSync` is listening to `score:animated`

**Backend Check** (`services/api/src/gateways/session.gateway.ts`):
```typescript
// Should emit:
server.to(sessionId).emit('score:animated', {
  teamId: team.id,
  points: delta,
  isBonus: false,
});
```

**Frontend Check** (`apps/web/src/hooks/useSessionSync.ts`):
```typescript
// Should listen:
socket.on('score:animated', handleScoreAnimation);
```

### Issue 5: Wrong Answer Sound Not Playing

**Check**:
1. Is quiz revealed? `quiz.status === 'revealed'`
2. Did player submit? `submitted === true`
3. Was answer wrong? `quiz.correctOption !== selected`

**Debug in PlayerQuizPanel.tsx**:
```tsx
useEffect(() => {
  console.log('Quiz revealed check:', {
    status: quiz?.status,
    submitted,
    selected,
    correctOption: quiz?.correctOption,
    isCorrect: quiz?.correctOption === selected
  });
  
  if (!quiz || quiz.status !== 'revealed' || !submitted || selected == null) return;
  
  const isCorrect = quiz.correctOption === selected;
  if (!isCorrect) {
    console.log('Playing wrong answer sound');
    soundManager.playSound('coin_wrong');
  }
}, [quiz?.status, quiz?.correctOption, selected, submitted]);
```

## Quick Fixes

### Enable Comprehensive Logging

Add this to browser console to see all sound events:
```javascript
// Intercept all soundManager.playSound calls
const originalPlaySound = soundManager.playSound.bind(soundManager);
soundManager.playSound = function(type, volume) {
  console.log('🔊 SOUND TRIGGERED:', type, 'volume:', volume);
  console.trace(); // Show call stack
  return originalPlaySound(type, volume);
};
```

### Force Enable All Sounds

```javascript
// Dispatch to Redux
store.dispatch({ type: 'settings/setSoundsEnabled', payload: true });
store.dispatch({ type: 'settings/setCoinSoundEnabled', payload: true });
store.dispatch({ type: 'settings/setBuzzerSoundEnabled', payload: true });
store.dispatch({ type: 'settings/setCoinWrongSoundEnabled', payload: true });
store.dispatch({ type: 'settings/setMasterVolume', payload: 100 });
```

### Test Sound Files Directly

```javascript
// Test each sound file
['buzzer', 'coin', 'coin_wrong'].forEach(sound => {
  const audio = new Audio(`/sounds/${sound}.mp3`);
  audio.volume = 0.7;
  audio.play()
    .then(() => console.log(`✅ ${sound} played`))
    .catch(err => console.error(`❌ ${sound} failed:`, err));
});
```

## Expected Console Output (Working System)

When everything is working, you should see:
```
[SoundManager] Initializing with settings: {masterVolume: 70, soundsEnabled: true, ...}
[SoundManager] Preloading sound "coin": /sounds/coin.mp3
[SoundManager] Preloading sound "coin_wrong": /sounds/coin_wrong.mp3
[SoundManager] Preloading sound "buzzer": /sounds/buzzer.mp3
[SoundManager] Preloading sound "notification": /sounds/notification.mp3
[SoundManager] Audio unlocked successfully
[SoundManager] playSound called for "buzzer"
[SoundManager] Playing sound "buzzer" at volume 0.7
[SoundManager] Sound "buzzer" played successfully
```

## Still Not Working?

### Last Resort Checks

1. **Browser Audio Blocked**:
   - Check browser settings for audio permissions
   - Try in incognito/private mode
   - Try different browser

2. **File Format Issues**:
   - Ensure MP3 files are valid
   - Try converting to different format
   - Test files in media player

3. **Redux State Corruption**:
   - Clear localStorage: `localStorage.clear()`
   - Reload page
   - Check Redux DevTools for state

4. **React Component Unmounting**:
   - Sounds trigger but component unmounts too fast
   - Add delays or state management

## Report Back

When reporting the issue, please include:

1. **Browser Console Output**: Copy all `[SoundManager]` logs
2. **Redux State**: Screenshot of `settings.sounds`
3. **Network Tab**: Any 404 or failed requests for sound files
4. **WebSocket Status**: Connected or disconnected
5. **Specific Action**: What you did (pressed buzzer, submitted answer, etc.)
6. **Browser & Device**: Chrome on Windows? Safari on iPhone?

---

## Quick Test Script

Paste this in browser console for comprehensive test:
```javascript
console.log('=== SOUND SYSTEM DIAGNOSTIC ===');
console.log('1. Audio unlocked:', soundManager.audioUnlocked);
console.log('2. Settings:', soundManager.settings);
console.log('3. Sounds cache:', soundManager.sounds);
console.log('4. Low performance:', soundManager.isLowPerformanceDevice);

console.log('\n=== TESTING SOUND PLAYBACK ===');
soundManager.playSound('buzzer');
setTimeout(() => soundManager.playSound('coin'), 1000);
setTimeout(() => soundManager.playSound('coin_wrong'), 2000);
```

This will test the entire sound system in 3 seconds.
