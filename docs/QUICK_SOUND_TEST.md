# Quick Sound & Animation Test

## Immediate Steps to Test

### 1. **Open Browser Console** (F12)
Look for these logs when you load the page:

```
[SoundManager] Initializing with settings: ...
[SoundManager] Preloading sound "coin": /sounds/coin.mp3
[SoundManager] Preloading sound "buzzer": /sounds/buzzer.mp3
[SoundManager] Preloading sound "coin_wrong": /sounds/coin_wrong.mp3
```

### 2. **Click Anywhere on the Page**
Modern browsers block audio until user interacts. After clicking, you should see:

```
[SoundManager] Audio unlocked successfully
```

### 3. **Test Each Feature**

#### Test Buzzer Sound:
1. Create a session with "Buzzer Mode"
2. Join as a player
3. Host starts a quiz
4. **Player clicks buzzer button**
5. **Expected**: Buzzer sound plays

**Console Check**:
```
[SoundManager] playSound called for "buzzer"
[SoundManager] Playing sound "buzzer" at volume 0.7
[SoundManager] Sound "buzzer" played successfully
```

#### Test Wrong Answer Sound:
1. Quiz is running
2. Player selects **wrong** answer
3. Player submits
4. Host reveals answer
5. **Expected**: "Ding-wrong" sound plays

**Console Check**:
```
[SoundManager] playSound called for "coin_wrong"
[SoundManager] Playing sound "coin_wrong" at volume 0.7
```

#### Test Correct Answer Sound & Animation:
1. Quiz is running
2. Player selects **correct** answer
3. Host reveals answer
4. **Expected**: 
   - "Ding-correct" sound plays
   - Flying coins animation from team score

**Console Check**:
```
[useSessionSync] Score animation event: {teamId: "...", points: 10}
[useSessionSync] Triggering coin sound...
[SoundManager] playSound called for "coin"
[SoundManager] Playing sound "coin" at volume 0.7
```

## Common Issues

### ❌ **No Logs at All**
**Problem**: Sound manager not initialized

**Fix**: Refresh the page

### ❌ **"Audio not unlocked"**
**Problem**: Need user interaction first

**Fix**: Click anywhere on the page, then try again

### ❌ **"Settings not ready or sounds disabled"**
**Problem**: Sounds disabled in settings

**Fix**: Open Host Settings → Enable sounds

### ❌ **404 on sound files**
**Problem**: Sound files not accessible

**Fix**: Verify web server is running on port 5173

### ❌ **No "score:animated" event**
**Problem**: Backend not emitting event OR WebSocket not connected

**Fix**: 
1. Check connection status banner (should be hidden if connected)
2. Check API server logs for `score:animated` emission
3. Ensure you have teams created (score animation requires teams)

## Manual Test in Console

Paste this in browser console to test sound system:

```javascript
// Test 1: Check if sound manager is ready
console.log('Sound Manager:', window.soundManager || 'Not accessible');

// Test 2: Play buzzer sound directly
const audio = new Audio('/sounds/buzzer.mp3');
audio.volume = 0.7;
audio.play()
  .then(() => console.log('✅ Buzzer sound works!'))
  .catch(err => console.error('❌ Buzzer failed:', err));

// Test 3: Play coin sound
setTimeout(() => {
  const audio2 = new Audio('/sounds/coin.mp3');
  audio2.volume = 0.7;
  audio2.play()
    .then(() => console.log('✅ Coin sound works!'))
    .catch(err => console.error('❌ Coin failed:', err));
}, 1000);

// Test 4: Play wrong answer sound
setTimeout(() => {
  const audio3 = new Audio('/sounds/coin_wrong.mp3');
  audio3.volume = 0.7;
  audio3.play()
    .then(() => console.log('✅ Wrong answer sound works!'))
    .catch(err => console.error('❌ Wrong answer failed:', err));
}, 2000);
```

If this script works, sounds are functional and the issue is with event triggering.

## Animation Check

For score animations, verify in browser console:

```javascript
// Check if ScoreAnimation component is mounted
document.querySelector('[data-testid="score-animation"]')
// or look for the animation overlay div
```

When a correct answer is given and revealed:
1. Check Redux state has the score animation:
   ```javascript
   // In Redux DevTools, check useSessionSync hook state
   // Should have scoreAnimation object with teamId and points
   ```

2. The animation should render in `App.tsx` lines 131-170

## Report Results

After testing, please report:

1. ✅ or ❌ **Console logs appear**: [Yes/No]
2. ✅ or ❌ **Audio unlocked after clicking**: [Yes/No]
3. ✅ or ❌ **Buzzer sound plays**: [Yes/No]
4. ✅ or ❌ **Wrong answer sound plays**: [Yes/No]
5. ✅ or ❌ **Correct answer sound plays**: [Yes/No]
6. ✅ or ❌ **Flying coins animation appears**: [Yes/No]
7. **Browser**: [Chrome/Firefox/Safari/Edge]
8. **Device**: [Desktop/Mobile]
9. **Console errors**: [Copy any error messages]

This will help identify exactly where the issue is!
