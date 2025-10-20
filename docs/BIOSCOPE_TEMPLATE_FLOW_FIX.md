# Bioscope Template Selection Flow - Aligned with Quiz Pattern

## Date: October 17, 2025

## Overview
Removed the template selector from HostBioscopePanel in the lobby to match the quiz game flow. Templates are now selected **only in the Dashboard** before creating a session, not in the lobby.

## Changes Made

### 1. Updated `HostBioscopePanel.tsx`
**Location**: `apps/web/src/components/HostBioscopePanel.tsx`

**Removed**:
- `BioscopeTemplateSelector` import
- Template selector UI component from the lobby
- Dependency on `selectedTemplate` from Redux state

**Added**:
- **Automatic template detection** - Checks for `session.bioscopeSession` on mount
- **Template validation** - Shows warning if no bioscope template is attached
- **Auto-load game state** - Fetches current game state when bioscopeSession exists

**Updated Logic**:
```typescript
// Before: Used selectedTemplate from Redux
const handleStartGame = async () => {
  if (!sessionId || !selectedTemplate) return;
  await dispatch(startBioscopeGame({ 
    sessionId, 
    templateId: selectedTemplate.id 
  }));
};

// After: Uses bioscopeSession.templateId from session
const handleStartGame = async () => {
  if (!sessionId || !bioscopeSession?.templateId) {
    setLocalError('No bioscope template attached');
    return;
  }
  await dispatch(startBioscopeGame({ 
    sessionId, 
    templateId: bioscopeSession.templateId 
  }));
};
```

**New Template Detection**:
```typescript
useEffect(() => {
  if (!sessionId || !bioscopeSession) {
    console.log('[HostBioscopePanel] No bioscope template attached');
    return;
  }
  
  console.log('[HostBioscopePanel] Bioscope template detected, loading...');
  dispatch(fetchBioscopeGameState({ sessionId }))
    .unwrap()
    .catch((err) => {
      console.log('[HostBioscopePanel] Game not started yet:', err);
      dispatch(clearError());
    });
}, [dispatch, sessionId, bioscopeSession]);
```

**Warning Display**:
If no bioscope template is attached when the panel loads:
```tsx
<div className="rounded-xl border border-yellow-800 bg-yellow-900/20 p-5">
  <h3>No Bioscope Template Attached</h3>
  <p>Please select a Bioscope template when creating the session from the Dashboard.</p>
</div>
```

## Game Flow Comparison

### Quiz Game Flow (Existing) ✅
1. **Dashboard**: Select quiz template (optional)
2. **Dashboard**: Click "Create Session"
3. **API**: Attach template via `/sessions/:id/attach-template`
4. **Lobby**: HostQuizPanel loads automatically
5. **Lobby**: Template questions loaded via `getRoundQuestions()`
6. **Lobby**: Start quiz, play rounds

### Bioscope Game Flow (Updated) ✅
1. **Dashboard**: Select bioscope template from unified dropdown
2. **Dashboard**: Click "Create Session"
3. **API**: Attach template via `/bioscope/templates/:id/attach`
4. **Lobby**: HostBioscopePanel loads automatically (conditional rendering)
5. **Lobby**: Game state loaded via `fetchBioscopeGameState()`
6. **Lobby**: Start bioscope, reveal images

## Key Differences from Quiz

| Aspect | Quiz | Bioscope |
|--------|------|----------|
| Template Selection | Dashboard (optional) | Dashboard (required) |
| Template Storage | `session.quizTemplateId` | `session.bioscopeSession.templateId` |
| Lobby Display | Always shows HostQuizPanel | Shows HostBioscopePanel if `bioscopeSession` exists |
| No Template Behavior | Uses sample questions | Shows warning message |
| API Endpoint | `/sessions/:id/attach-template` | `/bioscope/templates/:id/attach` |

## Benefits

1. **Consistency**: Matches quiz game UX pattern
2. **Clarity**: Template selection happens before session starts
3. **Separation**: Dashboard = setup, Lobby = gameplay
4. **Validation**: Clear error message if template missing
5. **Simplicity**: Removes complex state management from lobby

## Testing Checklist

### Happy Path:
- [ ] Go to Dashboard
- [ ] Select a Bioscope template from "Game Templates" dropdown
- [ ] Click "Create Session"
- [ ] Verify session created with bioscope template attached
- [ ] Join session as host
- [ ] Verify HostBioscopePanel appears (not HostQuizPanel)
- [ ] Verify no template selector shown
- [ ] Click "Start Bioscope" - should work immediately
- [ ] Reveal images, test gameplay

### Error Path:
- [ ] Create session WITHOUT selecting bioscope template
- [ ] Join session as host
- [ ] Verify HostQuizPanel appears (no bioscopeSession)
- [ ] OR verify warning message if user somehow accesses bioscope panel

### Edge Cases:
- [ ] Create session with quiz template - should show HostQuizPanel
- [ ] Create session with bioscope template - should show HostBioscopePanel
- [ ] Refresh page in lobby - should maintain correct panel
- [ ] Check WebSocket events still work
- [ ] Verify game state persists across refreshes

## Migration Notes

**No Breaking Changes**:
- Existing sessions with attached bioscope templates will work
- Database schema unchanged (bioscopeSession relation already exists)
- API endpoints unchanged

**State Management**:
- `selectedTemplate` in Redux is now only used for template browsing
- Game panel relies on `session.bioscopeSession` from session state
- Template data comes from backend via `fetchBioscopeGameState()`

## Related Files

### Modified:
- `apps/web/src/components/HostBioscopePanel.tsx` (major refactor)

### Already Complete (from previous work):
- `apps/web/src/screens/HostDashboard.tsx` - Unified template dropdown
- `apps/web/src/screens/HostLobby.tsx` - Conditional panel rendering
- `apps/web/src/lib/api.ts` - `attachBioscopeTemplate()` function
- `services/api/prisma/schema.prisma` - bioscopeSession relation
- `packages/core/src/types.ts` - Session type with bioscopeSession

### Not Modified:
- `apps/web/src/components/bioscope/BioscopeTemplateSelector.tsx` - Can be reused elsewhere
- Redux state (`bioscopeSlice.ts`) - Still needed for game state

## Future Enhancements

1. **Template Preview in Lobby**: Show template name/description at top of panel
2. **Template Switch**: Allow changing template between rounds (advanced feature)
3. **Template Recommendations**: Suggest templates based on player count
4. **Quick Start**: Auto-start game when entering lobby (optional setting)

## Troubleshooting

### "No Bioscope Template Attached" Warning:
- **Cause**: Session created without selecting bioscope template
- **Fix**: Go back to Dashboard, select template, create new session

### HostQuizPanel Shows Instead:
- **Cause**: Session has `quizTemplateId` but no `bioscopeSession`
- **Fix**: Create new session with bioscope template selected

### Start Button Disabled:
- **Cause**: `bioscopeSession.templateId` is null or undefined
- **Fix**: Check session data in Redux DevTools, verify template was attached

### Game State Not Loading:
- **Cause**: API endpoint `/bioscope/sessions/:sessionId/state` returning 404
- **Fix**: This is normal if game hasn't started yet; error is caught and cleared
