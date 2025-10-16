# Score & Sound Debugging Guide

## Issue
Scores are not updating and sounds are not playing when the host reveals the answer during a quiz.

## Investigation Results

### ✅ Backend Code (CORRECT)
The backend code in `services/api/src/routes/quiz.controller.ts` is working correctly:

```typescript
// Lines 99-111 - reveal() method
for (const update of scoreUpdates) {
  await this.gateway.emitScoreAnimated(sessionId, {
    teamId: update.teamId,
    points: update.delta,
    isBonus: update.delta > 50,
    reason: `Player scored ${update.delta} points`,
  });
}
const snapshot = await this.sessions.getSnapshot(sessionId);
if (snapshot) {
  await this.gateway.emitSessionUpdate(sessionId);
}
```

**Backend emits:**
1. `score:animated` event for each score update
2. `session:update` event to refresh scores

### ✅ Frontend Code (CORRECT)
The frontend code in `apps/web/src/hooks/useSessionSync.ts` is working correctly:

```typescript
// Lines 31-46
const handleScoreAnimation = (...args: unknown[]) => {
  const event = args[0] as ScoreAnimationEvent;
  console.log('[useSessionSync] Score animation event:', event);
  setScoreAnimation(event);
  
  // Play coin sound when score animation triggers
  if (soundSettings.soundsEnabled && soundSettings.coinSoundEnabled) {
    console.log('[useSessionSync] Triggering coin sound...');
    soundManager.playSound('coin', soundSettings.masterVolume / 100);
  }
  
  setTimeout(() => setScoreAnimation(null), 3000);
};

socket.on('score:animated', handleScoreAnimation);
```

**Frontend listens for:**
1. `score:animated` event → plays coin sound + shows animation
2. `session:update` event → updates scores in Redux store

### ✅ WebSocket Events (LOGGED)
The gateway has logging enabled in `services/api/src/gateways/session.gateway.ts`:

```typescript
// Line 143
this.logger.log(`[SessionGateway] Emitting score:animated to room: ${roomName} - points: ${payload.points}, isBonus: ${payload.isBonus}`);
```

## Debugging Steps

### Step 1: Check Backend Console
When you click "Reveal Answer", check the **API server console** (where you ran `npm run dev`) for:

```
[SessionGateway] Emitting score:animated to room: session:xxx - points: 100, isBonus: false
```

**If you DON'T see this:**
- The reveal endpoint isn't being called
- Or scoring system failed (check for errors)

**If you DO see this:**
- Backend is working correctly
- Move to Step 2

---

### Step 2: Check Browser Console
Open **Browser DevTools (F12)** → **Console tab**

When you click "Reveal Answer", look for these logs **IN ORDER**:

#### ✅ Expected Logs:
```
[useSessionSync] Score animation event: {teamId: "xxx", points: 100, isBonus: false, ...}
[useSessionSync] Triggering coin sound...
[SoundManager] Playing sound "coin" with volume 0.7
[useSessionSync] Received session update
```

#### ❌ If you see NOTHING:
**Problem:** Events not reaching frontend

**Possible causes:**
1. WebSocket not connected
2. Not subscribed to session room
3. Room name mismatch

**Check:**
```javascript
// In browser console, type:
window.socket = require('@pkg/core').sessionSocket;
console.log('Connected:', window.socket.socket.connected);
console.log('Rooms:', window.socket.socket.rooms);
```

**Fix:** Refresh the page and rejoin the session

---

#### ❌ If you see logs but NO SOUND:
**Problem:** Sound system issue

**Possible causes:**
1. Audio not unlocked
2. Sound settings disabled
3. Coin sound file missing

**Check sound settings in Redux:**
```javascript
// In browser console, type:
const state = window.store?.getState();
console.log('Sound settings:', state?.settings?.sounds);
// Should show: { soundsEnabled: true, coinSoundEnabled: true, masterVolume: 70, ... }
```

**Check audio unlock:**
```javascript
// Check if audio context is running
soundManager.audioContext.state
// Should be: "running" (not "suspended")
```

**Fix:**
1. Click "Unlock Audio" button in Host Settings
2. Enable sound settings
3. Verify `apps/web/public/assets/sounds/coin.mp3` exists

---

#### ❌ If you see score animation logs but scores DON'T UPDATE:
**Problem:** Session update not working

**Check:**
```javascript
// In browser console during quiz reveal:
// 1. Check if session:update event is received
const socket = require('@pkg/core').sessionSocket;
socket.on('session:update', (data) => {
  console.log('Received session:update:', data);
});

// 2. Check Redux session state
const state = window.store?.getState();
console.log('Session teams:', state?.session?.current?.teams);
// Should show updated scores
```

**Fix:** The session:update event should automatically update scores. If not, there's a Redux state issue.

---

### Step 3: Verify Score Calculation

Check if scores are being calculated by the backend:

```bash
# Check backend logs when revealing answer
[QuizService] Scoring result: { totalPoints: 100, basePoints: 100, ... }
```

**If scoring calculation fails:**
- Check if session has scoring initialized
- The reveal() method will auto-initialize if needed

---

### Step 4: Check Player Quiz Panel Sound (Separate Issue)

The `PlayerQuizPanel.tsx` component has a **separate** sound trigger that only plays `coin_wrong` for wrong answers.

**Current code (Lines 26-33):**
```typescript
useEffect(() => {
  if (!quiz || quiz.status !== 'revealed' || !submitted || selected == null) return;
  
  const isCorrect = quiz.correctOption === selected;
  if (!isCorrect) {
    soundManager.playSound('coin_wrong');
  }
  // MISSING: sound for correct answer
}, [quiz?.status, quiz?.correctOption, selected, submitted]);
```

**Note:** This is **independent** from the score animation sound system. The score animation system (useSessionSync) plays the coin sound when scores update, which happens for ALL players/teams, not just the individual player panel.

---

## Common Issues & Solutions

### Issue 1: "Events not reaching frontend"
**Symptoms:** No console logs at all

**Solution:**
1. Check WebSocket connection status (should be green)
2. Verify session ID matches between frontend and backend
3. Refresh page and rejoin session
4. Check browser Network tab → WS for WebSocket connection

### Issue 2: "Sound not playing"
**Symptoms:** Logs show "Triggering coin sound..." but no audio

**Solution:**
1. Click "Unlock Audio" button in Host Settings
2. Check browser didn't block autoplay (look for icon in address bar)
3. Verify sound files exist in `apps/web/public/assets/sounds/`
4. Check volume isn't muted (master volume > 0)

### Issue 3: "Scores not updating"
**Symptoms:** Sound plays, animation shows, but numbers don't change

**Solution:**
1. Check if `session:update` event is received (see Step 2)
2. Verify Redux session state is being updated
3. Check scoreboard component is reading from Redux correctly
4. Force refresh the page

### Issue 4: "Scoring not initialized"
**Symptoms:** Backend error: "Session scoring state not found"

**Solution:**
The reveal() method auto-initializes scoring, but if it fails:
```bash
# In backend, manually attach scoring config
POST /api/scoring/sessions/:sessionId/attach
{
  "hostId": "xxx"
}
```

---

## Quick Test Checklist

Run through this checklist to verify everything works:

- [ ] Backend server running (`npm run dev` in services/api)
- [ ] Web server running (`npm run dev` in apps/web)
- [ ] Create a session as host
- [ ] Attach a quiz template
- [ ] Start the quiz
- [ ] Player joins and answers question
- [ ] **Open Browser DevTools (F12) → Console tab**
- [ ] **Open Backend Console (terminal)**
- [ ] Click "Reveal Answer" as host
- [ ] **Backend Console:** See `[SessionGateway] Emitting score:animated...`
- [ ] **Browser Console:** See `[useSessionSync] Score animation event...`
- [ ] **Browser Console:** See `[useSessionSync] Triggering coin sound...`
- [ ] **Browser Console:** See `[SoundManager] Playing sound "coin"`
- [ ] **Browser Console:** See `[useSessionSync] Received session update`
- [ ] **UI:** Hear coin sound play
- [ ] **UI:** See score animation appear
- [ ] **UI:** See score numbers update in scoreboard

---

## Next Steps

1. **First**, follow Step 1 and Step 2 above
2. **Copy** the console output (both backend and frontend)
3. **Report** which logs you see and which are missing
4. Based on that, I can provide specific fixes

## Additional Enhancements (Optional)

### Add Correct Answer Sound to Player Panel

If you want the player panel to play a sound immediately for correct answers (separate from the score animation sound), add this to `PlayerQuizPanel.tsx`:

```typescript
// Replace lines 26-33 with:
useEffect(() => {
  if (!quiz || quiz.status !== 'revealed' || !submitted || selected == null) return;
  
  const isCorrect = quiz.correctOption === selected;
  if (isCorrect) {
    soundManager.playSound('coin'); // ✅ Added coin sound for correct
  } else {
    soundManager.playSound('coin_wrong');
  }
}, [quiz?.status, quiz?.correctOption, selected, submitted]);
```

This will give immediate audio feedback to the player before the score animation system triggers.
