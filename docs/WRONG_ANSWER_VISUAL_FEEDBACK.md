# Wrong Answer Visual Feedback Feature

## Overview
Enhanced quiz components to provide clear visual feedback when players select wrong answers, showing both the incorrect choice in red and the correct answer in green.

## Changes Made

### Player Quiz Panel (`apps/web/src/components/PlayerQuizPanel.tsx`)

**Visual Feedback**:
- **Wrong Answer Styling**: 
  - Background: `bg-red-500/20` (red with 20% opacity)
  - Border: `border-red-400/40` (red border with 40% opacity)
  - Text: `text-red-300` (lighter red text)
  - Icon: `✗` (cross mark in red)

- **Correct Answer Styling** (unchanged):
  - Background: `bg-emerald-500/20` (green with 20% opacity)
  - Border: `border-emerald-400/40` (green border with 40% opacity)
  - Icon: `✓` (checkmark in green)

**Logic**:
```tsx
const isCorrect = hasRevealed && quiz.correctOption === index;
const isWrongSelection = hasRevealed && selected === index && quiz.correctOption !== index;
```

- `isCorrect`: Shows when option is the correct answer and quiz is revealed
- `isWrongSelection`: Shows when player selected this option, quiz is revealed, and it's NOT the correct answer

**Sound Feedback**:
- Handled by `useSessionSync` hook which listens for `score:animated` WebSocket events
- When player scores 0 points (wrong answer), plays `coin_wrong` sound
- When player scores > 0 points (correct answer), plays `coin` sound
- Sound volume respects master volume and coin sound settings

### Host Quiz Panel (`apps/web\src\components\HostQuizPanel.tsx`)

**Consistency Update**:
- Applied same visual feedback for player input mode in host panel
- Shows wrong selections in red with ✗ icon
- Shows correct answer in green with ✓ icon
- Added internationalization key: `hostQuiz.wrong` = "Wrong"

## User Experience

### Before Reveal
- All options appear with neutral styling
- Player can select any option
- Selected option shows radio button checked

### After Reveal - Correct Answer
- Player's selected option: **Green background** with ✓ icon
- **Coin animation** appears at scoreboard
- **Coin sound** plays

### After Reveal - Wrong Answer
1. **Player's wrong selection**: **Red background** with ✗ icon and red text
2. **Correct answer**: **Green background** with ✓ icon
3. **Sound**: `coin_wrong.mp3` plays automatically
4. **No animation**: Coin animation does NOT appear for wrong answers (0 points)

## Visual Design

### Color Palette
- **Correct (Green)**:
  - Background: `#10b981` (emerald-500) at 20% opacity
  - Border: `#10b981` (emerald-400) at 40% opacity
  - Text: Remains white/default

- **Wrong (Red)**:
  - Background: `#ef4444` (red-500) at 20% opacity
  - Border: `#f87171` (red-400) at 40% opacity
  - Text: `#fca5a5` (red-300)

- **Icons**:
  - Correct: ✓ in `text-emerald-400`
  - Wrong: ✗ in `text-red-400`

### Layout
```
┌─────────────────────────────────────┐
│ ○ Option A                          │  (neutral)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ● Option B (player selected) ✗     │  (red background, wrong)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ○ Option C                      ✓   │  (green background, correct)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ○ Option D                          │  (neutral)
└─────────────────────────────────────┘
```

## Sound Files

### coin_wrong.mp3
- **Location**: `apps/web/public/sounds/coin_wrong.mp3`
- **Trigger**: Automatically plays when quiz is revealed and player selected wrong answer
- **Condition**: Only plays if player submitted an answer and it was incorrect
- **Enabled By**: Sound settings (`coinWrongSoundEnabled`)

## Edge Cases Handled

1. **Player didn't submit**: No red highlighting (only correct answer shown in green)
2. **Player selected correct answer**: Only green highlighting, no red
3. **Multiple players**: Each player sees their own selection highlighted
4. **Buzzer mode**: Same visual feedback applies when locked player answers
5. **Sound disabled**: Visual feedback still works even if sound is muted

## Internationalization

### New i18n Keys
- `hostQuiz.wrong`: "Wrong" (for host panel consistency)

### Existing Keys Used
- `hostQuiz.correct`: "Correct"
- `playerQuiz.revealed`: "Correct answer: {answer}"

## Technical Implementation

### State Management
- Uses local `selected` state to track player's choice
- Uses `submitted` flag to know if player actually submitted
- Uses `quiz.correctOption` from Redux for comparison
- Uses `quiz.status === 'revealed'` to trigger visual feedback
- State resets only when `questionId` changes, not when status changes to 'revealed'

### Sound System Architecture
**Backend (services/api/src/services/quiz.service.ts)**:
- When quiz is revealed, calculates scores for all answers
- For correct answers: awards points based on time and difficulty
- For wrong answers: awards 0 points
- Emits `score:animated` WebSocket event for EVERY answer (including 0-point wrong answers)

**Frontend (apps/web/src/hooks/useSessionSync.ts)**:
- Listens to `score:animated` WebSocket events
- **Animation Control**:
  - `points > 0`: Shows coin animation (correct answer)
  - `points === 0`: NO animation (wrong answer)
- **Sound Control**:
  - `points > 0`: Plays `'coin'` sound (correct answer)
  - `points === 0 or < 0`: Plays `'coin_wrong'` sound (wrong answer)
- Respects sound settings (enabled/disabled, master volume)
- Single source of truth for answer feedback sounds and animations

### Conditional Rendering
```tsx
{quiz.options.map((option, index) => {
  const isCorrect = hasRevealed && quiz.correctOption === index;
  const isWrongSelection = hasRevealed && selected === index && quiz.correctOption !== index;
  
  return (
    <label className={
      isCorrect ? 'green-styling' :
      isWrongSelection ? 'red-styling' :
      'neutral-styling'
    }>
      {/* ... */}
      {isCorrect && <span>✓</span>}
      {isWrongSelection && <span>✗</span>}
    </label>
  );
})}
```

### Why Wrong Answer Color Wasn't Persisting (Bug Fix)

**The Problem**:
1. Component tracked `selected` state for which option is currently selected
2. When checking for wrong answers, logic used: `selected === index`
3. After quiz revealed, if `selected` state changed or was reset, the red color disappeared
4. The visual feedback wasn't persisting until the next question

**The Fix**:
1. Added new state: `submittedAnswer` to track which answer was actually submitted
2. Changed wrong answer logic to: `submittedAnswer === index` instead of `selected === index`
3. Now the submitted answer stays highlighted in red even if `selected` changes
4. State resets only when `questionId` changes (new question), not when status changes to 'revealed'
5. Applied to both PlayerQuizPanel and HostQuizPanel for consistency

**Code Changes**:
```tsx
// Added new state
const [submittedAnswer, setSubmittedAnswer] = useState<number | null>(null);

// Save submitted answer
const handleSubmit = (event: React.FormEvent) => {
  // ...
  setSubmittedAnswer(selected); // Save which answer was submitted
};

// Use submittedAnswer for highlighting
const isWrongSelection = hasRevealed && submittedAnswer === index && quiz.correctOption !== index;
```

### Why Wrong Answer Sound Was Playing as Correct Sound (Bug Fix)

**The Problem**:
1. Backend sends `score:animated` event with `points: 0` for wrong answers
2. Frontend `useSessionSync` had logic: `event.points >= 0 ? 'coin' : 'coin_wrong'`
3. Zero is `>= 0`, so it played `'coin'` sound for wrong answers!
4. PlayerQuizPanel also had a duplicate sound effect that was getting reset too early

**The Fix**:
1. **Sound Fix**: Changed `useSessionSync` logic to: `event.points > 0 ? 'coin' : 'coin_wrong'`
   - Now 0 points correctly triggers `'coin_wrong'` sound
2. **Animation Fix**: Added animation gate: Only show coin animation when `event.points > 0`
   - Wrong answers (0 points) no longer show coin animation
3. **Duplicate Sound Removal**: Removed duplicate sound effect from PlayerQuizPanel
   - Single source of truth in `useSessionSync`
4. **State Persistence Fix**: Fixed state reset to preserve `selected` and `submitted` when status changes to 'revealed'
   - Changed dependency from `[quiz?.questionId, quiz?.status]` to `[quiz?.questionId]`
   - This ensures the selected wrong answer stays highlighted in red
5. **Submitted Answer Tracking**: Added `submittedAnswer` state to permanently track which answer was submitted
   - Changed wrong answer logic from `selected === index` to `submittedAnswer === index`
   - Now red color persists even if `selected` state changes
   - Applied to both PlayerQuizPanel and HostQuizPanel

## Testing Checklist

- [ ] Wrong answer shows red background when revealed
- [ ] Wrong answer shows red text color
- [ ] Wrong answer shows ✗ icon
- [ ] Correct answer shows green background
- [ ] Correct answer shows ✓ icon
- [ ] Both correct and wrong answers visible simultaneously
- [ ] coin_wrong sound plays for wrong answers
- [ ] No red highlighting if player didn't submit
- [ ] Works in buzzer mode
- [ ] Works in choice answer mode
- [ ] Works in host panel player input mode
- [ ] Visual feedback shows immediately on reveal
- [ ] Sound plays only once per wrong answer
- [ ] Multiple players see their own selections highlighted

## Accessibility

- **Visual Indicators**: Icons (✓/✗) supplement color for colorblind users
- **Text Labels**: "Correct" and "Wrong" labels provide clarity
- **Audio Feedback**: Sound provides non-visual confirmation
- **High Contrast**: Red/green colors with sufficient contrast ratio

## Date Implemented
October 16, 2025
