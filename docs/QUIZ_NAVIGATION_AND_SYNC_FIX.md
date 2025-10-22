# Quiz Navigation and Sync Fix

## Issues Fixed

### Issue 1: Quiz Only Shows 2 Questions
After uploading a template with many questions, clicking "Next Question" would only cycle through 2 questions and then try to advance to the next category/round prematurely.

### Issue 2: Quiz Game Not Showing in Player Session
When host activates and starts the quiz game, players see Bioscope game instead of Quiz game.

## Root Causes

### Issue 1: Incorrect Question Count Check

**[HostQuizPanel.tsx:414](../apps/web/src/components/HostQuizPanel.tsx#L414)** (Before Fix)

```typescript
if (nextQuestionIndex >= templateQuestions.length) {
  // All questions in current round are done - advance to next round
  await advanceToNextRound(session.id);
}
```

**Problem:**
- `templateQuestions` contains questions from the **current category only**, not all questions
- Backend API `getRoundQuestions` returns questions for one category at a time
- If current category has 2 questions, `templateQuestions.length === 2`
- After 2 questions, code thinks all questions are done and advances to next category
- But backend hasn't updated the round state (`updateRound` not called)
- Navigation gets out of sync between frontend and backend

### Issue 2: Wrong Quiz Detection in useQuizSync

**[useQuizSync.ts:10](../apps/web/src/hooks/useQuizSync.ts#L10)** (Before Fix)

```typescript
const hasQuizTemplate = Boolean(session?.quizTemplateId);
```

**Problem:**
- Checked for `session.quizTemplateId` (old field that doesn't exist)
- Quiz templates are now stored in `session.games[]` array with each game having a `templateId`
- `hasQuizTemplate` was always `false`
- Quiz sync never initialized
- Players never received quiz state updates
- Quiz game never appeared for players

## Solutions

### Fix 1: Proper Quiz Navigation with Backend Sync

**[HostQuizPanel.tsx:403-491](../apps/web/src/components/HostQuizPanel.tsx#L403-L491)**

Added proper backend synchronization and better logging:

```typescript
const handleNextQuestion = async () => {
  if (!session || loading) return;

  setAllAnswered(false);
  setAutoRevealTimer(null);

  if (usingTemplate && templateQuestions.length > 0) {
    const nextQuestionIndex = currentQuestionIndex + 1;

    console.log('[HostQuizPanel] Next question requested:', {
      currentCategoryIndex,
      currentQuestionIndex,
      nextQuestionIndex,
      questionsInCategory: templateQuestions.length,
      totalCategories: categories.length
    });

    if (nextQuestionIndex >= templateQuestions.length) {
      // All questions in current CATEGORY done - advance to next category
      console.log('[HostQuizPanel] All questions in category complete, advancing...');

      try {
        const result = await advanceToNextRound(session.id);

        if (result.isComplete) {
          toast.showToast({ message: '🎉 Quiz Complete! All categories finished.' });
          return;
        }

        // Reload questions for new category
        const roundInfo = await getRoundQuestions(session.id);
        setTemplateQuestions(roundInfo.questions);
        setCurrentCategoryIndex(roundInfo.session.currentCategoryIndex);
        setCurrentQuestionIndex(roundInfo.session.currentQuestionIndex);

        // Start first question of new category
        const firstQuestion = roundInfo.questions[roundInfo.session.currentQuestionIndex];
        if (firstQuestion) {
          dispatch(startQuizThunk({ ... }));
        }
      } catch (error) {
        console.error('[HostQuizPanel] Failed to advance category:', error);
        toast.showToast({ message: error.message, type: 'error' });
      }
    } else {
      // More questions in current category
      console.log('[HostQuizPanel] Moving to next question in same category...');

      try {
        // ✅ NEW: Call updateRound to sync backend state
        await updateRound(session.id, currentCategoryIndex, nextQuestionIndex);

        // Update local state
        setCurrentQuestionIndex(nextQuestionIndex);

        const nextQuestion = templateQuestions[nextQuestionIndex];
        if (nextQuestion) {
          dispatch(startQuizThunk({ ... }));
        }
      } catch (error) {
        console.error('[HostQuizPanel] Failed to update round:', error);
        toast.showToast({ message: 'Failed to navigate to next question.' });
      }
    }
  }
}
```

**Key Changes:**
1. **Added `updateRound` call** before navigating to next question in same category
2. **Better logging** to show current position and navigation decisions
3. **Proper error handling** with user-friendly error messages
4. **Check `isComplete`** flag from backend to detect quiz completion

### Fix 2: Correct Quiz Game Detection

**[useQuizSync.ts:11-12](../apps/web/src/hooks/useQuizSync.ts#L11-L12)**

```typescript
// Check if session has a quiz game attached (in the games array)
const hasQuizGame = Boolean(session?.games?.some(g => g.type === 'quiz' && g.templateId));
```

**Changes:**
1. Look for quiz game in `session.games[]` array
2. Check `g.type === 'quiz'` to find quiz game
3. Verify it has a `templateId` (template attached)
4. Quiz sync now works when quiz game exists

## How Quiz Navigation Works Now

### Understanding the Structure:

**Quiz Template:**
```
Template: "General Knowledge Quiz"
├── Category 1: "History" (3 questions)
│   ├── Question 1
│   ├── Question 2
│   └── Question 3
├── Category 2: "Science" (5 questions)
│   ├── Question 1
│   ├── Question 2
│   ├── Question 3
│   ├── Question 4
│   └── Question 5
└── Category 3: "Geography" (2 questions)
    ├── Question 1
    └── Question 2
```

### Navigation Flow:

**Starting Quiz:**
1. Host clicks "Start Quiz"
2. Backend sets `currentCategoryIndex = 0, currentQuestionIndex = 0`
3. Frontend loads questions for Category 1 (History)
4. Shows "Question 1" from History

**Clicking "Next Question" (within category):**
1. `nextQuestionIndex = 1` (currently 0 + 1)
2. `nextQuestionIndex < templateQuestions.length` (1 < 3) ✅
3. Calls `updateRound(sessionId, 0, 1)` to sync backend
4. Updates local state: `currentQuestionIndex = 1`
5. Shows "Question 2" from History

**Clicking "Next Question" (end of category):**
1. Currently on Question 3 of History
2. `nextQuestionIndex = 3`
3. `nextQuestionIndex >= templateQuestions.length` (3 >= 3) ✅
4. Calls `advanceToNextRound(sessionId)`
5. Backend advances: `currentCategoryIndex = 1` (Science)
6. Calls `getRoundQuestions(sessionId)`
7. Loads 5 questions from Science category
8. Shows "Question 1" from Science

**Clicking "Next Question" (end of quiz):**
1. Currently on Question 2 of Geography (last question)
2. `nextQuestionIndex = 2`
3. `nextQuestionIndex >= templateQuestions.length` (2 >= 2) ✅
4. Calls `advanceToNextRound(sessionId)`
5. Backend returns: `{ isComplete: true }`
6. Shows: "🎉 Quiz Complete! All categories finished."

## How Quiz Sync Works Now

### Player Session Load:

1. **Player joins session**
2. **`useQuizSync` hook runs**
3. Checks: `session.games.some(g => g.type === 'quiz' && g.templateId)`
4. If quiz game exists: Set up WebSocket listener
5. Fetch initial quiz state from backend

### When Host Starts Quiz:

1. **Host clicks "Start Quiz"**
2. Backend creates quiz state
3. WebSocket broadcasts: `quiz:state-updated` event
4. **Players' `useQuizSync` receives event**
5. Updates Redux: `setQuizState(state)`
6. **`PlayerLobby` re-renders**
7. Checks: `quizState.status === 'running'` ✅
8. **Quiz game UI appears for players!**

## Changes Made

### [HostQuizPanel.tsx](../apps/web/src/components/HostQuizPanel.tsx)

**Lines 403-491:** Updated `handleNextQuestion` function
- Added `updateRound` API call before navigating within category
- Improved logging with current position details
- Better error handling with specific error messages
- Check `isComplete` flag to detect quiz end

### [useQuizSync.ts](../apps/web/src/hooks/useQuizSync.ts)

**Lines 11-12:** Fixed quiz game detection
- Changed from `session.quizTemplateId` to `session.games.some(...)`
- Now correctly detects quiz games in multi-game sessions

**Line 58:** Updated dependency array
- Changed `hasQuizTemplate` to `hasQuizGame`

## Testing Steps

### Test Issue 1: Quiz Navigation

1. **Upload a quiz template** with 10+ questions across 2+ categories
2. **Create session** with that template
3. **Start quiz**
4. **Click "Next Question" repeatedly**
5. **Expected:**
   - All questions appear in order
   - Advances through all categories
   - Shows completion message at end
6. **Check console logs** for navigation details

### Test Issue 2: Quiz Sync

1. **Create session** with quiz template
2. **Open player session** in another window/tab
3. **Activate quiz game** in host
4. **Expected:** Player sees "Waiting for host to start the game..."
5. **Click "Start Quiz"** as host
6. **Expected:** Quiz appears immediately for player
7. **Check console:**
   - Look for: `[useQuizSync] Setting up quiz sync`
   - Look for: `[useQuizSync] Received quiz:update event`

## API Calls

### updateRound
```
POST /api/sessions/:sessionId/round
Body: { categoryIndex: 0, questionIndex: 2 }
Response: Session (updated)
```

Called when: Moving to next question within same category

### advanceToNextRound
```
PUT /api/sessions/:sessionId/round/next
Response: {
  currentCategoryIndex: 1,
  currentQuestionIndex: 0,
  totalCategories: 3,
  isComplete: false
}
```

Called when: All questions in current category are done

### getRoundQuestions
```
GET /api/sessions/:sessionId/round/questions
Response: {
  session: { currentCategoryIndex: 0, currentQuestionIndex: 0 },
  template: { id: "...", name: "..." },
  currentCategory: { id: "...", name: "History" },
  questions: [ ... ], // Questions for current category only
  totalCategories: 3
}
```

Called when: Loading questions for current category

## Console Logs

### Navigation Logs:
```
[HostQuizPanel] Next question requested: {
  currentCategoryIndex: 0,
  currentQuestionIndex: 1,
  nextQuestionIndex: 2,
  questionsInCategory: 3,
  totalCategories: 3
}
[HostQuizPanel] Moving to next question in same category...
```

### Sync Logs (Player):
```
[useQuizSync] Session does not have a quiz game, skipping sync  // Before fix
[useQuizSync] Setting up quiz sync for session: abc123          // After fix
[useQuizSync] Received quiz:update event: { status: 'running' }
```

## Related Files

- [HostQuizPanel.tsx](../apps/web/src/components/HostQuizPanel.tsx) - Quiz host UI and navigation
- [useQuizSync.ts](../apps/web/src/hooks/useQuizSync.ts) - Quiz state WebSocket sync
- [PlayerLobby.tsx](../apps/web/src/screens/PlayerLobby.tsx) - Player view logic
- [api.ts](../apps/web/src/lib/api.ts) - API functions

## Benefits

1. **All Questions Appear:** Quiz navigates through entire template
2. **Players See Quiz:** Quiz sync works properly
3. **Better Debugging:** Console logs show what's happening
4. **Error Handling:** Clear error messages when things fail
5. **Backend Sync:** Frontend and backend stay in sync

## Troubleshooting

### Quiz Still Cycling Through 2 Questions:

1. **Check Console:** Look for navigation logs
2. **Check Backend:** Verify `updateRound` API is called
3. **Check Template:** Ensure template has multiple categories with multiple questions
4. **Check Response:** Network tab → verify `getRoundQuestions` returns correct questions

### Players Still Don't See Quiz:

1. **Check Console:** Look for `[useQuizSync]` logs
2. **Check Redux:** DevTools → `quiz.current` should have state
3. **Check Session:** Verify `session.games` contains quiz game
4. **Check WebSocket:** Ensure socket is connected
5. **Check Quiz Status:** `quizState.status` should be 'running'
