# Quiz Template Loading Fix

## Issue
After uploading a new quiz template, starting the quiz game would only show the 2 hardcoded prototype questions instead of the questions from the uploaded template.

## Root Cause

**Chicken-and-Egg Problem in [HostQuizPanel.tsx](../apps/web/src/components/HostQuizPanel.tsx#L106-L143)**

The component had a circular dependency:

1. **Template questions only loaded when quiz status === 'active'** (line 113)
2. But quiz status was never `'active'` (actual values are `'idle'`, `'running'`, `'revealed'`)
3. **Even if we fixed the status check**, there was still a timing issue:
   - Template questions loaded AFTER quiz started (when status === 'running')
   - But `handleStart()` used the `question` object to start the quiz
   - `question` came from SAMPLE_QUESTIONS because templates weren't loaded yet
   - **Result:** Quiz always started with sample questions

### The Problematic Flow:

```
Host clicks "Start Quiz"
  ↓
handleStart() runs
  ↓
Uses `question` object (from SAMPLE_QUESTIONS, templates not loaded yet)
  ↓
Dispatches startQuizThunk with SAMPLE_QUESTIONS[0]
  ↓
Quiz status becomes 'running'
  ↓
Template load effect triggers
  ↓
Template questions load... but quiz already started with wrong question!
```

## Solution

### Change Load Timing: Load BEFORE Starting

Load template questions **as soon as the quiz game is attached**, not after it starts:

**[HostQuizPanel.tsx:106-131](../apps/web/src/components/HostQuizPanel.tsx#L106-L131)**

```typescript
// Load template questions as soon as a quiz game with template is attached
// This ensures questions are loaded BEFORE starting the quiz
useEffect(() => {
  const quizGame = session?.games?.find(g => g.type === 'quiz');
  const quizTemplateId = quizGame?.templateId;

  if (!session?.id || !quizTemplateId || !quizGame) {
    // No quiz game attached, use sample questions
    setUsingTemplate(false);
    return;
  }

  // Quiz game with template exists - load the template questions
  // Load immediately so they're available when host clicks "Start Quiz"
  setLoadingTemplate(true);

  getRoundQuestions(session.id)
    .then((roundInfo) => {
      console.log('[HostQuizPanel] Template questions loaded:', roundInfo);
      setTemplateQuestions(roundInfo.questions);
      setCategories(quizTemplate?.categories || []);
      setCurrentCategoryIndex(roundInfo.session.currentCategoryIndex);
      setCurrentQuestionIndex(roundInfo.session.currentQuestionIndex);
      setTemplateName(roundInfo.template.name);
      setUsingTemplate(true);
    })
    .catch((error) => {
      console.error('[HostQuizPanel] Failed to load template questions:', error);
      setUsingTemplate(false);
      toast.showToast({ message: 'Failed to load quiz template...', type: 'error' });
    })
    .finally(() => {
      setLoadingTemplate(false);
    });
}, [session?.id, session?.games]);
```

### Key Changes:

1. **Removed status check** - No longer checking `quizStatus !== 'active'`
2. **Load on template attachment** - Loads when `quizTemplateId` exists, regardless of quiz status
3. **Load before start** - Questions available immediately for `handleStart()`

### The Fixed Flow:

```
Host creates session with Quiz template
  ↓
Quiz game added to session.games[] with templateId
  ↓
Template load effect triggers IMMEDIATELY
  ↓
Template questions load successfully
  ↓
usingTemplate = true, templateQuestions populated
  ↓
Host clicks "Start Quiz"
  ↓
handleStart() runs
  ↓
Uses `question` object (from templateQuestions[0] ✓)
  ↓
Dispatches startQuizThunk with CORRECT question from template!
  ↓
Quiz starts with template questions 🎉
```

## Changes Made

### [HostQuizPanel.tsx](../apps/web/src/components/HostQuizPanel.tsx)

**Lines 106-131:** Updated template loading logic
- Changed comment from "when quiz game is explicitly started" to "as soon as a quiz game with template is attached"
- Removed status check (`quizStatus !== 'active'`)
- Removed unnecessary status checks (`quizStatus === 'idle'`, etc.)
- Load questions immediately when template is detected
- Added better console logs for debugging

**Before:**
```typescript
if (quizStatus !== 'active') {
  setUsingTemplate(false);
  return;
}
```

**After:**
```typescript
if (!session?.id || !quizTemplateId || !quizGame) {
  setUsingTemplate(false);
  return;
}
// Load immediately - no status check!
```

## How It Works Now

### Template Upload & Session Creation:

1. **Host uploads quiz template**
   - Template saved to database with categories and questions

2. **Host creates session**
   - Selects quiz template from dropdown
   - Session created with quiz game: `{ type: 'quiz', templateId: 'xxx' }`

3. **HostQuizPanel loads**
   - Detects `session.games` contains quiz with `templateId`
   - **Immediately calls `getRoundQuestions(sessionId)`**
   - Loads all questions from template
   - Sets `usingTemplate = true`

4. **Host clicks "Start Quiz"**
   - `handleStart()` runs
   - Uses `question` from `templateQuestions[0]` (not SAMPLE_QUESTIONS)
   - Starts quiz with correct template question!

5. **Players see template questions**
   - Quiz syncs via WebSocket
   - Players see the actual uploaded questions

### Question Object Resolution:

The `question` useMemo (lines 69-89) prioritizes template questions:

```typescript
const question = useMemo(() => {
  if (usingTemplate && templateQuestions.length > 0) {
    const currentQuestion = templateQuestions[currentQuestionIndex];
    return {
      questionId: currentQuestion.id,
      prompt: currentQuestion.question,
      options: currentQuestion.options,
      correct: currentQuestion.correctAnswer,
      duration: currentQuestion.timeLimit || 30,
      points: currentQuestion.points || 10,
    };
  }

  // Fallback to sample questions (only if no template)
  return SAMPLE_QUESTIONS[questionIndex % SAMPLE_QUESTIONS.length];
}, [usingTemplate, templateQuestions, currentQuestionIndex, questionIndex]);
```

## Testing Steps

1. **Upload a Quiz Template:**
   - Go to Dashboard → Templates
   - Click "Upload Template"
   - Upload a JSON file with your questions
   - Verify template appears in list

2. **Create Session with Template:**
   - Go to Dashboard
   - Click "Create Session"
   - Select your uploaded template from dropdown
   - Create session

3. **Check Console:**
   - Open DevTools → Console
   - Look for: `[HostQuizPanel] Template questions loaded:`
   - Should see your template questions listed

4. **Start Quiz:**
   - Click "Start Quiz" button
   - **Expected:** First question from your template appears
   - **NOT:** The prototype questions about fireworks/Pongal

5. **Verify All Questions:**
   - Answer question, reveal, next round
   - All questions should be from your template
   - Check categories match your template

## Technical Details

### API Call:
```
GET /api/sessions/:sessionId/quiz/round
```

### Response:
```json
{
  "session": {
    "currentCategoryIndex": 0,
    "currentQuestionIndex": 0
  },
  "template": {
    "id": "xxx",
    "name": "My Quiz Template",
    "categories": [...]
  },
  "questions": [
    {
      "id": "q1",
      "question": "What is React?",
      "options": ["Library", "Framework", "Language", "Tool"],
      "correctAnswer": 0,
      "timeLimit": 30,
      "points": 10
    },
    ...
  ]
}
```

### State Updates:
- `templateQuestions` - Array of questions from template
- `categories` - Categories from template
- `currentCategoryIndex` - Current category being played
- `currentQuestionIndex` - Current question in category
- `usingTemplate` - Boolean flag (true when template loaded)
- `loadingTemplate` - Boolean flag (true during load)

## Related Files

- [HostQuizPanel.tsx](../apps/web/src/components/HostQuizPanel.tsx) - Main quiz host UI
- [api.ts](../apps/web/src/lib/api.ts) - API functions (`getRoundQuestions`)
- [quizSlice.ts](../apps/web/src/store/slices/quizSlice.ts) - Quiz Redux state
- [sessionSlice.ts](../apps/web/src/store/slices/sessionSlice.ts) - Session state with games

## Benefits

1. **Correct Questions:** Quiz shows uploaded template questions
2. **Immediate Loading:** Questions load as soon as template attached
3. **Better UX:** No delay when starting quiz
4. **Debugging:** Better console logs show what's happening
5. **Fallback:** Sample questions still work if no template

## Fallback Behavior

If template loading fails:
- Error logged to console
- Error toast shown to host
- `usingTemplate` set to `false`
- Quiz falls back to `SAMPLE_QUESTIONS`
- Host can still run quiz (with sample questions)

## Future Improvements

1. **Loading Indicator:** Show "Loading template..." spinner
2. **Question Preview:** Show list of template questions before starting
3. **Template Validation:** Verify template has questions before starting
4. **Question Count:** Show "Question 1 of 20" in UI
5. **Category Display:** Show current category name
6. **Edit During Quiz:** Allow editing template questions mid-game
7. **Template Refresh:** Reload template if it changes

## Troubleshooting

### Still Seeing Sample Questions:

1. **Check Console:**
   - Look for `[HostQuizPanel] Template questions loaded:`
   - If missing, template didn't load

2. **Check Session:**
   - Redux DevTools → `session.current.games`
   - Verify quiz game has `templateId` field
   - Example: `{ type: 'quiz', templateId: 'abc123' }`

3. **Check API Response:**
   - Network tab → Filter "round"
   - Check `GET /api/sessions/.../quiz/round` response
   - Should contain your template questions

4. **Check Template Upload:**
   - Go to Templates page
   - Verify template exists and has questions
   - Click grid icon to view questions

### Template Not Loading:

1. **Backend Running:** Ensure API server is running (port 3000)
2. **Template Exists:** Check database for template
3. **Session Link:** Verify session was created with templateId
4. **CORS:** Check browser console for CORS errors
5. **Auth:** Ensure you're logged in as host
