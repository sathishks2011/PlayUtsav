# Quiz Template Round/Category System Explanation

## Date: October 15, 2025

## Issue: "Why am I seeing only 2 questions?"

### Root Cause
The quiz system is working as designed! Your quiz template uses a **category/round-based system**, and you're currently seeing only the questions from the **first category (Round 1)**.

### How It Works

#### Template Structure
```
Quiz Template
├── Category 1 (Round 1) - 2 questions ← YOU ARE HERE
├── Category 2 (Round 2) - X questions
├── Category 3 (Round 3) - X questions
└── ...
```

#### Session Tracking
Each session tracks:
- `currentCategoryIndex` - Which round/category you're on (default: 0 = first round)
- `currentQuestionIndex` - Which question within that round (default: 0)

#### Backend Filtering
The API endpoint `/sessions/:id/round/questions` returns questions **only from the current category**:

```typescript
// services/api/src/services/sessions.service.ts:271
const currentCategory = categories[session.currentCategoryIndex]; // ← Filters by current category
return {
  questions: currentCategory.questions.map(...),  // ← Only questions from current category
  totalCategories: categories.length,
};
```

### Current Behavior
1. **Quiz starts** → `currentCategoryIndex = 0` (first category/round)
2. **Frontend loads questions** → Gets only questions from category 0
3. **Host sees 2 questions** → These are ALL the questions in Round 1
4. **When done with Round 1** → Should advance to `currentCategoryIndex = 1` (Round 2)

### What You Should See

#### Round Selector UI (Planned)
The `RoundSelector` component should let you:
- See which round you're on (Round 1, Round 2, etc.)
- See total number of rounds
- Navigate between rounds
- See how many questions are in each round

#### Auto-Advance (Not Yet Implemented)
According to the todo list, **Phase 2D** (not complete yet) should:
- Automatically advance to the next round when all questions in current round are revealed
- Update `currentCategoryIndex` in the backend
- Load questions from the next category

### How to See All Questions

#### Option 1: Check Your Template
Look at the template you uploaded/attached. Count how many categories it has and how many questions per category:

```json
{
  "categories": [
    {
      "name": "Round 1",
      "questions": [Q1, Q2]  ← You're seeing these
    },
    {
      "name": "Round 2", 
      "questions": [Q3, Q4, Q5, Q6]  ← Will see after advancing
    },
    {
      "name": "Round 3",
      "questions": [Q7, Q8, Q9]  ← Will see after Round 2
    }
  ]
}
```

#### Option 2: Manual Round Navigation (if UI exists)
If the RoundSelector component is visible:
1. Look for round navigation controls
2. Click "Next Round" or select a different round
3. Questions will reload for that round

#### Option 3: Complete Current Round
Play through all questions in Round 1:
1. Start first question
2. Players answer
3. Reveal answer
4. Start second question
5. Players answer
6. Reveal answer
7. (Auto-advance should trigger to Round 2 - if implemented)

### Verifying Your Template

To see how many questions your template has in each category, check:

1. **Frontend Console**:
   - Look for `[HostQuizPanel] Template questions loaded:` log
   - Should show array of questions for current round only

2. **Backend Database**:
   ```sql
   SELECT c.name, c.displayOrder, COUNT(q.id) as question_count
   FROM "QuizCategory" c
   LEFT JOIN "Question" q ON q."categoryId" = c.id
   WHERE c."templateId" = 'YOUR_TEMPLATE_ID'
   GROUP BY c.id, c.name, c.displayOrder
   ORDER BY c.displayOrder;
   ```

3. **Template File** (if you have the original JSON):
   - Count categories
   - Count questions per category

### What's Missing (From Todo List)

✅ **Completed**:
- Template attachment
- Round info display
- Round selector UI
- Category/round data structure

❌ **Not Yet Implemented** (Phase 2D):
- Auto-advance to next round after all questions revealed
- Update `currentCategoryIndex` when round completes
- "Next Round" button functionality
- Progress indicator showing "Round X of Y"

### Expected Workflow (When Complete)

```
1. Host starts quiz → Round 1 (2 questions)
2. Host reveals Q1, Q2
3. System auto-advances → Round 2 (4 questions)  ← NOT YET IMPLEMENTED
4. Host reveals Q3, Q4, Q5, Q6
5. System auto-advances → Round 3 (3 questions)  ← NOT YET IMPLEMENTED
6. Host reveals Q7, Q8, Q9
7. Quiz complete!
```

### Temporary Workaround

If you need to test all questions RIGHT NOW before round navigation is implemented:

#### Option A: Create Single-Round Template
Reorganize your template to have ONE category with all questions:
```json
{
  "categories": [
    {
      "name": "All Questions",
      "questions": [Q1, Q2, Q3, Q4, Q5, ...]  // All questions in one category
    }
  ]
}
```

#### Option B: Manually Update Database
Change `currentCategoryIndex` in database to test other rounds:
```sql
-- View questions in Round 2 (category 1)
UPDATE "Session" 
SET "currentCategoryIndex" = 1 
WHERE id = 'YOUR_SESSION_ID';
```

Then refresh the host panel to load Round 2 questions.

### Next Steps

To implement full round navigation (Phase 2D), need to:

1. **Add "Next Round" button** in HostQuizPanel
2. **Create API endpoint** to advance round:
   ```typescript
   PUT /sessions/:id/round/next
   // Increments currentCategoryIndex
   // Resets currentQuestionIndex to 0
   ```
3. **Update logic** to call next round after last question revealed
4. **Reload questions** from new category
5. **Show progress**: "Round 2 of 5" indicator

## Related Files
- `services/api/src/services/sessions.service.ts:230` - getCurrentRoundQuestions()
- `apps/web/src/components/HostQuizPanel.tsx:103` - Template loading
- `services/api/prisma/schema.prisma:55` - Session.currentCategoryIndex field
- Todo list: "Phase 2D: HostQuizPanel - Auto-Advancing"
