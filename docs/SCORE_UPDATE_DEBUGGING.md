# Score Update Debugging Guide

## Date: October 15, 2025

## Issue
Scores are not updating in the player session view after host reveals answers.

## Expected Flow

### Backend (when answer is revealed)
1. `quiz.reveal()` calculates scores for all answers
2. Creates `Score` records in database (with `teamId`, `value`, `delta`)
3. Emits `score:animated` events for sounds/animations
4. Calls `emitSessionUpdate()` to notify clients

### Gateway (`emitSessionUpdate`)
1. Fetches latest session snapshot (includes `scores` array)
2. Emits `session:update` WebSocket event with snapshot

### Frontend (player view)
1. Receives `session:update` event via WebSocket
2. Updates Redux state with new snapshot
3. Calls `computeTeamScores()` to aggregate Score records into team totals
4. Re-renders scoreboard with updated totals

## Debugging Steps

### Step 1: Check Backend Logs (API Terminal)

**After revealing an answer, look for**:

```
[QuizService] Creating score record for PlayerName (team: team-id): delta=100, total=100, correct=true
[QuizService] Score record created: { id: 'xxx', teamId: 'xxx', value: 100, delta: 100, ... }
```

**What to verify**:
- ✅ Score records are being created
- ✅ `teamId` is set (not null)
- ✅ `value` matches expected total
- ✅ `delta` matches points earned (100 for correct, 0 for wrong)

**If you DON'T see these logs**:
- Participant might not be assigned to a team
- Scoring calculation might be failing
- Check for errors in quiz.service.ts

---

### Step 2: Check Session Update Emission

**Look for**:

```
[SessionGateway] Emitting session:update to room: session:xxx
[SessionGateway] Snapshot has X score records for Y teams
```

**What to verify**:
- ✅ `session:update` is being emitted
- ✅ Score records count > 0
- ✅ Teams count matches expected

**If score records count is 0**:
- Scores might not be saved to database
- Check database directly: `SELECT * FROM "Score" WHERE "sessionId" = 'xxx'`

---

### Step 3: Check Frontend WebSocket (Browser Console)

**Look for**:

```
[SessionSocket] Received session:update event: { id: 'xxx', teams: [...], scores: [...] }
[useSessionSync] Received session update
```

**What to verify**:
- ✅ Frontend is receiving the event
- ✅ `scores` array exists in payload
- ✅ `scores` array has items

**If you DON'T see these logs**:
- WebSocket might not be connected
- Check connection state: Look for "Connected to WebSocket server"
- Participant might not be subscribed to session updates

---

### Step 4: Check Score Computation (Browser Console)

**Look for**:

```
[PlayerLobby] Session has X score records
[PlayerLobby] Computed team scores: [{ team: {...}, total: 100, streak: 1 }, ...]
```

**What to verify**:
- ✅ `scores` array is being passed to `computeTeamScores()`
- ✅ Computed totals match expected values
- ✅ Each team has a score entry

**If totals are 0**:
- Check `score.delta` values in the array
- Check `score.teamId` matches team IDs
- Verify `score.value` is set correctly

---

### Step 5: Check UI Rendering

**Inspect the scoreboard element**:

```html
<span id="team-score-team-id">0</span>
```

**What to check**:
- ✅ Span exists for each team
- ✅ Text content updates when scores change
- ✅ No React rendering errors in console

**If UI doesn't update**:
- Check if `scores` array is in Redux state
- Open Redux DevTools → Check `state.session.current.scores`
- Verify component re-renders when state changes

---

## Common Issues & Solutions

### Issue 1: Participant Not Assigned to Team

**Symptom**: Score records are NOT created (no logs in Step 1)

**Check**:
```sql
SELECT id, "displayName", "teamId" 
FROM "Participant" 
WHERE "sessionId" = 'your-session-id'
```

**Fix**: Assign participants to teams before starting quiz

---

### Issue 2: Score Records Have NULL teamId

**Symptom**: Score records created but `teamId` is null

**Check backend logs**:
```
Creating score record for PlayerName (team: null): ...
```

**Fix**: 
- Ensure participants are assigned to teams
- Check `participantMap` in quiz.service.ts includes `teamId`

---

### Issue 3: WebSocket Not Connected

**Symptom**: No `session:update` received in frontend

**Check browser console**:
```
[WebSocketProvider] Connection state changed: disconnected
```

**Fix**:
- Check API server is running on correct port
- Check `config.json` has correct WebSocket URL
- Try manual reconnect: Look for "Reconnect" UI or refresh page

---

### Issue 4: Redux State Not Updating

**Symptom**: `session:update` received but scores don't render

**Check Redux DevTools**:
1. Open Redux DevTools
2. Look for `session/setSnapshot` action
3. Check `state.session.current.scores` array

**Fix**:
- If action isn't dispatched: Check `useSessionSync` hook
- If scores array is empty: Backend issue (go to Step 1)
- If scores exist but UI doesn't update: React rendering issue

---

### Issue 5: computeTeamScores Returns 0

**Symptom**: Scores in Redux but computed totals are 0

**Check console log output**:
```javascript
[PlayerLobby] Session has 3 score records
[PlayerLobby] Computed team scores: [{ team: {...}, total: 0, streak: 0 }]
```

**Debug in browser console**:
```javascript
// Get session from Redux
const session = window.store.getState().session.current;

// Check scores
console.log('Scores:', session.scores);

// Manually compute
import { computeTeamScores } from '@pkg/core';
const totals = computeTeamScores(session);
console.log('Totals:', totals);
```

**Possible causes**:
- `score.delta` values are all 0
- `score.teamId` doesn't match any team.id
- `score.value` is incorrect

---

## Manual Testing Checklist

### Test Setup
1. ✅ Create session with at least 2 teams
2. ✅ Add at least 2 players
3. ✅ Assign players to different teams
4. ✅ Verify assignments before starting quiz

### Test Quiz Flow
1. ✅ Host starts question
2. ✅ Player 1 answers correctly
3. ✅ Player 2 answers incorrectly
4. ✅ Host clicks "Reveal Answer"
5. ✅ Check backend logs for score creation
6. ✅ Check frontend logs for session update
7. ✅ Check player screens for updated scores

### Expected Results
- ✅ Player 1's team score increases by 100
- ✅ Player 2's team score increases by 0 (or stays same)
- ✅ Scores visible on both host and player screens
- ✅ Scoreboard updates without manual refresh
- ✅ Sounds play (coin for correct, coin_wrong for wrong)

---

## Quick Diagnostic Commands

### Check Database Scores
```sql
-- All scores for a session
SELECT s.id, s."teamId", t.name as team_name, s.value, s.delta, s.reason, s."recordedAt"
FROM "Score" s
LEFT JOIN "Team" t ON s."teamId" = t.id
WHERE s."sessionId" = 'YOUR_SESSION_ID'
ORDER BY s."recordedAt" DESC;

-- Team totals (manual aggregation)
SELECT s."teamId", t.name, SUM(s.delta) as total_points, COUNT(*) as score_count
FROM "Score" s
LEFT JOIN "Team" t ON s."teamId" = t.id
WHERE s."sessionId" = 'YOUR_SESSION_ID'
GROUP BY s."teamId", t.name;
```

### Check Participant Team Assignments
```sql
SELECT p.id, p."displayName", p."teamId", t.name as team_name
FROM "Participant" p
LEFT JOIN "Team" t ON p."teamId" = t.id
WHERE p."sessionId" = 'YOUR_SESSION_ID';
```

---

## Files to Check

### Backend
- `services/api/src/services/quiz.service.ts` - Score creation logic
- `services/api/src/gateways/session.gateway.ts` - WebSocket emission
- `services/api/src/services/sessions.service.ts` - getSnapshot()

### Frontend
- `apps/web/src/hooks/useSessionSync.ts` - WebSocket listener
- `apps/web/src/screens/PlayerLobby.tsx` - Score display
- `packages/core/src/score.ts` - computeTeamScores()
- `packages/core/src/socket/sessionSocket.ts` - WebSocket handler

---

## Still Not Working?

### Enable Maximum Logging

**Backend** (`services/api/src/main.ts`):
Add to bootstrap():
```typescript
app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
```

**Frontend**:
Add to top of PlayerLobby.tsx:
```typescript
useEffect(() => {
  console.log('[PlayerLobby] Full session state:', session);
  console.log('[PlayerLobby] Scores array:', session?.scores);
  console.log('[PlayerLobby] Teams:', session?.teams);
}, [session]);
```

### Capture WebSocket Traffic
1. Open Browser DevTools → Network tab
2. Filter: WS (WebSockets)
3. Find the socket connection
4. Click on it → Messages tab
5. Look for `session:update` messages
6. Verify payload has `scores` array

### Test with Minimal Setup
1. Create new session
2. Add 1 team with 1 player
3. Start question
4. Player answers
5. Reveal answer
6. Check if score updates

If this works, the issue is with multi-team or multi-player scenarios.

---

## Next Steps After Fixing

Once scores are updating correctly:
1. Test with multiple teams
2. Test with multiple players per team
3. Test score animations
4. Test sounds (coin/coin_wrong)
5. Test through multiple rounds
6. Test auto-advance with scoring

---

## Related Documents
- `docs/SCORE_ANIMATION_FIX.md` - Score animation and sound fixes
- `docs/SCORE_SOUND_DEBUGGING.md` - Original debugging guide
- `packages/core/src/score.ts` - Score computation logic
