# Buzzer Override (Allow Button) Debug Guide

## Issue
Host doesn't see green indication after clicking "Allow" button on a buzzer press.

## Expected Behavior
When host clicks "Allow" button next to a player who pressed the buzzer:
1. Button text changes from "Allow" to "Selected" (green styling)
2. Green badge "Answering" appears next to player's name
3. That player's quiz panel becomes enabled

## Debug Checklist

### 1. Check Browser Console for Errors
Open DevTools (F12) and look for:
- Network errors on POST `/sessions/:id/quiz/buzzer/override`
- WebSocket errors
- Redux state update errors

### 2. Verify Backend Response
When "Allow" button is clicked:
```
POST /sessions/:sessionId/quiz/buzzer/override
Body: { participantId: "xxx" }

Expected Response:
{
  buzzerState: {
    lockedForParticipantId: "xxx",  // Should be the participant you allowed
    ...
  }
}
```

### 3. Check WebSocket Events
In browser console, you should see two events emitted:
- `quiz:update` - General quiz state update
- `buzzer:override` - Specific buzzer override event

### 4. Verify Redux State
Add this in browser console to check state after clicking "Allow":
```javascript
// In browser DevTools console
window.store = window.store || {}; // Access Redux store
// Then check: quiz.current.buzzerState.lockedForParticipantId
```

### 5. Check Socket Listener
The `useBuzzerSync` hook should be subscribed to `buzzer:override` event.
Look for: `socket.onBuzzerOverride(sessionId, callback)`

## Testing Steps

1. **Create BUZZER session** as host
2. **Join as 2 players** in different browser tabs
3. **Host starts a quiz**
4. **Host opens buzzer**
5. **Player 1 presses buzzer**
6. **Host clicks "Allow" on Player 1**
7. **Check Host Page**:
   - Does "Allow" button change to "Selected"?
   - Is it styled with green color?
   - Does green badge "Answering" appear next to name?
8. **Check Player 1 Page**:
   - Does green banner appear?
   - Are radio buttons enabled?
9. **Check Player 2 Page**:
   - Does amber "locked" banner appear?
   - Are radio buttons disabled?

## Common Issues

### Issue 1: Button Doesn't Change
**Symptom**: "Allow" button stays the same after clicking
**Cause**: `lockedForParticipantId` not updating in Redux state
**Fix**: Check that `buzzerOverride` reducer is being called

### Issue 2: No Visual Change At All
**Symptom**: Nothing happens when clicking "Allow"
**Cause**: Socket event not received or Redux not subscribed
**Fix**: Verify `useBuzzerSync` is called in the component tree

### Issue 3: Works on Second Click
**Symptom**: First click does nothing, second click works
**Cause**: Race condition or stale state
**Fix**: Check that quiz state is properly initialized

## Code Verification

### HostBuzzerControls.tsx Line 164
```tsx
const locked = lockedParticipantId === press.participantId;
```
This should be TRUE for the player who was allowed.

### HostBuzzerControls.tsx Line 177
```tsx
{locked && (
  <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
    <FormattedMessage id="hostBuzzer.badges.answering" defaultMessage="Answering" />
  </span>
)}
```
This should show the green "Answering" badge.

### HostBuzzerControls.tsx Line 204-208
```tsx
className={`rounded border px-3 py-1 text-xs font-semibold hover:bg-white/10 ${
  locked
    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
    : 'border-white/20 text-white/80'
}`}
```
Button should have green styling when `locked` is true.

## Manual Test in Browser Console

```javascript
// Check if quiz state has buzzer data
const quiz = window.store.getState().quiz.current;
console.log('Buzzer State:', quiz?.buzzerState);
console.log('Locked Participant:', quiz?.buzzerState?.lockedForParticipantId);
console.log('Buzz Presses:', quiz?.buzzerState?.buzzPresses);
```

## If Still Not Working

1. **Hard refresh** both host and player pages (Ctrl+Shift+R)
2. **Check API server logs** - should show POST to `/buzzer/override`
3. **Try closing and reopening buzzer** - reset the state
4. **Create a new session** - might be stale data

## Socket Event Debugging

Add temporary logging to `useBuzzerSync.ts`:
```typescript
socket.onBuzzerOverride(sessionId, (event) => {
  console.log('🟢 BUZZER OVERRIDE EVENT:', event);
  dispatch(buzzerOverride({
    sessionId: event.sessionId,
    lockedForParticipantId: event.buzzerState.lockedForParticipantId,
  }));
});
```
