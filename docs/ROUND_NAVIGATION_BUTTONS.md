# Round Navigation Buttons Implementation

## Overview
Added Previous Round and Next Round navigation buttons to the Host Quiz Panel, allowing hosts to move backward and forward through quiz rounds.

## Changes Made

### Backend (API Service)

#### 1. Sessions Service (`services/api/src/services/sessions.service.ts`)
- **New Method**: `advanceToPreviousRound(sessionId: string)`
  - Validates session exists and has a quiz template attached
  - Checks if already at the first round (returns error if so)
  - Decrements `currentCategoryIndex` by 1
  - Resets `currentQuestionIndex` to 0
  - Returns updated round information

#### 2. Sessions Controller (`services/api/src/routes/sessions.controller.ts`)
- **New Endpoint**: `PUT /sessions/:id/round/previous`
  - Calls `sessions.advanceToPreviousRound()`
  - Emits session update via WebSocket to all participants
  - Returns updated round state

### Frontend (Web App)

#### 3. API Client (`apps/web/src/lib/api.ts`)
- **New Function**: `advanceToPreviousRound(sessionId: string)`
  - Makes PUT request to `/sessions/{sessionId}/round/previous`
  - Returns round navigation result

#### 4. Host Quiz Panel (`apps/web/src/components/HostQuizPanel.tsx`)
- **Import**: Added `advanceToPreviousRound` to imports
- **New Handler**: `handleManualPreviousRound()`
  - Calls backend API to move to previous round
  - Reloads questions for the previous round
  - Updates local state (`templateQuestions`, `currentCategoryIndex`, `currentQuestionIndex`)
  - Shows alert confirming the round change
  - Handles error cases (e.g., already at first round)

- **UI Button**: Previous Round button
  - Only visible when using quiz template (`usingTemplate === true`)
  - Styled with blue border/background for distinction
  - **Disabled when**:
    - Quiz is loading
    - Question is currently running
    - Already at first round (`currentCategoryIndex === 0`)
  - Located before Next Round button
  - Icon: ⏮️ (previous track)

## Features

### Previous Round Button
- **Label**: "⏮️ Previous Round"
- **Color**: Blue theme (`border-blue-500/40`, `bg-blue-500/10`, `text-blue-300`)
- **Behavior**:
  - Moves to previous category/round
  - Resets to first question of that round
  - Does NOT auto-start questions (host must click "Start Question")
  - Shows confirmation alert with round name

### Next Round Button (Enhanced)
- **Label**: "Next Round ⏭️"
- **Color**: Purple theme (unchanged)
- **Behavior**: (existing functionality, unchanged)

## User Experience

1. Host can navigate between rounds freely when no question is running
2. Previous button is disabled at the first round to prevent errors
3. Both buttons are disabled during active questions
4. Clear visual feedback with alerts showing which round you moved to
5. Rounds reset to question 1 when navigating

## Error Handling

- **Backend**: Returns appropriate error messages:
  - "Already at the first round" when trying to go back from round 1
  - "Already at the last round" when trying to advance from final round
  
- **Frontend**: Displays user-friendly alerts:
  - Success: "⬅️ Moved back to Round X: [Category Name]"
  - Error: "Already at the first round."

## Testing Checklist

- [ ] Previous Round button appears only when using quiz templates
- [ ] Previous Round button is disabled at first round
- [ ] Previous Round button is disabled during running questions
- [ ] Clicking Previous Round successfully moves to previous category
- [ ] Questions are loaded correctly for previous round
- [ ] State updates correctly (category index, question index)
- [ ] Error handling works (try going back from round 1)
- [ ] WebSocket events notify all participants of round change
- [ ] Next Round button still works as expected
- [ ] Round navigation works across multiple rounds (forward and back)

## Date Implemented
October 15, 2025
