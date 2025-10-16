# Quiz Template Integration Plan

## Overview
Integrate uploaded quiz templates with the quiz gameplay system, where each category becomes a quiz round that the host can control.

## Requirements
1. Hook uploaded quiz templates to host quiz control and player quiz control
2. Each category = One quiz round
3. Host can:
   - Stop current quiz round anytime
   - Move to next round
   - Choose specific round to conduct
   - View round information on quiz title card
4. Players see round information during gameplay

## Architecture Changes

### 1. Session-Template Association
**Database Schema Update** (services/api/prisma/schema.prisma):
```prisma
model Session {
  // ... existing fields
  quizTemplate   QuizTemplate? @relation(fields: [quizTemplateId], references: [id], onDelete: SetNull)
  quizTemplateId String?
  currentCategoryIndex Int @default(0)  // Track current round/category
  currentQuestionIndex Int @default(0)  // Track current question within category
}
```

### 2. Redux State Updates
**Session Slice** (`apps/web/src/store/slices/sessionSlice.ts`):
- Add `templateId`, `currentCategoryIndex`, `currentQuestionIndex` to session state

**Quiz Template Slice** (`apps/web/src/store/slices/quizTemplateSlice.ts`):
- Add `activeTemplate` for the currently selected template for the session
- Add actions to attach/detach template from session

### 3. New Components

#### A. RoundSelector Component
**Path**: `apps/web/src/components/RoundSelector.tsx`
**Purpose**: Allow host to select and navigate between quiz rounds (categories)
**Features**:
- List all categories/rounds from active template
- Show current round
- Click to jump to specific round
- Display round info (name, question count, display order)
- Next/Previous round buttons

#### B. Enhanced HostQuizPanel
**Updates**:
- Replace SAMPLE_QUESTIONS with questions from selected template
- Show current round/category information
- Integrate RoundSelector component
- Add "Stop Round" button
- Track progress within category
- Auto-advance to next category when all questions complete

#### C. RoundInfoHeader Component
**Path**: `apps/web/src/components/RoundInfoHeader.tsx`
**Purpose**: Display round information on quiz card
**Features**:
- Category/Round name
- Question progress (e.g., "Question 3 of 10")
- Round number (e.g., "Round 2 of 5")

### 4. API Endpoints

#### Attach Template to Session
```
POST /sessions/:sessionId/attach-template
Body: { templateId: string }
Response: { session: Session }
```

#### Update Session Round
```
POST /sessions/:sessionId/round
Body: { categoryIndex: number, questionIndex: number }
Response: { session: Session }
```

#### Get Current Round Questions
```
GET /sessions/:sessionId/round/questions
Response: { 
  category: CategoryResponse,
  questions: QuestionResponse[],
  currentIndex: number 
}
```

### 5. Backend Services

**SessionService** (`services/api/src/modules/sessions/services/sessions.service.ts`):
- `attachQuizTemplate(sessionId, templateId, hostId)`
- `updateCurrentRound(sessionId, categoryIndex, questionIndex)`
- `getCurrentRoundQuestions(sessionId)`
- `advanceToNextQuestion(sessionId)`
- `advanceToNextRound(sessionId)`

## Implementation Steps

### Phase 1: Backend Foundation (30 min)
1. ✅ Update Prisma schema
2. ✅ Run migration
3. ✅ Create session-template API endpoints
4. ✅ Update session service with template methods

### Phase 2: Redux Integration (20 min)
5. ✅ Update session slice with template fields
6. ✅ Add quiz template attachment actions
7. ✅ Create thunks for session-template operations

### Phase 3: UI Components (40 min)
8. ✅ Create RoundInfoHeader component
9. ✅ Create RoundSelector component
10. ✅ Update HostQuizPanel to use template questions
11. ✅ Add round navigation controls
12. ✅ Update PlayerQuizPanel to show round info

### Phase 4: Host Portal Integration (15 min)
13. ✅ Add template selector in HostPortal
14. ✅ Connect template to session
15. ✅ Test full flow

## File Changes Summary

### New Files
- `services/api/src/modules/sessions/dto/attach-template.dto.ts`
- `services/api/src/modules/sessions/dto/update-round.dto.ts`
- `apps/web/src/components/RoundInfoHeader.tsx`
- `apps/web/src/components/RoundSelector.tsx`

### Modified Files
- `services/api/prisma/schema.prisma`
- `services/api/src/modules/sessions/services/sessions.service.ts`
- `services/api/src/modules/sessions/sessions.controller.ts`
- `apps/web/src/store/slices/sessionSlice.ts`
- `apps/web/src/store/slices/quizTemplateSlice.ts`
- `apps/web/src/components/HostQuizPanel.tsx`
- `apps/web/src/components/PlayerQuizPanel.tsx`
- `apps/web/src/lib/api.ts`
- `packages/core/src/types.ts`

## Data Flow

### Starting a Quiz Round
```
1. Host selects quiz template in HostPortal
2. Template attaches to session (API call)
3. Host clicks "Start Round" → Starts first question of first category
4. Round info displayed on quiz card
5. Players see round info and question
```

### Navigating Rounds
```
1. Host opens RoundSelector
2. Clicks on "Round 3: Science"
3. API updates session.currentCategoryIndex = 2
4. HostQuizPanel loads questions from category index 2
5. Host starts first question of that round
```

### Auto-Advancing
```
1. Last question of round revealed
2. Host clicks "Next Question"
3. System detects end of category
4. Advances to next category (session.currentCategoryIndex++)
5. Resets question index to 0
6. Shows "Round Complete" message
7. Host can start next round or skip to another
```

## Testing Checklist
- [ ] Upload quiz template
- [ ] Attach template to session
- [ ] Start first round/category
- [ ] Complete all questions in a round
- [ ] Navigate to specific round
- [ ] Skip rounds
- [ ] View round info on quiz card
- [ ] Player sees correct round information
- [ ] Handle template with single category
- [ ] Handle template with multiple categories
- [ ] Detach template from session
