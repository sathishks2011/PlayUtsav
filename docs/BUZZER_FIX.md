# Buzzer Button Visibility Fix

## Issue
The buzzer button was not appearing for players when the host opened the buzzer in both Quiz and Bioscope games.

## Root Cause

The buzzer visibility logic in [PlayerLobby.tsx](../apps/web/src/screens/PlayerLobby.tsx) had several issues:

### 1. Session-Level Check Instead of Game-Level
**Before:**
```typescript
{session.playerEngagementType === 'BUZZER' && isBuzzerOpen && (
  <PlayerBuzzerButton />
)}
```

This checked `session.playerEngagementType` which is a session-wide setting, but each game (Quiz or Bioscope) can have different engagement types.

### 2. Only Checking Quiz Buzzer State
**Before:**
```typescript
const buzzerState = quizState?.buzzerState;
const isBuzzerOpen = buzzerState?.isOpen || false;
```

This only checked the Quiz game's buzzer state, completely ignoring the Bioscope buzzer state.

### 3. Wrong Buzzer Component for Bioscope
The code was always rendering `PlayerBuzzerButton` (Quiz buzzer) even when Bioscope was active, which wouldn't work because:
- Quiz buzzer connects to `quiz.buzzerState`
- Bioscope buzzer connects to `bioscope.buzzer`

## Solution

### 1. Determine Active Game Type
```typescript
// Get active game and check buzzer state for both quiz and bioscope
const activeGame = safeSession.games?.[safeSession.activeGameIndex];
const isQuizGame = activeGame?.type === 'quiz';
const isBioscopeGame = activeGame?.type === 'bioscope';
```

### 2. Check Both Quiz and Bioscope Buzzer States
```typescript
// Quiz buzzer state
const quizBuzzerState = quizState?.buzzerState;
const isQuizBuzzerOpen = quizBuzzerState?.isOpen || false;

// Bioscope buzzer state
const bioscopeBuzzerState = useAppSelector((s) => s.bioscope.buzzer);
const isBioscopeBuzzerOpen = bioscopeBuzzerState?.isOpen || false;

// Determine if buzzer should be shown based on active game
const isBuzzerOpen = isQuizGame ? isQuizBuzzerOpen : isBioscopeGame ? isBioscopeBuzzerOpen : false;
```

### 3. Render Correct Buzzer Component Based on Game Type
```typescript
{isBuzzerOpen && (
  <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent pt-4 pb-6 px-6 z-50">
    <div className="max-w-3xl mx-auto">
      {isQuizGame && <PlayerBuzzerButton />}
      {isBioscopeGame && session.id && participantId && (
        <PlayerBioscopeBuzzerButton sessionId={session.id} participantId={participantId} />
      )}
    </div>
  </div>
)}
```

## Changes Made

### File: [PlayerLobby.tsx](../apps/web/src/screens/PlayerLobby.tsx)

1. **Added import** (Line 15):
   ```typescript
   import { PlayerBioscopeBuzzerButton } from '../components/PlayerBioscopeBuzzerButton';
   ```

2. **Added game type detection** (Lines 122-135):
   - Determines if active game is Quiz or Bioscope
   - Checks appropriate buzzer state for each game type
   - Combines logic to determine if buzzer should be visible

3. **Updated buzzer rendering** (Lines 345-354):
   - Removed `session.playerEngagementType === 'BUZZER'` check
   - Renders `PlayerBuzzerButton` for Quiz games
   - Renders `PlayerBioscopeBuzzerButton` for Bioscope games

## How It Works Now

### Quiz Game Flow:
1. Host clicks "Open Buzzer" in Quiz controls
2. Backend sets `quiz.buzzerState.isOpen = true`
3. WebSocket broadcasts to all players
4. Player's `useQuizSync` hook updates Redux state
5. `PlayerLobby` detects `isQuizGame && isQuizBuzzerOpen`
6. `PlayerBuzzerButton` appears at bottom of screen

### Bioscope Game Flow:
1. Host clicks "Open Buzzer" in Bioscope controls
2. Backend sets `bioscope.buzzer.isOpen = true`
3. WebSocket broadcasts to all players
4. Player's `useBioscopeSync` hook updates Redux state
5. `PlayerLobby` detects `isBioscopeGame && isBioscopeBuzzerOpen`
6. `PlayerBioscopeBuzzerButton` appears at bottom of screen

## Testing Steps

### Test Quiz Buzzer:
1. Create a session with Quiz game
2. As host, start the quiz
3. Click "Open Buzzer" in Quiz controls
4. **Expected:** Players see Quiz buzzer button at bottom
5. Players can press buzzer
6. Host sees who pressed first

### Test Bioscope Buzzer:
1. Create a session with Bioscope game and BUZZER engagement type
2. As host, start Bioscope game
3. Reveal some images
4. Click "Open Buzzer" in Bioscope controls
5. **Expected:** Players see Bioscope buzzer button at bottom
6. Players can press buzzer
7. Host sees who pressed first

### Test Multi-Game Session:
1. Create a session with both Quiz and Bioscope games
2. Start Quiz game, open buzzer
3. **Expected:** Quiz buzzer appears
4. Close buzzer, switch to Bioscope game
5. Open Bioscope buzzer
6. **Expected:** Bioscope buzzer appears (different component)

## Related Components

### Player Components:
- [PlayerLobby.tsx](../apps/web/src/screens/PlayerLobby.tsx) - Main player view
- [PlayerBuzzerButton.tsx](../apps/web/src/components/PlayerBuzzerButton.tsx) - Quiz buzzer UI
- [PlayerBioscopeBuzzerButton.tsx](../apps/web/src/components/PlayerBioscopeBuzzerButton.tsx) - Bioscope buzzer UI
- [PlayerBioscopePanel.tsx](../apps/web/src/components/PlayerBioscopePanel.tsx) - Bioscope game view

### Host Components:
- [HostQuizPanel.tsx](../apps/web/src/components/HostQuizPanel.tsx) - Quiz host controls with buzzer toggle
- [HostBioscopePanel.tsx](../apps/web/src/components/HostBioscopePanel.tsx) - Bioscope host controls
- [HostBioscopeBuzzerControls.tsx](../apps/web/src/components/HostBioscopeBuzzerControls.tsx) - Bioscope buzzer controls

### State Management:
- [quizSlice.ts](../apps/web/src/store/slices/quizSlice.ts) - Quiz state including `buzzerState`
- [bioscopeSlice.ts](../apps/web/src/store/slices/bioscopeSlice.ts) - Bioscope state including `buzzer`

### Sync Hooks:
- [useQuizSync.ts](../apps/web/src/hooks/useQuizSync.ts) - Syncs quiz state via WebSocket
- [useBioscopeSync.ts](../apps/web/src/hooks/useBioscopeSync.ts) - Syncs bioscope state via WebSocket
- [useBuzzerSync.ts](../apps/web/src/hooks/useBuzzerSync.ts) - Legacy buzzer sync

## Buzzer State Structure

### Quiz Buzzer State:
```typescript
interface BuzzerState {
  isOpen: boolean;
  buzzerOpenedAt: string | null;
  timerDuration: number;
  pressedBy: {
    participantId: string;
    displayName: string;
    teamId?: string;
  } | null;
}
```

### Bioscope Buzzer State:
```typescript
interface BioscopeBuzzerState {
  isOpen: boolean;
  lockedForParticipantId: string | null;
  pressedBy: {
    participantId: string;
    displayName: string;
    teamId?: string;
  } | null;
}
```

## Future Improvements

1. **Unified Buzzer Component:** Create a single buzzer component that works for both games
2. **Animation:** Add entrance animation when buzzer appears
3. **Sound Effect:** Play a sound when buzzer opens
4. **Haptic Feedback:** Vibrate on mobile when buzzer is pressed
5. **Keyboard Shortcut:** Allow pressing buzzer with spacebar
6. **Visual Indicator:** Show buzzer status in game header (before it's opened)

## Troubleshooting

### Buzzer Not Appearing:

1. **Check Active Game:**
   - Open Redux DevTools
   - Check `session.activeGameIndex`
   - Check `session.games[activeGameIndex].type`

2. **Check Buzzer State:**
   - For Quiz: `state.quiz.current.buzzerState.isOpen`
   - For Bioscope: `state.bioscope.buzzer.isOpen`

3. **Check WebSocket Connection:**
   - Console should show WebSocket sync logs
   - Look for `[useQuizSync]` or `[useBioscopeSync]` messages

4. **Check Component Rendering:**
   - Console.log `isBuzzerOpen`, `isQuizGame`, `isBioscopeGame`
   - Verify correct component is being rendered

### Wrong Buzzer Appears:

- Verify `activeGameIndex` matches the current game
- Check if game switched but buzzer state wasn't reset
- Close and reopen buzzer after switching games
