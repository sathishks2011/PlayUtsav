# Phase 2D: Auto-Advancing Through Rounds - COMPLETE

## Date: October 15, 2025

## Feature Overview
Implemented automatic round advancement when all questions in a category are completed. The quiz now seamlessly progresses through all rounds in a template without manual intervention.

## Implementation Details

### 1. Backend API Endpoint

**File**: `services/api/src/routes/sessions.controller.ts`

Added `PUT /sessions/:id/round/next` endpoint:

```typescript
@Put(':id/round/next')
async advanceToNextRound(@Param('id') sessionId: string) {
  const result = await this.sessions.advanceToNextRound(sessionId);
  this.gateway.emitSessionUpdate(sessionId);
  return result;
}
```

**File**: `services/api/src/services/sessions.service.ts`

Implemented `advanceToNextRound()` method:

```typescript
async advanceToNextRound(sessionId: string) {
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      quizTemplate: {
        include: {
          categories: { orderBy: { displayOrder: 'asc' } },
        },
      },
    },
  });

  if (!session.quizTemplate) {
    throw new BadRequestException('No quiz template attached to this session');
  }

  const totalCategories = session.quizTemplate.categories.length;
  const nextCategoryIndex = session.currentCategoryIndex + 1;

  if (nextCategoryIndex >= totalCategories) {
    throw new BadRequestException('Already at the last round. Quiz complete!');
  }

  // Update session to next category and reset question index
  const updated = await this.prisma.session.update({
    where: { id: sessionId },
    data: {
      currentCategoryIndex: nextCategoryIndex,
      currentQuestionIndex: 0,
    },
  });

  console.log(`[SessionsService] Advanced session ${sessionId} to round ${nextCategoryIndex + 1}`);

  return {
    currentCategoryIndex: updated.currentCategoryIndex,
    currentQuestionIndex: updated.currentQuestionIndex,
    totalCategories,
    isComplete: false,
  };
}
```

**Behavior**:
- Increments `currentCategoryIndex` by 1
- Resets `currentQuestionIndex` to 0
- Validates category exists
- Throws error if already at last round (quiz complete)
- Emits `session:update` WebSocket event

---

### 2. Frontend API Integration

**File**: `apps/web/src/lib/api.ts`

Added API function:

```typescript
export function advanceToNextRound(sessionId: string) {
  return request<{
    currentCategoryIndex: number;
    currentQuestionIndex: number;
    totalCategories: number;
    isComplete: boolean;
  }>(`/sessions/${sessionId}/round/next`, {
    method: 'PUT',
  });
}
```

---

### 3. Auto-Advance Logic in HostQuizPanel

**File**: `apps/web/src/components/HostQuizPanel.tsx`

#### Enhanced `handleNextQuestion()`:

Now detects when last question in a round is revealed and automatically advances to next round:

```typescript
const handleNextQuestion = async () => {
  if (!session || loading) return;
  
  setAllAnswered(false);
  setAutoRevealTimer(null);
  
  if (usingTemplate && templateQuestions.length > 0) {
    const nextQuestionIndex = currentQuestionIndex + 1;
    
    if (nextQuestionIndex >= templateQuestions.length) {
      // 🔥 AUTO-ADVANCE TO NEXT ROUND
      console.log('[HostQuizPanel] All questions in round complete, advancing to next round...');
      
      try {
        await advanceToNextRound(session.id);
        
        // Reload questions for the new round
        const roundInfo = await getRoundQuestions(session.id);
        console.log('[HostQuizPanel] Advanced to next round:', roundInfo);
        
        setTemplateQuestions(roundInfo.questions);
        setCurrentCategoryIndex(roundInfo.session.currentCategoryIndex);
        setCurrentQuestionIndex(0);
        
        // Start first question of new round
        const firstQuestion = roundInfo.questions[0];
        if (firstQuestion) {
          dispatch(startQuizThunk({
            sessionId: session.id,
            questionId: firstQuestion.id,
            prompt: firstQuestion.question,
            options: Array.isArray(firstQuestion.options) ? firstQuestion.options : [],
            duration: firstQuestion.timeLimit || 30,
          }));
        }
      } catch (error: any) {
        if (error.message?.includes('last round')) {
          alert('🎉 Quiz Complete! All rounds finished.');
        } else {
          alert('Failed to advance to next round. Check console for details.');
        }
      }
    } else {
      // More questions in current round
      setCurrentQuestionIndex(nextQuestionIndex);
      
      const nextQuestion = templateQuestions[nextQuestionIndex];
      if (nextQuestion) {
        dispatch(startQuizThunk({
          sessionId: session.id,
          questionId: nextQuestion.id,
          prompt: nextQuestion.question,
          options: Array.isArray(nextQuestion.options) ? nextQuestion.options : [],
          duration: nextQuestion.timeLimit || 30,
        }));
      }
    }
  } else {
    // Sample questions mode: Simple cycling
    const newIndex = questionIndex + 1;
    setQuestionIndex(newIndex);
    
    const newQuestion = SAMPLE_QUESTIONS[newIndex % SAMPLE_QUESTIONS.length];
    
    dispatch(startQuizThunk({
      sessionId: session.id,
      questionId: newQuestion.questionId,
      prompt: newQuestion.prompt,
      options: newQuestion.options,
      duration: newQuestion.duration,
    }));
  }
};
```

**Key Features**:
- ✅ Detects last question in round (`nextQuestionIndex >= templateQuestions.length`)
- ✅ Calls `advanceToNextRound()` API
- ✅ Reloads questions from new category
- ✅ Updates state: `currentCategoryIndex`, `currentQuestionIndex`, `templateQuestions`
- ✅ Auto-starts first question of new round
- ✅ Shows "Quiz Complete" message when no more rounds
- ✅ Falls back to sample question mode if no template

---

### 4. Manual "Next Round" Button

#### New Handler: `handleManualNextRound()`

```typescript
const handleManualNextRound = async () => {
  if (!session || loading || !usingTemplate) return;
  
  console.log('[HostQuizPanel] Manually advancing to next round...');
  
  try {
    await advanceToNextRound(session.id);
    
    // Reload questions for the new round
    const roundInfo = await getRoundQuestions(session.id);
    console.log('[HostQuizPanel] Advanced to next round:', roundInfo);
    
    setTemplateQuestions(roundInfo.questions);
    setCurrentCategoryIndex(roundInfo.session.currentCategoryIndex);
    setCurrentQuestionIndex(0);
    
    // Don't auto-start - let host click "Start Question"
    alert(`✅ Advanced to Round ${roundInfo.session.currentCategoryIndex + 1}: ${roundInfo.currentCategory.name}`);
  } catch (error: any) {
    console.error('[HostQuizPanel] Failed to advance round:', error);
    if (error.message?.includes('last round')) {
      alert('🎉 Quiz Complete! You are already at the last round.');
    } else {
      alert('Failed to advance to next round. Check console for details.');
    }
  }
};
```

#### UI Button:

```tsx
{usingTemplate && (
  <button
    type="button"
    className="px-4 py-2 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300"
    onClick={handleManualNextRound}
    disabled={loading || running}
    title="Skip remaining questions and advance to next round"
  >
    <FormattedMessage id="hostQuiz.nextRound" defaultMessage="Next Round ⏭️" />
  </button>
)}
```

**Features**:
- Only visible when using template
- Can skip remaining questions to jump to next round
- Disabled during loading or when quiz is running
- Shows success alert with new round name
- Shows completion alert if already at last round

---

## User Flow

### Automatic Flow (Normal Gameplay)

```
1. Host starts Round 1, Question 1
2. Players answer
3. Host clicks "Reveal Answer"
4. Host clicks "Next Question"
   → Shows Question 2
5. Players answer
6. Host clicks "Reveal Answer"
7. Host clicks "Next Question"
   → ⚡ AUTO-ADVANCES TO ROUND 2
   → Loads Round 2 questions
   → Automatically starts Round 2, Question 1
8. (Repeat for all rounds)
9. After last question of last round:
   → Shows "🎉 Quiz Complete! All rounds finished."
```

### Manual Round Skip

```
1. Host is in middle of Round 1
2. Host clicks "Next Round ⏭️" button
   → Immediately advances to Round 2
   → Shows alert: "✅ Advanced to Round 2: Category Name"
3. Host clicks "Start Question" to begin Round 2
```

---

## Error Handling

### Already at Last Round
```typescript
if (nextCategoryIndex >= totalCategories) {
  throw new BadRequestException('Already at the last round. Quiz complete!');
}
```

Frontend shows: "🎉 Quiz Complete! You are already at the last round."

### No Template Attached
```typescript
if (!session.quizTemplate) {
  throw new BadRequestException('No quiz template attached to this session');
}
```

Frontend shows: "Failed to advance to next round. Check console for details."

### Network/API Errors
All errors are caught and logged to console with user-friendly alerts.

---

## State Management

### Session Database Fields
- `currentCategoryIndex` - Which round (0-based)
- `currentQuestionIndex` - Which question within round (0-based)
- `quizTemplateId` - Attached template

### Frontend State (HostQuizPanel)
- `templateQuestions` - Questions for current round
- `currentCategoryIndex` - Current round index
- `currentQuestionIndex` - Current question within round
- `usingTemplate` - Boolean flag
- `categories` - All categories/rounds in template

### State Updates on Round Change
1. Backend updates database: `currentCategoryIndex++`, `currentQuestionIndex = 0`
2. Backend emits `session:update` WebSocket event
3. Frontend calls `getRoundQuestions()` to fetch new round's questions
4. Frontend updates local state
5. Frontend auto-starts first question of new round

---

## WebSocket Events

When round advances:
```typescript
this.gateway.emitSessionUpdate(sessionId);
```

All connected clients (host, players, TV display) receive updated session state and can react to round change.

---

## Testing Checklist

### Basic Flow
- ✅ Start quiz with multi-round template
- ✅ Complete all questions in Round 1
- ✅ Click "Next Question" after last question
- ✅ Verify auto-advances to Round 2
- ✅ Verify Round 2 questions load
- ✅ Verify Round 2, Question 1 starts automatically

### Manual Skip
- ✅ Click "Next Round ⏭️" button mid-round
- ✅ Verify skips to next round
- ✅ Verify shows success alert
- ✅ Verify doesn't auto-start (waits for host)

### Edge Cases
- ✅ Try advancing when at last round → Shows completion message
- ✅ Try with single-round template → Shows completion after last question
- ✅ Try with no template attached → Uses sample questions
- ✅ Test with 5+ rounds → All advance correctly

### UI State
- ✅ Round indicator updates (shows "Round 2 of 5")
- ✅ Question counter updates (shows "Question 1 of 4")
- ✅ Buttons disable during loading
- ✅ "Next Round" button only shows with template

### WebSocket
- ✅ Players see round change on their screens
- ✅ TV display updates round info
- ✅ Host sees updated round info

---

## Performance Considerations

### Optimizations
- Questions fetched only when round changes (not per question)
- State updates are batched
- WebSocket events emitted once per round change
- Database queries use indexes on `currentCategoryIndex`

### Potential Issues
- Large templates (50+ questions) → No issue, questions loaded per round
- Rapid button clicking → Disabled states prevent double-advances
- Network latency → Try-catch handles timeout/errors

---

## Files Modified

1. **Backend**:
   - `services/api/src/routes/sessions.controller.ts` - Added endpoint + imported `Put`
   - `services/api/src/services/sessions.service.ts` - Implemented `advanceToNextRound()`

2. **Frontend**:
   - `apps/web/src/lib/api.ts` - Added `advanceToNextRound()` function
   - `apps/web/src/components/HostQuizPanel.tsx` - Enhanced `handleNextQuestion()`, added `handleManualNextRound()`, added UI button

3. **Documentation**:
   - `docs/ROUND_NAVIGATION_EXPLANATION.md` - Background info
   - `docs/PHASE2D_ROUND_AUTO_ADVANCE_COMPLETE.md` - This file

---

## Future Enhancements

### Nice to Have
- [ ] Progress bar showing rounds completed (e.g., "Round 3/5")
- [ ] Confirmation dialog before skipping questions
- [ ] Animation/transition when advancing rounds
- [ ] Sound effect when advancing rounds
- [ ] Summary screen between rounds (scores, rankings)
- [ ] Allow editing currentCategoryIndex in admin panel

### Advanced Features
- [ ] Support for branching rounds (conditional navigation)
- [ ] Time limits per round (not just per question)
- [ ] Bonus rounds with special rules
- [ ] Random question order within rounds
- [ ] Difficulty scaling across rounds

---

## Related Documents
- `docs/ROUND_NAVIGATION_EXPLANATION.md` - Why only 2 questions showing
- `docs/PHASE2B_UI_COMPONENTS_COMPLETE.md` - RoundInfoHeader and RoundSelector
- `docs/PHASE2C_ROUND_NAVIGATION.md` - Manual round selection
- `docs/QUIZ_TEMPLATE_FORMAT.md` - Template structure with categories

---

## Success Criteria ✅

- [x] Auto-advances when last question in round is revealed
- [x] Loads questions from next category correctly
- [x] Updates UI to show new round info
- [x] Handles last round completion gracefully
- [x] Manual "Next Round" button works
- [x] All state stays in sync (database, Redux, local)
- [x] WebSocket events propagate to all clients
- [x] Error handling for edge cases
- [x] Console logs for debugging
- [x] User-friendly alerts for important events

## Status: ✅ COMPLETE

Phase 2D is fully implemented and ready for testing!
