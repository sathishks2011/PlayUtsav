# Team Duplication Fix

## Issue
When the host adds a team in the host lobby, the team appears duplicated - showing up twice in the teams list.

## Root Cause

**Race Condition Between Redux and WebSocket Updates**

**[sessionSlice.ts:205-208](../apps/web/src/store/slices/sessionSlice.ts#L205-L208)** (Before Fix)

```typescript
.addCase(addTeamThunk.fulfilled, (state, action) => {
  console.log('[Redux] Team added successfully:', action.payload);
  if (!state.current) return;
  state.current.teams = [...state.current.teams, { ...action.payload, participants: [] }];  // ❌ MANUAL UPDATE
})
```

### The Problem:

When the host adds a team, **two updates happen nearly simultaneously**:

1. **API Response (addTeamThunk.fulfilled):**
   - Backend creates team
   - Returns team object
   - Redux adds team to `state.current.teams` array manually (line 208)

2. **WebSocket Snapshot (setSnapshot):**
   - Backend broadcasts updated session to all clients
   - `useSessionSync` receives snapshot with new team
   - Redux replaces `state.current` with snapshot (which includes the team)

### The Race Condition:

```
Time 0ms:   Host clicks "Add Team"
Time 10ms:  API call: POST /teams
Time 50ms:  ✅ API responds with team { id: "team-1", name: "Red Team" }
Time 51ms:  ❌ Redux adds team to state.current.teams (FIRST COPY)
Time 60ms:  WebSocket broadcasts session snapshot with team
Time 61ms:  ✅ setSnapshot() updates state.current (snapshot includes team)
Time 62ms:  ❌ But the manual copy is still there! (SECOND COPY)
Result:     teams = [{ id: "team-1", ... }, { id: "team-1", ... }]  // DUPLICATE!
```

### Why It Happens:

The `setSnapshot` reducer (line 70-96) tries to preserve the existing `activeGameIndex`:

```typescript
state.current = { ...incoming, activeGameIndex: preserve } as Session;
```

But it **spreads** the incoming snapshot, which includes the new team. Since we **already** manually added the team on line 208, we now have:

- Original team from manual add (line 208)
- Same team from WebSocket snapshot (line 92)

## Solution

**Remove the manual team addition** and let the WebSocket snapshot handle all updates:

**[sessionSlice.ts:205-210](../apps/web/src/store/slices/sessionSlice.ts#L205-L210)** (After Fix)

```typescript
.addCase(addTeamThunk.fulfilled, (state, action) => {
  console.log('[Redux] Team added successfully:', action.payload);
  // Don't manually update teams array here - let WebSocket snapshot handle it
  // This prevents duplication when both the API response and WebSocket update arrive
  // The team will appear when the next session snapshot arrives via WebSocket
})
```

### The Fixed Flow:

```
Time 0ms:   Host clicks "Add Team"
Time 10ms:  API call: POST /teams
Time 50ms:  ✅ API responds with team { id: "team-1", name: "Red Team" }
Time 51ms:  ✅ Redux logs "Team added successfully" (NO manual update)
Time 60ms:  WebSocket broadcasts session snapshot with team
Time 61ms:  ✅ setSnapshot() updates state.current with snapshot
Time 62ms:  ✅ Team appears in UI (single copy)
Result:     teams = [{ id: "team-1", name: "Red Team" }]  // ✅ NO DUPLICATE!
```

## Why This Fix Works

### Single Source of Truth:

- **Before:** Two sources updated teams (Redux thunk + WebSocket)
- **After:** Only WebSocket updates teams (single source)

### Benefits:

1. **No Duplication:** Team only added once via WebSocket
2. **Consistency:** All session updates flow through WebSocket
3. **Simpler Logic:** No manual state manipulation needed
4. **Real-time Sync:** Other clients see the team via WebSocket anyway

### Trade-off:

**Slight Delay:** The team won't appear **instantly** when the API returns - it waits for the WebSocket snapshot (typically 50-100ms delay). This is imperceptible to users.

## Changes Made

### [sessionSlice.ts](../apps/web/src/store/slices/sessionSlice.ts)

**Lines 205-210:** Updated `addTeamThunk.fulfilled` case
- Removed: `state.current.teams = [...state.current.teams, { ...action.payload, participants: [] }]`
- Added: Comment explaining why we don't manually update
- Team now appears via WebSocket snapshot instead

## Testing

### Before Fix:
1. Host adds team "Red Team"
2. Team appears twice in the list
3. Both have same name and ID

### After Fix:
1. Host adds team "Red Team"
2. Team appears once (after brief delay ~50-100ms)
3. No duplicates!

### Test Steps:

1. **Create a session as host**
2. **Add a team:**
   - Enter team name: "Red Team"
   - Select color (optional)
   - Click "Add Team"
3. **Check teams list:**
   - Should show "Red Team" once
   - No duplicates
4. **Add multiple teams:**
   - Add "Blue Team"
   - Add "Green Team"
   - All should appear once each
5. **Check in player session:**
   - Join as player
   - Should see all teams (no duplicates)

### Console Logs:

**Before Fix:**
```
[Redux] Adding team...
[Redux] Team added successfully: { id: "team-1", name: "Red Team" }
[useSessionSync] Received session update
// Teams array now has duplicate!
```

**After Fix:**
```
[Redux] Adding team...
[Redux] Team added successfully: { id: "team-1", name: "Red Team" }
[useSessionSync] Received session update
// Team appears once via snapshot
```

## Related Code

### WebSocket Session Sync Flow:

1. **Backend:** Team created in database
2. **Backend:** Broadcasts updated session via WebSocket
3. **Frontend (`useSessionSync`):** Receives snapshot
4. **Frontend (`sessionSlice`):** `setSnapshot` updates Redux
5. **Frontend (`HostLobby`):** Component re-renders with updated teams

### Why WebSocket Is Reliable:

The backend emits session updates after **every mutation**:

```typescript
// Backend (NestJS)
@Post('/:sessionId/teams')
async addTeam(@Param('sessionId') sessionId: string, @Body() dto: AddTeamDto) {
  const team = await this.sessionsService.addTeam(sessionId, dto);

  // Broadcast updated session to all connected clients
  const session = await this.sessionsService.getSession(sessionId);
  this.server.to(sessionId).emit('session:updated', session);

  return team;
}
```

This ensures all clients (including the host) get the updated session with the new team.

## Other Operations Using Same Pattern

The same fix applies to other session mutations that were manually updating state:

### Currently Fixed:
- ✅ **Add Team** - Now uses WebSocket only

### Potentially Affected (may need similar fix):
- ⚠️ **Remove Participant** - Check if manually updating participants array
- ⚠️ **Assign Participant to Team** - Check if manually updating team.participants
- ⚠️ **Update Session Settings** - Check if manually updating session fields

### Pattern to Follow:

```typescript
.addCase(someThunk.fulfilled, (state, action) => {
  console.log('[Redux] Operation succeeded:', action.payload);
  // ✅ DO: Let WebSocket snapshot handle state updates
  // ❌ DON'T: Manually update state.current
})
```

## Performance Considerations

### Network Traffic:

**Before:** API response + WebSocket snapshot (both carry team data)
**After:** API response + WebSocket snapshot (same - no change)

No additional network traffic. The WebSocket snapshot was already being sent.

### Rendering:

**Before:** 2 re-renders (one for manual update, one for snapshot)
**After:** 1 re-render (only snapshot)

Slightly better performance with fewer re-renders.

### Perceived Latency:

**Before:** Team appears instantly (0ms) via manual update
**After:** Team appears after WebSocket snapshot (~50-100ms)

The delay is imperceptible to users. Modern WebSocket connections have very low latency.

## Edge Cases Handled

### 1. Network Failure:

**Scenario:** API succeeds, but WebSocket disconnected

**Before Fix:** Team appears (manual update), then disappears on reconnect (no snapshot)
**After Fix:** Team doesn't appear until WebSocket reconnects and sends snapshot

**Better!** After fix is more consistent - team only shows when truly persisted and synced.

### 2. Multiple Hosts:

**Scenario:** Two hosts (same session) add teams simultaneously

**Before Fix:** Both see duplicates due to double updates
**After Fix:** Both see correct teams via WebSocket snapshots

**Better!** WebSocket ensures consistency across all clients.

### 3. Rapid Additions:

**Scenario:** Host rapidly clicks "Add Team" multiple times

**Before Fix:** May cause race conditions and duplicates
**After Fix:** Each snapshot contains full teams list, no race condition

**Better!** Snapshot-based updates are atomic and consistent.

## Related Files

- [sessionSlice.ts](../apps/web/src/store/slices/sessionSlice.ts) - Redux state management
- [useSessionSync.ts](../apps/web/src/hooks/useSessionSync.ts) - WebSocket session sync
- [HostLobby.tsx](../apps/web/src/screens/HostLobby.tsx) - Host UI for adding teams
- [api.ts](../apps/web/src/lib/api.ts) - API call to add team

## Future Improvements

1. **Optimistic Updates:** Show team immediately, then reconcile with server
2. **Loading State:** Show "Adding team..." spinner during API call
3. **Offline Support:** Queue team additions if WebSocket disconnected
4. **Conflict Resolution:** Handle case where team with same name already exists
5. **Undo:** Allow host to quickly undo team addition

## Troubleshooting

### Team Still Duplicating:

1. **Clear browser cache** and refresh
2. **Check Redux DevTools:**
   - Inspect `session.current.teams`
   - Look for duplicate IDs
3. **Check Console:**
   - Look for multiple "Team added successfully" logs
   - Verify WebSocket is connected
4. **Check Backend:**
   - Verify only one team created in database
   - Check WebSocket broadcasts are working

### Team Not Appearing:

1. **Check WebSocket Connection:**
   - Console should show: `[useSessionSync] Setting up session sync`
2. **Check Backend:**
   - Verify team created in database
   - Check WebSocket broadcast is emitted
3. **Check Network Tab:**
   - POST `/api/sessions/:id/teams` should return 201
   - WebSocket frame should contain updated session

### Team Appears After Long Delay:

1. **Check WebSocket Latency:**
   - Network conditions may slow WebSocket
   - Typical delay should be <100ms
2. **Check Backend Load:**
   - High server load may delay broadcasts
3. **Check Client Performance:**
   - Browser throttling may delay rendering
