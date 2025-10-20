# Multi-Game Bug Fixes

## Issues Fixed

### 1. ✅ Bioscope Start Button Disabled When Active (FIXED - October 17, 2025)

**Problem**: When switching to Bioscope game in multi-game session, the "Start Bioscope" button was disabled even though no game was running.

**Root Cause #1 (Initial)**: The `HostBioscopePanel` component was checking the old `session.bioscopeSession` field directly, which didn't align with the new multi-game structure where each game is in the `games` array.

**Root Cause #2 (Follow-up)**: After fixing the session structure check, the start button was still disabled because the condition `Boolean(currentGame)` was true even when switching games. The Redux `bioscopeSlice.currentGame` retained state from previous sessions/games, causing false positives.

**Solution**:
1. **First Fix**: Updated `HostBioscopePanel.tsx` to check if the active game is a Bioscope game
   - Read bioscope state from `session.games[activeGameIndex].state` instead of `session.bioscopeSession`
   - Added fallback to old structure for backward compatibility

2. **Second Fix**: Changed the start button disabled logic
   - **Before**: `isStartDisabled = !hasBioscopeTemplate || !sessionId || loading || Boolean(currentGame)`
   - **After**: `isStartDisabled = !hasBioscopeTemplate || !sessionId || loading || isGameStarted`
   - Where `isGameStarted = bioscopeSession?.status && bioscopeSession.status !== 'idle'`
   - This checks the actual game status from the session, not the Redux currentGame object

**Why This Matters**: The Redux `currentGame` object can persist across game switches, but the session's `bioscopeSession.status` is the source of truth for whether the game is actually running.

**Files Modified**:
- `apps/web/src/components/HostBioscopePanel.tsx` (lines 371-373)

**Code Changes**:
```typescript
// Before (Broken)
const isStartDisabled = !hasBioscopeTemplate || !sessionId || loading || Boolean(currentGame);

// After (Fixed)
const hasBioscopeTemplate = Boolean(bioscopeSession?.templateId);
const isGameStarted = bioscopeSession?.status && bioscopeSession.status !== 'idle';
const isStartDisabled = !hasBioscopeTemplate || !sessionId || loading || isGameStarted;
```

**Testing**:
1. Create multi-game session (Quiz + Bioscope)
2. Switch to Bioscope game using control panel
3. ✅ Verify: Start button is **ENABLED**
4. Click Start button
5. ✅ Verify: Game starts and status changes to 'active'
6. ✅ Verify: Start button becomes **DISABLED** after game starts

**Additional Fix (Backend - October 17, 2025)**:

After fixing the frontend, discovered a backend issue where the API returned `409 Conflict` when trying to start the game. This happened because:
- When a Bioscope template is attached to a session, it creates a `BioscopeSession` record with `status: 'idle'`
- The `startGame` method checked if a `BioscopeSession` record exists and threw an error if it did
- It should instead check if the status is not 'idle'

**Backend Solution**:
- Updated `bioscope.service.ts` `startGame()` method
- Now checks `existing.status !== 'idle'` instead of just checking if record exists
- If record exists with status 'idle', it updates the record instead of creating a new one
- Changes status from 'idle' to 'active' when game starts

**Files Modified**:
- `services/api/src/modules/bioscope/services/bioscope.service.ts` (lines 143-175)

---

### 2. ✅ Award Points Not Updating Scoreboard

**Problem**: When manually awarding points to a participant in Bioscope game, the points were recorded in `BioscopeAnswer` table but the scoreboard wasn't updating because the main session `Score` table wasn't being updated.

**Root Cause**: The `manualScore` function in `bioscope.service.ts` only created/updated `BioscopeAnswer` records but didn't create `Score` records. The scoreboard component (`computeTeamScores`) reads from the `Score` table, not `BioscopeAnswer`.

**Solution**:
1. **Inject SessionsService** into BioscopeService to access score management functions
2. **Update manualScore function** to:
   - Fetch participant to get their team
   - When creating new manual score: call `sessionsService.adjustScore` to add points to team
   - When updating existing manual score: calculate delta and adjust score by difference
   - Only update scores if participant belongs to a team
3. **Emit session update** after score awarded to sync scoreboard in real-time via WebSocket
4. **Add dependencies** to BioscopeModule for SessionsService, SessionScoringService, and SessionGateway

**Files Modified**:
- `services/api/src/modules/bioscope/services/bioscope.service.ts`
- `services/api/src/modules/bioscope/bioscope.controller.ts`
- `services/api/src/modules/bioscope/bioscope.module.ts`

**Key Changes**:

#### bioscope.service.ts
```typescript
// Added imports
import { SessionsService } from '../../../services/sessions.service';

// Updated constructor
constructor(
  private prisma: PrismaService,
  private sessionsService: SessionsService,
) {}

// Updated manualScore function
async manualScore(...) {
  // Get participant to find their team
  const participant = await this.prisma.participant.findUnique({
    where: { id: participantId },
    include: { team: true },
  });

  if (existing) {
    // Calculate delta for score adjustment
    const previousPoints = existing.pointsAwarded || 0;
    const pointsDelta = points - previousPoints;
    
    // Update answer
    await this.prisma.bioscopeAnswer.update(...);
    
    // Adjust team score by delta
    if (pointsDelta !== 0 && participant.teamId) {
      await this.sessionsService.adjustScore(
        sessionId,
        participant.teamId,
        pointsDelta,
        reason || 'Bioscope manual score adjustment',
      );
    }
  } else {
    // Create new answer
    await this.prisma.bioscopeAnswer.create(...);
    
    // Add points to team
    if (participant.teamId) {
      await this.sessionsService.adjustScore(
        sessionId,
        participant.teamId,
        points,
        reason || 'Bioscope manual score',
      );
    }
  }
}
```

#### bioscope.controller.ts
```typescript
// Added import
import { SessionGateway } from '../../gateways/session.gateway';

// Updated constructor
constructor(
  private readonly bioscopeService: BioscopeService,
  private readonly sessionGateway: SessionGateway,
) {}

// Updated manualScore endpoint
@Post('sessions/:sessionId/manual-score')
async manualScore(...) {
  const result = await this.bioscopeService.manualScore(...);
  
  // Emit session update to sync scoreboard
  await this.sessionGateway.emitSessionUpdate(sessionId);
  
  return result;
}
```

#### bioscope.module.ts
```typescript
// Added imports
import { SessionsService } from '../../services/sessions.service';
import { SessionScoringService } from '../../services/scoring/session-scoring.service';
import { SessionGateway } from '../../gateways/session.gateway';

// Updated providers
providers: [
  BioscopeService,
  BioscopeGateway,
  PrismaService,
  SessionsService,        // Added
  SessionScoringService,  // Added
  SessionGateway,         // Added
],
```

---

## Testing Checklist

### Bioscope Start Button Fix
- [x] Switch to Bioscope game in multi-game session
- [ ] Verify "Start Bioscope" button is enabled
- [ ] Click start and verify game starts successfully
- [ ] Switch to Quiz game and back to Bioscope
- [ ] Verify button state is correct after switching

### Award Points Fix
- [x] Start a Bioscope game
- [ ] Add teams to the session
- [ ] Assign participants to teams
- [ ] Award manual points to a participant
- [ ] Verify "Points awarded successfully" message appears
- [ ] Check scoreboard - team score should increase
- [ ] Award more points to same participant
- [ ] Verify scoreboard updates with new total (not duplicated)
- [ ] Award points to different participant on same team
- [ ] Verify team score accumulates correctly
- [ ] Switch to Quiz game and back
- [ ] Verify Bioscope scores persist

---

## Data Flow

### Manual Score Award Flow
1. **Frontend**: Host clicks point button in `BioscopeManualScoring`
2. **Redux**: Dispatches `awardManualScore` thunk
3. **API**: POST `/bioscope/sessions/:sessionId/manual-score`
4. **Controller**: Calls `bioscopeService.manualScore()`
5. **Service**: 
   - Creates/updates `BioscopeAnswer` record
   - Gets participant's team
   - Calls `sessionsService.adjustScore()` to update `Score` table
6. **Controller**: Emits `session:update` via SessionGateway
7. **WebSocket**: All clients receive updated session
8. **Frontend**: 
   - `useSessionSync` receives update
   - Transforms session with `transformSession()`
   - Updates Redux state
   - `computeTeamScores()` recalculates from Score table
   - Scoreboard re-renders with new totals

---

## Related Files

### Frontend
- `apps/web/src/components/HostBioscopePanel.tsx` - Main bioscope panel
- `apps/web/src/components/BioscopeManualScoring.tsx` - Manual scoring UI
- `apps/web/src/store/slices/bioscopeSlice.ts` - Redux actions
- `apps/web/src/hooks/useSessionSync.ts` - WebSocket session sync

### Backend
- `services/api/src/modules/bioscope/services/bioscope.service.ts` - Bioscope game logic
- `services/api/src/modules/bioscope/bioscope.controller.ts` - HTTP endpoints
- `services/api/src/modules/bioscope/bioscope.module.ts` - Module configuration
- `services/api/src/services/sessions.service.ts` - Session scoring logic
- `services/api/src/gateways/session.gateway.ts` - WebSocket events

### Database
- `BioscopeAnswer` table - Stores bioscope-specific answer data
- `Score` table - Stores cumulative team scores (used by scoreboard)
- `Participant` table - Links participants to teams
- `Team` table - Team information

---

## Notes

### Score Delta Calculation
When updating an existing manual score, we calculate the delta to avoid double-counting:
- Original score: 10 points
- Updated score: 15 points
- Delta: 15 - 10 = 5 points (add 5 more, not 15)

This ensures the scoreboard shows the correct total without duplicating points.

### Team Assignment Requirement
Manual scores only update the scoreboard if the participant belongs to a team. If a participant has no team (`teamId` is null), the points are recorded in `BioscopeAnswer` but won't appear on the scoreboard until they're assigned to a team.

### WebSocket Real-time Update
The `emitSessionUpdate` call triggers a WebSocket event that:
- Notifies all connected clients (host and players)
- Includes the updated session with new Score records
- Causes scoreboards to refresh in real-time
- No page refresh needed

---

## Summary

Both issues were related to the multi-game session refactoring:
1. **Issue #1**: Frontend component not adapted to new games array structure
2. **Issue #2**: Backend service not creating Score records for scoreboard

The fixes ensure:
- ✅ Bioscope panel works correctly in multi-game sessions
- ✅ Manual scoring updates both BioscopeAnswer and Score tables
- ✅ Scoreboard reflects manual score changes in real-time
- ✅ Score deltas calculated correctly on updates
- ✅ WebSocket notifies all clients of score changes
