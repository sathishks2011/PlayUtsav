# Active Game Index Fix

## Problem
When switching from Quiz game to Bioscope game using the game control panel, the Bioscope game card would not show as active. Only the Quiz game remained active even after clicking on the Bioscope card.

## Root Cause
The `transformSession()` function in `api.ts` was always setting `activeGameIndex: 0`, which meant every WebSocket update that came in (e.g., when adding teams, assigning participants) would reset the active game index back to 0 (Quiz game).

**Flow of the bug:**
1. User clicks Bioscope game card → `setActiveGameIndex(1)` dispatched → Redux updated
2. WebSocket emits session update (e.g., participant joined)
3. `useSessionSync` receives update → calls `transformSession(snapshot)`
4. `transformSession` **always returns activeGameIndex: 0** ❌
5. `setSnapshot` updates Redux with activeGameIndex reset to 0
6. UI shows Quiz as active again, Bioscope shows as inactive

## Solution

### 1. Modified `transformSession()` to accept and preserve `activeGameIndex`
**File:** `apps/web/src/lib/api.ts`

```typescript
export function transformSession(backendSession: any, preserveActiveGameIndex?: number): Session {
  // ... game transformation logic ...
  
  // Preserve activeGameIndex if provided and valid, otherwise default to 0
  const activeGameIndex = preserveActiveGameIndex !== undefined && 
                          preserveActiveGameIndex >= 0 && 
                          preserveActiveGameIndex < games.length
    ? preserveActiveGameIndex
    : 0;
  
  return {
    ...backendSession,
    games,
    activeGameIndex, // Use preserved or default value
  };
}
```

### 2. Updated `useSessionSync` to pass current `activeGameIndex`
**File:** `apps/web/src/hooks/useSessionSync.ts`

```typescript
export function useSessionSync() {
  const sessionId = useAppSelector((s) => s.session.current?.id);
  const currentActiveGameIndex = useAppSelector((s) => s.session.current?.activeGameIndex);
  // ...
  
  socket.subscribe(sessionId, (snapshot) => {
    if (snapshot) {
      console.log('[useSessionSync] Received session update, preserving activeGameIndex:', currentActiveGameIndex);
      // Pass current activeGameIndex to preserve it across WebSocket updates
      const transformedSession = transformSession(snapshot, currentActiveGameIndex);
      dispatch(setSnapshot(transformedSession));
    }
  });
}
```

### 3. Simplified `setSnapshot` reducer
**File:** `apps/web/src/store/slices/sessionSlice.ts`

Removed redundant preservation logic since `transformSession` now handles it:

```typescript
setSnapshot(state, action: PayloadAction<Session>) {
  // transformSession already preserves activeGameIndex, so just update the state
  state.current = action.payload;
  state.status = 'ready';
},
```

## Fixed Flow

1. User clicks Bioscope game card → `setActiveGameIndex(1)` dispatched → Redux updated with `activeGameIndex: 1`
2. WebSocket emits session update
3. `useSessionSync` receives update → reads `currentActiveGameIndex = 1` from Redux
4. Calls `transformSession(snapshot, 1)` → **preserves activeGameIndex: 1** ✅
5. `setSnapshot` updates Redux with activeGameIndex still at 1
6. UI correctly shows Bioscope as active

## Testing

1. Create a multi-game session (Quiz + Bioscope)
2. Click on Bioscope game card in the control panel
3. Verify Bioscope card shows "Active" badge and is no longer dimmed
4. Add a team or assign a participant (triggers WebSocket update)
5. Verify Bioscope remains active after the WebSocket update
6. Click on Quiz card to switch back
7. Verify Quiz becomes active and Bioscope becomes inactive

## Impact

- ✅ Game switching now works correctly
- ✅ Active game index persists across WebSocket updates
- ✅ No breaking changes to existing functionality
- ✅ Works for both host and player views
