# Host Session Refresh Fix

## Problem
When a host refreshed the browser page, they would be logged out and lose their session. This happened because:
1. Redux store gets cleared on page refresh (all state is lost)
2. While the JWT authentication cookie persists (user stays logged in)
3. The host session data (which session they were managing) was only in Redux
4. No mechanism existed to restore the host session after refresh

## Solution
Implemented host session persistence using `localStorage`, similar to the existing player session restore mechanism.

### Changes Made

#### 1. Created `useHostSessionRestore.ts` Hook
**File**: `apps/web/src/hooks/useHostSessionRestore.ts`

- Stores host session ID in `localStorage` when a session is created/joined
- On app load, checks if user is authenticated
- If authenticated and no session loaded, attempts to restore from `localStorage`
- Fetches fresh session data from server using session ID
- Restores session in Redux if found
- Cleans up stale sessions (>24 hours old)
- Removes invalid/expired sessions from `localStorage`

#### 2. Added `getSessionById` API Function
**File**: `apps/web/src/lib/api.ts`

```typescript
export function getSessionById(sessionId: string): Promise<Session> {
  return request(`/sessions/${sessionId}`);
}
```

This allows the frontend to fetch a specific session by ID to restore it.

#### 3. Updated Redux Session Slice
**File**: `apps/web/src/store/slices/sessionSlice.ts`

**Modified `setHostSession` reducer**:
```typescript
setHostSession(state, action: PayloadAction<Session>) {
  state.current = action.payload;
  state.role = 'HOST';
  state.status = 'ready';
  
  // Persist host session to localStorage for refresh recovery
  localStorage.setItem('hostSession', JSON.stringify({
    sessionId: action.payload.id,
    timestamp: Date.now()
  }));
}
```

**Modified `createSessionThunk.fulfilled`**:
Added same localStorage persistence when creating a new session.

**Modified `reset` reducer**:
```typescript
reset: () => {
  // Clear both player and host sessions from localStorage
  localStorage.removeItem('playerSession');
  localStorage.removeItem('hostSession');
  return initialState;
}
```

4. **Integrated Hook in App Component**
**File**: `apps/web/src/App.tsx`

```typescript
import { useState, useEffect } from 'react'; // Added useEffect
import { useHostSessionRestore } from './hooks/useHostSessionRestore';

// In AppContent component:
usePlayerSessionRestore();
useHostSessionRestore(); // ← Added this

// Auto-navigate authenticated hosts to dashboard (when no active session)
useEffect(() => {
  if (isAuthenticated && user?.role === 'HOST' && role !== 'HOST' && view !== 'host-dashboard') {
    setView('host-dashboard');
  }
}, [isAuthenticated, user?.role, role, view]);

// Reset view to landing when user logs out or session is reset
useEffect(() => {
  if (!isAuthenticated && role === null && view !== 'landing') {
    setView('landing');
  }
}, [isAuthenticated, role, view]);
```

5. **Enhanced Auth Slice for Cleanup**
**File**: `apps/web/src/store/slices/authSlice.ts`

- `logoutThunk.fulfilled`: Clears hostSession from localStorage
- `getProfileThunk.rejected`: Clears hostSession when JWT is invalid/expired

## How It Works

### When Host Creates/Joins Session
1. Session is created via Redux thunk (`createSessionThunk`)
2. Session data is stored in Redux state
3. **NEW**: Session ID + timestamp saved to `localStorage` as `hostSession`

### When Host Refreshes Page
1. Redux store is cleared (all state lost)
2. `useAuth` hook checks authentication (JWT cookie still valid)
3. User remains logged in ✅
4. **NEW**: `useHostSessionRestore` hook runs:
   - Checks if user is authenticated
   - Reads `hostSession` from `localStorage`
   - Validates session isn't stale (>24h)
   - Fetches fresh session data from server
   - Restores session in Redux
   - Host sees their session automatically! 🎉

### When Host Leaves Session
1. `resetSession()` is called
2. Redux state is cleared
3. **NEW**: Both `playerSession` and `hostSession` removed from `localStorage`

## Benefits

✅ **Seamless Experience**: Hosts can refresh without losing their session
✅ **Secure**: Still uses JWT cookie for authentication
✅ **Fresh Data**: Always fetches latest session state from server
✅ **Automatic Cleanup**: Removes stale sessions (>24h)
✅ **Consistent**: Mirrors existing player session restore behavior
✅ **No Breaking Changes**: Existing flows continue to work

## Testing

### Test Case 1: Create Session & Refresh
1. Login as host
2. Create a new session
3. Add teams, players
4. **Refresh the page (F5)**
5. ✅ Expected: Host session restored, all data visible

### Test Case 2: Join Existing Session & Refresh
1. Login as host
2. Go to dashboard
3. Click "Resume" on an existing session
4. **Refresh the page (F5)**
5. ✅ Expected: Host session restored

### Test Case 3: Leave Session
1. In a host session
2. Click "← Dashboard" button
3. Check `localStorage`
4. ✅ Expected: `hostSession` key removed

### Test Case 4: Stale Session Cleanup
1. Manually set an old timestamp in localStorage:
   ```javascript
   localStorage.setItem('hostSession', JSON.stringify({
     sessionId: 'some-id',
     timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
   }))
   ```
2. Refresh page
3. ✅ Expected: Old session ignored, localStorage cleared

## Storage Schema

### Player Session (Existing)
```typescript
{
  sessionId: string;
  participantId: string;
  displayName: string;
  timestamp: number;
}
```

### Host Session (New)
```typescript
{
  sessionId: string;
  timestamp: number;
}
```

Note: Host sessions only store the session ID (not full session data) because:
- Session data can be large and change frequently
- Always fetch fresh data from server to ensure consistency
- JWT cookie handles authentication identity

## Edge Cases Handled

1. **Session deleted on server**: Restore attempt fails gracefully, localStorage cleared
2. **Invalid/corrupted localStorage data**: Caught by try-catch, localStorage cleared
3. **User not authenticated**: hostSession cleared from localStorage immediately
4. **Session already loaded**: Restore skipped
5. **Network error**: Error logged, localStorage cleared
6. **User logs out**: hostSession cleared from localStorage
7. **Profile fetch fails**: hostSession cleared (expired/invalid JWT)
8. **View state conflicts**: useEffect properly manages view transitions
9. **Sign-in button flicker**: Fixed wrong component rendering after login

## Additional Bug Fix: Sign-In Button Flickering

### Problem
After clicking sign-in, the screen would flicker and not navigate to the dashboard.

**Root Cause**: Line 97 in `App.tsx` was rendering the wrong component:
```typescript
// WRONG - Tried to render HostPortal without an active session
{role === null && view === 'host-dashboard' && isAuthenticated && <HostPortal />}
```

`<HostPortal />` is only for managing active sessions (when `role === 'HOST'`). After login, the user has no active session yet, so they should see the dashboard to create/join sessions.

### Solution
Changed to render `<HostDashboard />` instead:
```typescript
// CORRECT - Show dashboard where hosts can create/join sessions
{role === null && view === 'host-dashboard' && isAuthenticated && <HostDashboard />}
```

### Flow After Fix
1. User clicks "Sign In" ✅
2. Login succeeds → `isAuthenticated: true` ✅
3. useEffect sets view to 'host-dashboard' ✅
4. Renders `<HostDashboard />` (list of sessions) ✅
5. User can create new session or resume existing one ✅

## Future Enhancements

- [ ] Add retry logic for network failures
- [ ] Show loading indicator during restore
- [ ] Add session expiry warning (before 24h limit)
- [ ] Support multiple host sessions (tab management)
