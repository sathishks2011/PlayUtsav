# Game Start Visibility Fix

## Issue
Games were appearing in player sessions as soon as they were attached to the session, even before the host clicked the "Start" button. Players could see the game UI immediately, which was confusing and not intended.

## Expected Behavior
- Games should only appear to players **after** the host clicks "Start Game"
- Before starting, players should see: "Waiting for host to start the game..."
- This applies to both Quiz and Bioscope games

## Root Cause

In [PlayerLobby.tsx](../apps/web/src/screens/PlayerLobby.tsx), the code was rendering games as soon as they existed in `session.games[]` array, without checking if they had actually been started.

**Before:**
```typescript
const activeGame = session.games[session.activeGameIndex];
if (!activeGame) {
  return <div>Waiting for host to activate a game...</div>;
}

// Game was rendered immediately, even if not started
return <GamePanel {...} />;
```

This meant:
- Quiz games appeared even when `quizState.status === 'idle'`
- Bioscope games appeared even when `bioscopeState.status === 'idle'`

## Solution

Added a check to verify if the game has actually been started before rendering it:

```typescript
// Check if the game has actually been started by the host
let isGameStarted = false;
if (activeGame.type === 'quiz') {
  // Quiz is started when status is 'running' or 'revealed' (not 'idle')
  isGameStarted = quizState?.status === 'running' || quizState?.status === 'revealed';
} else if (activeGame.type === 'bioscope') {
  // Bioscope is started when status is not 'idle'
  isGameStarted = bioscopeState?.status !== 'idle' && bioscopeState?.status !== undefined;
}

// Only show the game if it's been started
if (!isGameStarted) {
  return (
    <div>
      <FormattedMessage
        id="playerLobby.waitingForStart"
        defaultMessage="Waiting for host to start the game..."
      />
    </div>
  );
}
```

## Changes Made

### File: [PlayerLobby.tsx](../apps/web/src/screens/PlayerLobby.tsx#L296-L318)

1. **Added game start detection** (Lines 296-304):
   - For Quiz: Checks if `quizState.status === 'running' || 'revealed'`
   - For Bioscope: Checks if `bioscopeState.status !== 'idle'` and is defined

2. **Added waiting state** (Lines 307-317):
   - Shows "Waiting for host to start the game..." message
   - Only renders game UI after host starts the game

3. **Updated comment** (Line 281):
   - Changed from "Only show the currently active game"
   - To "Only show the currently active game IF IT'S STARTED"

## Game Status Flow

### Quiz Game States:
```
idle → running → revealed
  ↑       ↑        ↑
  |       |        |
Not     Show    Show
shown   game    game
```

- `idle`: Initial state, game attached but not started
- `running`: Host clicked "Start Quiz", question is active
- `revealed`: Answer has been revealed

### Bioscope Game States:
```
idle → revealing → answering → revealed → completed
  ↑       ↑           ↑           ↑          ↑
  |       |           |           |          |
Not     Show        Show        Show       Show
shown   game        game        game       game
```

- `idle`: Initial state, game attached but not started
- `revealing`: Host is revealing images
- `answering`: Timer started, players can answer
- `revealed`: Answer has been shown
- `completed`: All rounds finished

## Testing Steps

### Test Quiz Game:
1. As host, create a session and attach Quiz template
2. Switch to "Quiz" in the game selector
3. **Expected:** Host sees "Start Quiz" button
4. Open player session in another window/device
5. **Expected:** Player sees "Waiting for host to start the game..."
6. As host, click "Start Quiz"
7. **Expected:** Quiz appears immediately for all players
8. Players can now see question and answer

### Test Bioscope Game:
1. As host, create a session and attach Bioscope template
2. Switch to "Bioscope" in the game selector
3. **Expected:** Host sees "Start Bioscope" button
4. Open player session in another window/device
5. **Expected:** Player sees "Waiting for host to start the game..."
6. As host, click "Start Bioscope"
7. **Expected:** Bioscope game appears immediately for all players
8. Host can now reveal images, players see them

### Test Multi-Game Session:
1. Create session with both Quiz and Bioscope
2. Start Quiz game
3. **Expected:** Players see Quiz
4. Complete quiz, switch to Bioscope (don't start it yet)
5. **Expected:** Players see "Waiting for host to start the game..."
6. Start Bioscope
7. **Expected:** Players see Bioscope game

## WebSocket Sync

When the host starts a game, the state is synced via WebSocket:

### Quiz Start Flow:
1. Host clicks "Start Quiz"
2. Backend sets `quiz.status = 'running'`
3. WebSocket broadcasts `quiz:state-updated` to all players
4. Players' `useQuizSync` hook updates Redux state
5. `PlayerLobby` re-renders, detects `quizState.status === 'running'`
6. Quiz UI appears

### Bioscope Start Flow:
1. Host clicks "Start Bioscope"
2. Backend sets `bioscope.status = 'revealing'`
3. WebSocket broadcasts `bioscope:state-updated` to all players
4. Players' `useBioscopeSync` hook updates Redux state
5. `PlayerLobby` re-renders, detects `bioscopeState.status !== 'idle'`
6. Bioscope UI appears

## Related Components

- [PlayerLobby.tsx](../apps/web/src/screens/PlayerLobby.tsx) - Player view with game start check
- [HostQuizPanel.tsx](../apps/web/src/components/HostQuizPanel.tsx) - Quiz host controls
- [HostBioscopePanel.tsx](../apps/web/src/components/HostBioscopePanel.tsx) - Bioscope host controls
- [useQuizSync.ts](../apps/web/src/hooks/useQuizSync.ts) - Syncs quiz state
- [useBioscopeSync.ts](../apps/web/src/hooks/useBioscopeSync.ts) - Syncs bioscope state

## State Type Definitions

### Quiz State:
```typescript
type QuizState = {
  sessionId: string;
  questionId: string;
  prompt: string;
  options: string[];
  status: 'idle' | 'running' | 'revealed';  // ← Key field for visibility
  correctOption: number | null;
  duration: number;
  createdAt: string;
  answers: Array<{ participantId: string; answer: number; displayName: string }>;
  buzzerState?: BuzzerState;
};
```

### Bioscope State:
```typescript
interface BioscopeGameState {
  sessionId: string;
  templateId: string;
  status: 'idle' | 'revealing' | 'answering' | 'revealed' | 'completed';  // ← Key field
  currentRoundId: number;
  revealedImages: number[];
  timerStartedAt: string | null;
  timerDuration: number;
  timeRemaining: number | null;
  template: BioscopeTemplate | null;
}
```

## Benefits

1. **Better UX:** Players don't see confusing empty game states
2. **Clear Intent:** "Waiting for host..." message is explicit
3. **Controlled Flow:** Host has full control over when games become visible
4. **Consistent:** Both Quiz and Bioscope follow the same pattern
5. **No Race Conditions:** Players can't interact with unstarted games

## Future Improvements

1. **Loading Animation:** Show animated "waiting" indicator
2. **Game Preview:** Show minimal game info while waiting (title, type, icon)
3. **Host Notification:** Show notification when players are waiting
4. **Auto-Start Option:** Host setting to auto-start games when activated
5. **Countdown:** "Game starting in 3... 2... 1..." when host starts

## Troubleshooting

### Game Not Appearing After Host Starts:

1. **Check WebSocket Connection:**
   - Open browser DevTools → Console
   - Look for `[useQuizSync]` or `[useBioscopeSync]` messages
   - Verify connection status

2. **Check Redux State:**
   - Open Redux DevTools
   - Check `state.quiz.current.status` for Quiz
   - Check `state.bioscope.currentGame.status` for Bioscope
   - Should not be 'idle' if started

3. **Refresh Player Session:**
   - Player can leave and rejoin session
   - Or refresh the page (state should sync)

### Game Still Showing Before Start:

1. **Clear Browser Cache:** Ctrl+Shift+Delete
2. **Check Code Version:** Ensure latest code is deployed
3. **Inspect Logic:** Add console.log to see `isGameStarted` value
