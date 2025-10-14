# Buzzer Mode - Testing Guide

## Overview
The buzzer mode allows fast-response style gameplay where the first player to press their buzzer gets control to answer the question.

## Key Fix Applied
**Problem**: When players pressed the buzzer, nothing appeared to happen on the host side.

**Root Cause**: The `fetchQuiz()` API endpoint was not including the buzzer state in its response, so when players joined or refreshed, they wouldn't see the buzzer state even though socket events were working.

**Solution**: Modified `QuizService.get()` to include buzzer state when the session has `playerEngagementType === 'BUZZER'`.

## How It Works

### 1. **Host Opens Buzzer**
- Host clicks "Open Buzzer" button in the Game Control panel
- API endpoint: `POST /sessions/:sessionId/quiz/buzzer/open`
- Server stores buzzer state in memory (in `QuizService.buzzerStates` Map)
- WebSocket event `buzzer:opened` is broadcast to all participants
- Timer starts counting down (default: 30 seconds)

### 2. **Player Presses Buzzer**
- Player sees the "Press Buzzer" button enabled when buzzer is open
- Player clicks the button
- API endpoint: `POST /sessions/:sessionId/quiz/buzzer/press`
- Server:
  - Records the press with timestamp
  - If this is the **first** press:
    - Locks buzzer to this participant (`lockedForParticipantId`)
    - Closes buzzer (`isOpen = false`)
    - This participant can now answer
  - If not first, just records the press (for host to see order)
- WebSocket event `buzzer:pressed` is broadcast with:
  - Participant info (name, team, color)
  - Updated buzzer state
  - Press order

### 3. **Host Views Buzzer Activity**
- Host sees "Buzzer Controls" panel in Game Control tab
- Shows:
  - Current status (Open/Closed/Locked)
  - List of all buzzer presses in chronological order
  - First buzzer gets special "First" badge
  - Locked participant shows "Answering" badge
  - Timer countdown when buzzer is open

### 4. **Host Actions**
- **Close**: Manually close the buzzer (prevents more presses)
- **Reset**: Clear all presses and unlock (ready for new round)
- **Override**: Manually lock buzzer to a specific participant

## Testing Steps

### Setup
1. **Start servers**:
   - API: Running on `http://localhost:3000`
   - Web: Running on `http://localhost:5173`

2. **Create BUZZER session**:
   - Open host browser: `http://localhost:5173`
   - Sign up/login as host
   - Create session with `playerEngagementType: BUZZER`
   - Note the session code

3. **Join as players**:
   - Open 2-3 incognito/different browser windows
   - Join the session with the code
   - Assign players to teams (optional but recommended)

### Test Scenario 1: Basic Buzzer Flow
1. **Host**: Navigate to "Game Control" tab
2. **Host**: Click "Open Buzzer"
3. **All Players**: Should see "Press Buzzer" button enabled
4. **All Players**: Should see countdown timer
5. **Player 1**: Click "Press Buzzer" (be fastest!)
6. **Expected Results**:
   - Host sees Player 1 appear in buzzer press list with "First" badge
   - Player 1 sees "Answering" status
   - Other players see button disabled ("Buzzer is locked")
   - Host sees "Locked" status badge

### Test Scenario 2: Multiple Presses
1. **Host**: Click "Reset" to clear state
2. **Host**: Click "Open Buzzer"
3. **All Players**: Click "Press Buzzer" as fast as possible
4. **Expected Results**:
   - Host sees all presses in chronological order
   - First press gets special highlighting
   - Host can see who was 2nd, 3rd, etc.

### Test Scenario 3: Override Control
1. **Host**: After presses recorded, click "Override" next to Player 2
2. **Expected Results**:
   - Player 2 now has "Answering" badge
   - Player 1 loses lock
   - Host can manually give control to any participant

### Test Scenario 4: Timer Expiration
1. **Host**: Click "Open Buzzer"
2. **All Players**: Do NOT press the buzzer
3. **Wait**: Let the 30-second timer run out
4. **Expected Results**:
   - Buzzer auto-closes after 30 seconds
   - Players see "Buzzer is closed"

### Test Scenario 5: Refresh/Reconnect
1. **Host**: Open buzzer and have players press
2. **Player 1**: Refresh their browser
3. **Expected Results**:
   - After page reload, Player 1 should still see buzzer state
   - Host should still see all presses
   - State persists through refresh

## Components Updated

### Frontend (`apps/web/src/`)
- **`components/PlayerBuzzerButton.tsx`**: Player-facing buzzer control
- **`components/HostBuzzerControls.tsx`**: Host buzzer management panel
- **`components/HostPortal.tsx`**: Wired buzzer controls into Game Control tab
- **`hooks/useBuzzerSync.ts`**: Syncs buzzer events via WebSocket
- **`store/slices/quizSlice.ts`**: Redux state management for buzzer
- **`lib/api.ts`**: API client methods for buzzer endpoints

### Backend (`services/api/src/`)
- **`services/quiz.service.ts`**: 
  - Added `buzzerStates` in-memory Map
  - Methods: `pressBuzzer`, `openBuzzer`, `closeBuzzer`, `resetBuzzer`, `overrideBuzzerControl`
  - **KEY FIX**: Modified `get()` to include buzzer state in response
- **`routes/quiz.controller.ts`**: REST endpoints for buzzer actions
- **`gateways/session.gateway.ts`**: WebSocket event emitters for buzzer

## Known Limitations
1. **Buzzer state is in-memory only** - Not persisted to database, lost on server restart
2. **Auto-close timer** - Uses setTimeout, not robust for long sessions
3. **No sound effects** - Players don't hear audio feedback on buzz
4. **No visual celebration** - No confetti/animation for first buzzer

## Next Steps
1. Test the basic flow end-to-end
2. Consider persisting buzzer state to database
3. Add sound effects for buzzer press
4. Add visual feedback/animations
5. Implement scoring for buzzer rounds
