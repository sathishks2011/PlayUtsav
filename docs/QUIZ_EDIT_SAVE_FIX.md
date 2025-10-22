# Quiz Edit Grid Save Fix

## Issue
Changes made in the quiz edit grid were not saving properly. Users could edit questions but the changes would not persist.

## Root Cause

**React Hooks Violation in [QuestionGrid.tsx](../apps/web/src/components/QuestionGrid.tsx#L109)**

The `useToast` hook was being called **inside a catch block**, which violates the Rules of Hooks:

```typescript
// WRONG - Hook called conditionally inside catch block
catch (error) {
  console.error('Failed to update question:', error);
  const toast = useToast(); // ❌ ILLEGAL - Hook called inside catch
  toast.showToast({ message: 'Failed...', type: 'error' });
}
```

### Why This Breaks Saving:

1. **React crashes** when hooks are called conditionally or inside callbacks
2. The error during render **prevents the save from completing**
3. Even if the API call succeeds, React's error causes the component to fail
4. **No feedback** to user about success or failure

### Rules of Hooks:
React Hooks must be called:
- ✅ At the **top level** of the component
- ✅ In the **same order** every render
- ❌ NOT inside loops, conditions, or nested functions
- ❌ NOT inside try/catch blocks

## Solution

### 1. Move `useToast` to Top Level
**File:** [QuestionGrid.tsx:55](../apps/web/src/components/QuestionGrid.tsx#L55)

```typescript
export default function QuestionGrid({ template, onClose }: QuestionGridProps) {
  const dispatch = useAppDispatch();
  const toast = useToast(); // ✅ Called at top level
  const [sorting, setSorting] = useState<SortingState>([]);
  // ... rest of hooks
```

### 2. Use Toast Instance in Catch Block
**File:** [QuestionGrid.tsx:106-115](../apps/web/src/components/QuestionGrid.tsx#L106-L115)

```typescript
try {
  await dispatch(updateQuestion({ ... })).unwrap();

  // Show success message
  toast.showToast({
    message: 'Question updated successfully!',
    type: 'success',
    duration: 3000
  });

  setEditingQuestionId(null);
  setEditForm({});
} catch (error) {
  console.error('Failed to update question:', error);

  // Use existing toast instance (not create new one)
  toast.showToast({
    message: `Failed to update question: ${error instanceof Error ? error.message : 'Unknown error'}`,
    type: 'error',
    duration: 5000
  });
}
```

## Changes Made

### [QuestionGrid.tsx](../apps/web/src/components/QuestionGrid.tsx)

**Line 55:** Added `useToast` hook at component top level
```typescript
const toast = useToast();
```

**Lines 106-115:** Fixed error handling
```typescript
// Added success toast
toast.showToast({ message: 'Question updated successfully!', type: 'success', duration: 3000 });

// Fixed error toast (removed illegal hook call)
toast.showToast({
  message: `Failed to update question: ${error instanceof Error ? error.message : 'Unknown error'}`,
  type: 'error',
  duration: 5000
});
```

## How It Works Now

### Save Flow:

1. **User edits question** in the grid
2. **Clicks "Save Changes"**
3. `handleSaveEdit` dispatches Redux action
4. **API call** to `PUT /quiz-templates/questions/:id`
5. **Success:**
   - Redux updates local state
   - Green success toast appears
   - Edit form closes
   - Question updates in grid
6. **Failure:**
   - Red error toast appears with message
   - Edit form stays open
   - User can retry

### Redux State Update:

When save succeeds, Redux updates two places:

1. **Selected Template** (what you're editing):
```typescript
state.selectedTemplate.categories.forEach((category) => {
  const questionIndex = category.questions.findIndex((q) => q.id === action.payload.id);
  if (questionIndex !== -1) {
    category.questions[questionIndex] = action.payload; // Updates in-place
  }
});
```

2. **Templates List** (for consistency):
```typescript
state.templates.forEach((template) => {
  template.categories.forEach((category) => {
    const questionIndex = category.questions.findIndex((q) => q.id === action.payload.id);
    if (questionIndex !== -1) {
      category.questions[questionIndex] = action.payload; // Updates in-place
    }
  });
});
```

## Testing Steps

1. **Open Quiz Template Manager:**
   - Go to Dashboard → Templates
   - Click on a Quiz template
   - Click "Edit Questions" or the grid icon

2. **Edit a Question:**
   - Find a question in the grid
   - Click "Edit"
   - Edit form expands below the row
   - Change question text, options, or settings

3. **Save Changes:**
   - Click "Save Changes" button
   - **Expected:** Green toast "Question updated successfully!"
   - **Expected:** Edit form closes
   - **Expected:** Grid shows updated values

4. **Verify Persistence:**
   - Close the grid (click X)
   - Reopen the grid
   - **Expected:** Changes are still there
   - Refresh the page
   - **Expected:** Changes persist (saved to database)

5. **Test Error Handling:**
   - Disconnect from network
   - Edit a question
   - Click "Save Changes"
   - **Expected:** Red toast "Failed to update question: ..."
   - **Expected:** Edit form stays open
   - Reconnect and retry
   - **Expected:** Save succeeds

## Technical Details

### API Endpoint:
```
PUT /api/quiz-templates/questions/:questionId
```

### Request Body:
```typescript
{
  question?: string;
  options?: string[];
  correctAnswer?: number;
  displayOrder?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  points?: number;
  timeLimit?: number;
  explanation?: string;
  imageUrl?: string;
}
```

### Response:
```typescript
{
  id: string;
  categoryId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  displayOrder: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  points?: number;
  timeLimit?: number;
  explanation?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Related Files

- [QuestionGrid.tsx](../apps/web/src/components/QuestionGrid.tsx) - Edit grid UI
- [quizTemplateSlice.ts](../apps/web/src/store/slices/quizTemplateSlice.ts) - Redux state
- [api.ts](../apps/web/src/lib/api.ts) - API functions
- [ToastProvider.tsx](../apps/web/src/components/ToastProvider.tsx) - Toast notifications

## Benefits

1. **Saves Work:** Changes actually persist to database
2. **User Feedback:** Success/error toasts inform user
3. **No Crashes:** Proper hook usage prevents React errors
4. **Better UX:** Clear feedback when things go wrong
5. **Debugging:** Error messages show specific failure reasons

## Common Errors Fixed

### Before Fix:
```
❌ Error: Invalid hook call
❌ Changes don't save
❌ No user feedback
❌ Silent failures
```

### After Fix:
```
✅ Hooks called properly
✅ Changes save to database
✅ Success toast on save
✅ Error toast with details
```

## Future Improvements

1. **Optimistic Updates:** Update UI before API call completes
2. **Undo/Redo:** Allow reverting changes
3. **Bulk Edit:** Edit multiple questions at once
4. **Validation:** Client-side validation before save
5. **Auto-Save:** Save changes automatically after delay
6. **Version History:** Track question edit history
7. **Conflict Detection:** Warn if question was edited by someone else

## Troubleshooting

### Changes Still Not Saving:

1. **Check Network Tab:**
   - Open DevTools → Network
   - Edit and save a question
   - Look for `PUT /api/quiz-templates/questions/...`
   - Check response status (should be 200)

2. **Check Console:**
   - Look for errors
   - Should see "Question updated successfully!" log

3. **Check Redux DevTools:**
   - After save, inspect state
   - Navigate to `quizTemplate.selectedTemplate.categories`
   - Verify question has updated values

4. **Check Database:**
   - If using SQLite: `sqlite3 dev.db "SELECT * FROM Question WHERE id = '...'"`
   - Verify changes are in database

### Error Toast Appears:

1. **Read Error Message:** Toast shows specific error
2. **Check API Server:** Ensure backend is running
3. **Check Auth:** May need to re-login
4. **Check Permissions:** Ensure user can edit templates
