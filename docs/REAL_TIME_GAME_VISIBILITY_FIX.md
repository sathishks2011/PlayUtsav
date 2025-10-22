# Real-Time Game Visibility Fix

## Issue
When the host clicks "Start Quiz" or "Start Bioscope", the game should appear immediately in the player's session without requiring a page refresh. Currently, players need to refresh to see the started game.

## How It Should Work

### Expected Flow:
1. **Host clicks "Start Quiz"** button
2. Host emits WebSocket event: `session:game-started`
3. **Players receive event** via `useSessionSync`
4. **Player's Redux state updates** with quiz state
5. **PlayerLobby re-renders** automatically
6. **Game UI appears** for players immediately

## Current Implementation

The real-time game visibility feature is **already implemented** but relies on proper WebSocket synchronization. Here's how it works:

### 1. Host Emits Game Started Event

**[HostQuizPanel.tsx:307-316](../apps/web/src/components/HostQuizPanel.tsx#L307-L316)**

```typescript
const handleStart = () => {
  // Emit game-started event with activeGameIndex for players to sync
  import('../lib/socket').then(({ getSessionSocket }) => {
    getSessionSocket().then((socket: any) => {
      socket.socket?.emit('session:game-started', {
        sessionId: session.id,
        gameType: 'quiz',
        activeGameIndex: session.activeGameIndex
      });
      console.log('[HostQuizPanel] Emitted game-started event with activeGameIndex:', session.activeGameIndex);
    });
  });

  // Start the quiz
  dispatch(startQuizThunk({ ... }));
};
```

**[HostBioscopePanel.tsx:333-349](../apps/web/src/components/HostBioscopePanel.tsx#L333-L349)**

```typescript
const handleStartBioscope = () => {
  // Emit game-started event
  getSessionSocket().then((socket: any) => {
    socket.socket?.emit('session:game-started', {
      sessionId: session.id,
      gameType: 'bioscope',
      activeGameIndex: activeGameIndex
    });
    console.log('[HostBioscopePanel] Emitted game-started event');
  });

  // Start bioscope
  dispatch(startBioscope({ ... }));
};
```

### 2. Players Listen for Game Started Event

**[useSessionSync.ts:66-76](../apps/web/src/hooks/useSessionSync.ts#L66-L76)**

```typescript
// Listen for game-started events that include active game info
const handleGameStarted = (...args: unknown[]) => {
  const event = args[0] as { sessionId: string; gameType?: string; activeGameIndex?: number };
  console.log('[useSessionSync] Game started event:', event);

  // If the event includes activeGameIndex, update it for players
  if (role === 'PLAYER' && event.activeGameIndex !== undefined) {
    console.log('[useSessionSync] Player switching to active game:', event.activeGameIndex);
    dispatch(setActiveGameIndex(event.activeGameIndex));
  }
};

socket.on('session:game-started', handleGameStarted);
```

### 3. Quiz State Syncs via WebSocket

**[useQuizSync.ts:18-48](../apps/web/src/hooks/useQuizSync.ts#L18-L48)**

```typescript
useEffect(() => {
  console.log('[useQuizSync] Effect triggered:', {
    sessionId,
    hasQuizGame,
    quizGameTemplateId: quizGame?.templateId,
    socketConnected: isConnected
  });

  if (!hasQuizGame) {
    console.log('[useQuizSync] Session does not have a quiz game, skipping sync');
    return;
  }

  console.log('[useQuizSync] Setting up quiz sync for session:', sessionId);

  // Subscribe to quiz updates
  socket.onQuiz(sessionId, (state) => {
    console.log('[useQuizSync] Received quiz:update event:', state);
    dispatch(setQuizState(state));
  });

  // Fetch initial quiz state
  fetchQuiz(sessionId)
    .then((state) => {
      console.log('[useQuizSync] Fetched initial quiz state');
      dispatch(setQuizState(state));
    })
    .catch((err) => {
      console.warn('[useQuizSync] Unable to fetch quiz state:', err);
    });
}, [sessionId, hasQuizGame, socket, isConnected]);
```

### 4. Player Session Shows Game When State Updates

**[PlayerLobby.tsx:296-316](../apps/web/src/screens/PlayerLobby.tsx#L296-L316)**

```typescript
// Check if the game has actually been started by the host
let isGameStarted = false;
if (activeGame.type === 'quiz') {
  // Quiz is started when status is 'running' or 'revealed' (not 'idle')
  isGameStarted = quizState?.status === 'running' || quizState?.status === 'revealed';

  console.log('[PlayerLobby] Quiz game check:', {
    hasQuizState: !!quizState,
    quizStatus: quizState?.status,
    isGameStarted,
    sessionId: quizState?.sessionId,
    currentSessionId: session.id
  });
}

// Only show the game if it's been started
if (!isGameStarted) {
  return <div>Waiting for host to start the game...</div>;
}

// Game UI renders here!
return <QuizGameUI />;
```

## Debugging Logs Added

To help trace real-time update issues, I've added comprehensive console logging:

### useQuizSync Logs:
```javascript
[useQuizSync] Effect triggered: {
  sessionId: "abc123",
  hasSession: true,
  gamesCount: 2,
  hasQuizGame: true,
  quizGameTemplateId: "template-xyz",
  socketConnected: true
}
[useQuizSync] Setting up quiz sync for session: abc123
[useQuizSync] Received quiz:update event: { status: 'running', ... }
[useQuizSync] Fetched initial quiz state
```

### PlayerLobby Logs:
```javascript
[PlayerLobby] Quiz game check: {
  hasQuizState: true,
  quizStatus: "running",
  isGameStarted: true,
  sessionId: "abc123",
  currentSessionId: "abc123"
}
```

### useSessionSync Logs:
```javascript
[useSessionSync] Game started event: {
  sessionId: "abc123",
  gameType: "quiz",
  activeGameIndex: 0
}
[useSessionSync] Player switching to active game: 0
```

## Testing Real-Time Visibility

### Test Steps:

1. **Open Two Browser Windows:**
   - Window 1: Host session
   - Window 2: Player session

2. **Create Session as Host:**
   - Attach quiz or bioscope template
   - Note the session code

3. **Join as Player:**
   - Enter session code in Window 2
   - Should see: "Waiting for host to start the game..."

4. **Open Browser DevTools in Both Windows:**
   - Press F12
   - Go to Console tab

5. **Start Game as Host:**
   - In Window 1, click "Start Quiz" or "Start Bioscope"
   - Watch console in BOTH windows

6. **Expected Behavior:**

   **Host Console:**
   ```
   [HostQuizPanel] Emitted game-started event with activeGameIndex: 0
   [HostQuizPanel] Quiz game is active, loading questions...
   ```

   **Player Console:**
   ```
   [useSessionSync] Game started event: { sessionId: "...", gameType: "quiz", activeGameIndex: 0 }
   [useSessionSync] Player switching to active game: 0
   [useQuizSync] Received quiz:update event: { status: "running", ... }
   [PlayerLobby] Quiz game check: { hasQuizState: true, quizStatus: "running", isGameStarted: true }
   ```

   **Player Window:**
   - Game UI appears **immediately** without refresh!
   - Shows quiz question or bioscope images

## Common Issues and Solutions

### Issue: Player Sees "Waiting for host..." After Host Starts

**Symptoms:**
- Host clicks "Start", but player still sees waiting message
- No console logs in player window

**Debugging:**
1. **Check WebSocket Connection:**
   ```javascript
   // Look for this in player console
   [useSessionSync] Waiting for socket connection...
   [useQuizSync] Waiting for socket connection...
   ```
   - If present, WebSocket isn't connected
   - Check backend is running (port 3000)
   - Check for CORS errors

2. **Check Quiz Game Detection:**
   ```javascript
   [useQuizSync] Session does not have a quiz game, skipping sync
   ```
   - If present, quiz game not detected
   - Check `session.games` array in Redux DevTools
   - Verify quiz game has `templateId` field

3. **Check Event Emission:**
   - Look for in host console: `Emitted game-started event`
   - If missing, event not emitted
   - Check socket connection in host window

### Issue: Player Console Shows Logs But UI Doesn't Update

**Symptoms:**
- Console shows `[PlayerLobby] Quiz game check: { isGameStarted: true }`
- But UI still shows "Waiting for host..."

**Solution:**
- This is likely a React re-render issue
- Check if `quizState` is properly selected from Redux
- Verify component dependencies in useEffect

**Debugging:**
```javascript
// Add this to PlayerLobby
console.log('[PlayerLobby] Render triggered:', {
  activeGameType: activeGame?.type,
  quizStatus: quizState?.status,
  isGameStarted
});
```

### Issue: Game Appears But Wrong Game Shows

**Symptoms:**
- Host starts Quiz, but Player sees Bioscope
- Or vice versa

**Debugging:**
1. **Check activeGameIndex:**
   ```javascript
   // In Redux DevTools
   session.current.activeGameIndex  // Should match game position in session.games
   ```

2. **Check session.games array:**
   ```javascript
   session.current.games[0]  // { type: 'quiz', ... }
   session.current.games[1]  // { type: 'bioscope', ... }
   ```

3. **Verify event includes correct index:**
   ```javascript
   [useSessionSync] Game started event: { activeGameIndex: 0 }  // Should match intended game
   ```

## WebSocket Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       HOST CLICKS "START"                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │ handleStart() in HostQuizPanel.tsx          │
        │ - Emits: session:game-started               │
        │ - Dispatches: startQuizThunk                │
        └─────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌───────────────────────┐   ┌──────────────────────┐
    │ WebSocket Event       │   │ API: POST /quiz      │
    │ session:game-started  │   │ Creates quiz state   │
    └───────────────────────┘   └──────────────────────┘
                │                           │
                │                           ▼
                │               ┌──────────────────────┐
                │               │ WebSocket Event      │
                │               │ quiz:state-updated   │
                │               └──────────────────────┘
                │                           │
                └───────────┬───────────────┘
                            ▼
            ┌───────────────────────────────────┐
            │ PLAYER RECEIVES EVENTS            │
            │ (via useSessionSync & useQuizSync)│
            └───────────────────────────────────┘
                            │
                ┌───────────┴──────────┐
                ▼                      ▼
    ┌─────────────────────┐  ┌─────────────────────┐
    │ setActiveGameIndex  │  │ setQuizState        │
    │ (Switch to quiz)    │  │ (Quiz status: 'running') │
    └─────────────────────┘  └─────────────────────┘
                │                      │
                └──────────┬───────────┘
                           ▼
            ┌──────────────────────────┐
            │ PlayerLobby Re-renders   │
            │ isGameStarted = true     │
            │ QUIZ UI APPEARS! 🎉      │
            └──────────────────────────┘
```

## Files Modified

### [useQuizSync.ts](../apps/web/src/hooks/useQuizSync.ts)
- **Lines 12-13:** Fixed quiz game detection to use `session.games[]`
- **Lines 19-26:** Added detailed logging for debugging

### [PlayerLobby.tsx](../apps/web/src/screens/PlayerLobby.tsx)
- **Lines 301-307:** Added quiz state logging
- **Lines 311-315:** Added bioscope state logging

## Benefits

1. **Instant Game Start:** Players see game immediately when host starts
2. **No Refresh Needed:** Real-time updates via WebSocket
3. **Better Debugging:** Comprehensive console logs for troubleshooting
4. **Multi-Game Support:** Works for both Quiz and Bioscope games
5. **Session Sync:** Active game index updates in real-time

## Related Files

- [HostQuizPanel.tsx](../apps/web/src/components/HostQuizPanel.tsx) - Emits game-started event
- [HostBioscopePanel.tsx](../apps/web/src/components/HostBioscopePanel.tsx) - Emits game-started event
- [useSessionSync.ts](../apps/web/src/hooks/useSessionSync.ts) - Listens for game-started event
- [useQuizSync.ts](../apps/web/src/hooks/useQuizSync.ts) - Syncs quiz state
- [useBioscopeSync.ts](../apps/web/src/hooks/useBioscopeSync.ts) - Syncs bioscope state
- [PlayerLobby.tsx](../apps/web/src/screens/PlayerLobby.tsx) - Shows game when started

## Performance Considerations

- WebSocket events are lightweight and fast (<100ms typically)
- Redux updates trigger minimal re-renders (only affected components)
- Console logs can be removed in production build
- No polling needed - purely event-driven updates

## Future Enhancements

1. **Loading State:** Show "Starting game..." spinner briefly
2. **Transition Animation:** Fade in game UI smoothly
3. **Sound Effect:** Play sound when game starts
4. **Notification:** Show toast "Quiz has started!" for players
5. **Countdown:** "Game starting in 3... 2... 1..." before revealing UI
6. **Connection Status:** Show indicator if WebSocket disconnected
