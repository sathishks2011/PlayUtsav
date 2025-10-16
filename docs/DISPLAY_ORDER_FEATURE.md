# Display Order Feature Documentation

## Overview
The Quiz Template system now supports display order management for both categories and questions, allowing hosts to control the sequence in which content is presented during quiz sessions.

## Features Implemented

### 1. Display Order Column in Grid
- Added a `#` column showing the display order number for each question
- Display order is shown in monospace font for easy scanning
- Column is sortable (click header to sort by display order)

### 2. Category Display Order
- Each category has a `displayOrder` field
- Category filter dropdown shows the display order for each category
- Example: "General Knowledge (Order: 1)"

### 3. Question Display Order Editing
- Added "Display Order" input field in the edit form
- Field appears in a 4-column grid alongside Difficulty, Points, and Time Limit
- Includes helpful hint: "Order within category"
- Minimum value: 0

### 4. User Interface Enhancements

#### Search & Filter Bar
- **Global Search**: Search across all columns (question text, category, difficulty, etc.)
- **Category Filter**: Dropdown to filter questions by specific category
- **Helpful Tip**: "💡 Tip: Click column headers to sort. Edit display order to change question sequence within categories."

#### Edit Form Layout
```
Grid Layout (4 columns):
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Display Order   │ Difficulty      │ Points          │ Time Limit      │
│ [0-999]         │ [EASY/MED/HARD] │ [100]           │ [30s]          │
│ Order within cat│                 │                 │                 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### 5. Backend Integration
- Updated `UpdateQuestionDTO` to include optional `displayOrder` field
- Backend service already supported `displayOrder` updates
- Redux action includes `displayOrder` in update payload

## How Display Order Works

### For Questions
- **Scope**: Display order is unique within each category
- **Default**: Questions are typically numbered 0, 1, 2, etc. within their category
- **Changing Order**: Edit the question and update the "Display Order" field
- **Effect**: During quiz playback, questions will be presented in ascending display order

### For Categories
- **Scope**: Display order determines the sequence of categories in the quiz
- **View**: Shown in the category filter dropdown
- **Currently**: Categories can be viewed but not edited in the grid (managed during template creation)

## Usage Examples

### Example 1: Reordering Questions
To move Question #5 to appear before Question #3:
1. Click "Edit" on the question currently at position 5
2. Change "Display Order" from 5 to 2
3. Click "Save Changes"
4. The question will now appear in position 2

### Example 2: Finding Questions by Category
1. Click the category dropdown in the filter bar
2. Select a category (e.g., "Science (Order: 2)")
3. Grid shows only questions from that category
4. Questions are displayed in their display order

### Example 3: Sorting by Display Order
1. Click the "#" column header
2. Questions sort by display order (ascending)
3. Click again to sort descending
4. Useful for verifying question sequence

## Best Practices

1. **Sequential Numbering**: Use sequential numbers (0, 1, 2, 3...) for clarity
2. **Leave Gaps**: Consider using multiples of 10 (0, 10, 20, 30...) to make it easier to insert questions later
3. **Category Consistency**: Ensure all questions within a category have unique display orders
4. **Testing**: Always test the quiz flow after reordering to ensure the sequence makes sense

## Technical Details

### Data Types
```typescript
// Question Response
displayOrder: number;  // Required field in QuestionResponse

// Category Response
displayOrder: number;  // Required field in CategoryResponse

// Update DTO
displayOrder?: number; // Optional in UpdateQuestionDTO
```

### API Endpoint
```
PUT /quiz-templates/questions/:questionId
Body: {
  displayOrder: 5,
  // ... other fields
}
```

### Database Schema
```prisma
model QuizQuestion {
  displayOrder Int
  // ... other fields
  
  @@index([categoryId, displayOrder])
}

model QuizCategory {
  displayOrder Int
  // ... other fields
  
  @@index([templateId, displayOrder])
}
```

## Future Enhancements

### Potential Improvements
1. **Drag & Drop**: Visual drag-and-drop reordering in the grid
2. **Bulk Reorder**: Select multiple questions and reorder them at once
3. **Auto-Renumber**: Button to automatically renumber all questions sequentially
4. **Category Editing**: Allow editing category display order in the grid
5. **Visual Preview**: Show quiz flow with current display order
6. **Conflict Detection**: Warn if multiple questions have the same display order

## Related Files

- **Frontend**:
  - `apps/web/src/components/QuestionGrid.tsx` - Main grid component
  - `packages/core/src/types.ts` - TypeScript type definitions
  - `apps/web/src/store/slices/quizTemplateSlice.ts` - Redux state management

- **Backend**:
  - `services/api/src/modules/quiz-template/services/quiz-template.service.ts` - Business logic
  - `services/api/src/modules/quiz-template/dto/quiz-template.dto.ts` - DTOs
  - `services/api/prisma/schema.prisma` - Database schema
