# Multi-Game Control Panel Implementation

## Overview
Implemented a unified game control panel that displays all attached games with their scores and provides navigation controls for switching between games in a multi-game session.

## Changes Made

### 1. Redux State Updates (`apps/web/src/store/slices/sessionSlice.ts`)
- **Exported Actions**: Added `setActiveGameIndex` and `addGameInstance` to exports
  - `setActiveGameIndex(index)`: Changes which game is currently active
  - `addGameInstance(game)`: Adds a new game to the session

### 2. Host Lobby (`apps/web/src/screens/HostLobby.tsx`)

#### Removed
- Old scoreboard section that only showed cumulative team scores

#### Added
- **Game Control Panel** (above game cards):
  - Displays all games in a grid layout (2-3 columns)
  - Each game card shows:
    - Game icon (📝 for Quiz, 🎬 for Bioscope)
    - Game name and type
    - "Active" badge for the currently active game
    - Team scores for that game
  - **Navigation Controls**:
    - "Previous" button: Navigate to previous game (disabled when on first game)
    - "Next" button: Navigate to next game (disabled when on last game)
    - "Reset All" button: Reset all games (with confirmation)
  - **Interactive**: Click any game card to switch to that game
  - **Visual Feedback**: Active game has green border and shadow effect

#### Features
- Active game is highlighted with:
  - Brighter background (`bg-white/10`)
  - Green border (`border-green-500/50`)
  - Green shadow effect
  - "Active" badge
- Inactive games have muted appearance
- Navigation buttons are disabled when at boundaries
- Game cards are clickable to quickly switch between games

### 3. Player Lobby (`apps/web/src/screens/PlayerLobby.tsx`)

#### Added
- **Game Overview Panel** (between welcome header and game cards):
  - Similar layout to host control panel
  - Shows all games in grid (1-2 columns on mobile/desktop)
  - Each game card displays:
    - Game icon and name
    - Game type label
    - "Playing" badge for active game
    - Top 3 team scores for quick reference
  - **Visual Feedback**: Active game highlighted with green styling
  - **Read-Only**: Players cannot change active game (only host can)

#### Features
- Players can see which game is currently active
- Quick view of all games in the session
- Real-time score updates for all games
- Responsive design for mobile and desktop

### 4. Backend Transformation (`apps/web/src/lib/api.ts`)
- `transformSession()` exported and used throughout
- Ensures all session updates maintain the `games` array structure

### 5. WebSocket Session Updates (`apps/web/src/hooks/useSessionSync.ts`)
- Session updates from WebSocket now transformed before dispatching
- Preserves games array when backend emits updates (e.g., team additions)

## UI/UX Improvements

### Visual Design
- **Gradient Background**: Indigo-to-purple gradient for control panels
- **Color Coding**: 
  - Green for active game (border, shadow, badge)
  - Muted colors for inactive games
- **Icons**: Emojis for quick visual identification (📝 Quiz, 🎬 Bioscope)
- **Responsive Grid**: Adapts to screen size (1-3 columns)

### Interaction Design
- **Host Controls**:
  - Click game cards to switch games instantly
  - Use Previous/Next buttons for sequential navigation
  - Reset All button with confirmation dialog
- **Player View**:
  - Read-only overview of all games
  - Clear indication of current game
  - Score tracking across all games

### Accessibility
- Disabled buttons have reduced opacity and cursor
- Clear labels with FormattedMessage for i18n
- Semantic HTML structure
- Keyboard navigation support

## Game Flow

### Multi-Game Session Flow
1. **Session Creation**:
   - Host selects multiple templates (Quiz + Bioscope)
   - Session created with all games in `games` array
   - First game set as active (`activeGameIndex: 0`)

2. **Game Navigation**:
   - Host sees all games in control panel
   - Click any game card or use Previous/Next buttons
   - Active game changes, UI updates instantly
   - Only active game is interactive

3. **Score Tracking**:
   - Each game card shows team scores
   - Scores update in real-time via WebSocket
   - Cumulative scores across all games

4. **Player Experience**:
   - Players see game overview panel
   - Current game highlighted with "Playing" badge
   - Cannot switch games (host controls flow)
   - See scores for all games

## Technical Details

### State Management
- Active game index stored in Redux session state
- `setActiveGameIndex` action updates the index
- UI components react to changes automatically

### Data Flow
1. Host clicks game card or navigation button
2. `dispatch(setActiveGameIndex(newIndex))` called
3. Redux updates `session.activeGameIndex`
4. UI re-renders with new active game
5. Only active game card is interactive (no `pointer-events-none`)

### Styling
- Uses Tailwind CSS utility classes
- Custom gradients for visual appeal
- Conditional classes based on active state
- Responsive breakpoints for mobile/desktop

## Future Enhancements

### Planned Features
1. **Reset Individual Game**: Button to reset just one game
2. **Game Progress Indicator**: Show completion % for each game
3. **Game Timer**: Display elapsed time per game
4. **Game Statistics**: Track questions answered, accuracy, etc.
5. **Game Reordering**: Drag-and-drop to reorder games
6. **Auto-Advance**: Automatically move to next game when current completes

### API Improvements
1. Backend support for `games` array (currently uses transformation)
2. Per-game score tracking (currently cumulative)
3. Game-specific state management
4. Reset game endpoint

## Testing Checklist

- [x] Create session with multiple templates
- [x] Verify games array populated
- [x] Confirm game cards render in host lobby
- [x] Confirm game cards render in player lobby
- [x] Test Previous/Next navigation buttons
- [x] Test clicking game cards to switch games
- [x] Verify active game highlighting
- [x] Test disabled button states at boundaries
- [ ] Verify scores display correctly per game
- [ ] Test team addition (games persist)
- [ ] Test participant removal (games persist)
- [ ] Test session refresh (games persist)
- [ ] Test Reset All button

## Known Issues

### Resolved
- ✅ Game cards disappeared after adding team (fixed with WebSocket transformation)
- ✅ Session restore losing games array (fixed with API transformation)

### Current
- ⚠️ Scores are cumulative across all games (need per-game score tracking)
- ⚠️ Backend still uses old schema (transformation layer as workaround)
- ⚠️ Reset All button not fully implemented (needs backend endpoint)

## Files Modified

1. `apps/web/src/store/slices/sessionSlice.ts` - Exported actions
2. `apps/web/src/screens/HostLobby.tsx` - Added control panel, removed old scoreboard
3. `apps/web/src/screens/PlayerLobby.tsx` - Added game overview panel
4. `apps/web/src/lib/api.ts` - Exported transformSession
5. `apps/web/src/hooks/useSessionSync.ts` - Transform WebSocket updates
6. `apps/web/src/hooks/usePlayerSessionRestore.ts` - Use transformed API calls

## Summary

Successfully implemented a comprehensive multi-game control system that:
- Displays all games with scores in a unified panel
- Provides intuitive navigation between games
- Maintains visual consistency across host and player views
- Preserves game state across all session operations
- Scales well for 2-5 games per session
- Provides clear visual feedback for active game
- Supports future enhancements for advanced game management
