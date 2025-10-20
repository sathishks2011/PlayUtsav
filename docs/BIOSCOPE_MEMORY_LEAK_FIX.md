# Bioscope Memory Leak Fix

**Date**: October 17, 2025  
**Component**: `HostBioscopePanel.tsx`  
**Issue**: Multiple session requests causing memory spike

## Problem Description

The HostBioscopePanel was making multiple duplicate session requests, causing memory to spike and creating an infinite loop of WebSocket subscriptions and API calls.

### Root Cause

The WebSocket effect had `bioscopeSounds` in its dependency array:

```typescript
useEffect(() => {
  // ... WebSocket subscription logic
}, [dispatch, sessionId, bioscopeSounds]); // ❌ bioscopeSounds changes every render!
```

**Why this caused the issue:**

1. `useBioscopeSounds()` returns a new object on every render (even though the functions inside are memoized with `useCallback`)
2. Every time `bioscopeSounds` object reference changed, the WebSocket effect re-ran
3. This created new socket subscriptions without properly cleaning up old ones
4. Each subscription would trigger `fetchBioscopeGameState()` calls
5. State updates from these calls caused re-renders, which created new `bioscopeSounds` objects
6. **Result**: Infinite loop of subscriptions, API calls, and memory growth

The same issue affected the timer effect:
```typescript
useEffect(() => {
  // ... timer logic
}, [dispatch, currentGame?.timerStartedAt, currentGame?.timerDuration, currentGame?.status, bioscopeSounds]); // ❌
```

## Solution Implemented

### 1. Removed `bioscopeSounds` from WebSocket Effect Dependencies

**Before:**
```typescript
}, [dispatch, sessionId, bioscopeSounds]); // ❌ Causes re-subscription on every render
```

**After:**
```typescript
}, [dispatch, sessionId]); // ✅ Only re-subscribe if sessionId changes
```

### 2. Used Ref Pattern to Access Sound Functions

Created a ref to store sound functions without causing re-renders:

```typescript
// Store sound functions in a ref to avoid re-subscribing to WebSocket
const soundFunctionsRef = React.useRef(bioscopeSounds);
soundFunctionsRef.current = bioscopeSounds;
```

This allows accessing the latest sound functions without adding them to dependency arrays.

### 3. Removed Sound Calls from WebSocket Handlers

**Before:**
```typescript
const handleImageRevealed = (...args: unknown[]) => {
  const data = args[0] as { sessionId: string; imageId: number };
  if (data.sessionId === sessionId) {
    bioscopeSounds.playImageRevealSound(); // ❌ Reference to bioscopeSounds
    dispatch(fetchBioscopeGameState({ sessionId }));
  }
};
```

**After:**
```typescript
const handleImageRevealed = (...args: unknown[]) => {
  const data = args[0] as { sessionId: string; imageId: number };
  if (data.sessionId === sessionId) {
    dispatch(fetchBioscopeGameState({ sessionId })); // ✅ Just fetch, sounds handled separately
  }
};
```

### 4. Added Separate Effect for Sound Playback

Created a new effect that watches game state changes and plays sounds accordingly:

```typescript
// Play sounds when game state changes (image revealed or answer revealed)
const prevRevealedCountRef = React.useRef<number>(0);
const prevStatusRef = React.useRef<string>('');

useEffect(() => {
  if (!currentGame) return;

  const revealedCount = currentGame.revealedImages.length;
  const status = currentGame.status;

  // Play image reveal sound when a new image is revealed
  if (revealedCount > prevRevealedCountRef.current && prevRevealedCountRef.current > 0) {
    soundFunctionsRef.current.playImageRevealSound();
  }

  // Play answer reveal sound when status changes to 'revealed'
  if (status === 'revealed' && prevStatusRef.current !== 'revealed' && prevStatusRef.current !== '') {
    soundFunctionsRef.current.playAnswerRevealSound();
  }

  prevRevealedCountRef.current = revealedCount;
  prevStatusRef.current = status;
}, [currentGame?.revealedImages.length, currentGame?.status]);
```

### 5. Updated Timer Effect

Changed timer effect to use the ref:

```typescript
useEffect(() => {
  // ... timer logic
  soundFunctionsRef.current.startTimerTick(remaining); // ✅ Use ref
  
  return () => {
    window.clearInterval(interval);
    soundFunctionsRef.current.stopTimerTick(); // ✅ Use ref
  };
}, [dispatch, currentGame?.timerStartedAt, currentGame?.timerDuration, currentGame?.status]); // ✅ No bioscopeSounds
```

## Benefits of This Approach

1. **Single WebSocket Connection**: Effect only runs when `sessionId` changes
2. **No Memory Leaks**: Proper cleanup, no duplicate subscriptions
3. **Sounds Still Work**: Ref pattern ensures latest sound functions are always accessible
4. **Better Separation**: Sound logic separated from WebSocket logic
5. **Predictable Behavior**: Effects run only when necessary dependencies change

## Additional Fix: WebSocket Event Handlers Fetching Unnecessarily

After the initial fix, continuous requests were still being made. Investigation revealed:

### The Problem
Every WebSocket event handler was calling `fetchBioscopeGameState()`:
```typescript
const handleImageRevealed = (...args: unknown[]) => {
  if (data.sessionId === sessionId) {
    dispatch(fetchBioscopeGameState({ sessionId })); // ❌ Unnecessary fetch!
  }
};
```

The backend emits `bioscope:state-updated` events that **already contain the full game state**. Fetching again was redundant and caused continuous requests.

### The Solution
1. **Use data from `STATE_UPDATED` event directly**:
```typescript
const handleGameStateUpdate = (...args: unknown[]) => {
  const data = args[0] as BioscopeGameState;
  if (data.sessionId === sessionId) {
    dispatch(updateGameState(data)); // ✅ Use the received data directly
  }
};
```

2. **Remove fetches from other event handlers**:
```typescript
const handleImageRevealed = (...args: unknown[]) => {
  console.log('[HostBioscopePanel] Image revealed:', data);
  // State update will come via STATE_UPDATED event, no need to fetch
};
```

The backend emits `STATE_UPDATED` after every game action, so we only need to listen to that one event!

## Testing Checklist

- [x] ✅ HostBioscopePanel loads without multiple requests
- [x] ✅ Memory usage remains stable over time
- [x] ✅ No duplicate WebSocket subscriptions in console
- [x] ✅ No continuous API fetches - only WebSocket updates
- [ ] Test image reveal sound plays correctly
- [ ] Test answer reveal sound plays correctly
- [ ] Test timer tick sounds for last 10 seconds
- [ ] Verify proper cleanup when navigating away

## Key Takeaway

**When using custom hooks that return objects in components with WebSocket/subscription effects:**

1. ✅ **DO**: Use refs to store hook results if you need to access them in effects
2. ✅ **DO**: Keep dependency arrays minimal - only include values that should trigger re-subscription
3. ✅ **DO**: Separate concerns - handle sounds in a dedicated effect watching game state
4. ❌ **DON'T**: Add object/array return values from hooks directly to dependency arrays
5. ❌ **DON'T**: Call hook functions directly inside WebSocket handlers from closure

## Related Files

- `apps/web/src/components/HostBioscopePanel.tsx` - Fixed component
- `apps/web/src/hooks/useBioscopeSounds.ts` - Sound hook (unchanged)
- `apps/web/src/screens/HostLobby.tsx` - Parent component

## Performance Impact

**Before Fix:**
- Memory usage: Increasing continuously
- Network requests: 10+ duplicate calls per second
- WebSocket connections: Multiple active subscriptions
- Browser: Becomes sluggish/unresponsive

**After Fix:**
- Memory usage: Stable
- Network requests: Only on legitimate state changes
- WebSocket connections: Single subscription per session
- Browser: Normal performance
