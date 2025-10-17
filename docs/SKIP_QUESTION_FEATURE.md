# Skip Question Feature

## Overview
Added the ability for hosts to skip the current running quiz question and immediately move to the next question. This is useful when the host wants to move forward without waiting for all players to answer or without revealing the current question.

## Implementation Date
October 16, 2025

## Changes Made

### HostQuizPanel Component (`apps/web/src/components/HostQuizPanel.tsx`)

#### New Function: `handleSkipQuestion`
```tsx
const handleSkipQuestion = async () => {
  if (!session || loading) return;
  
  console.log('[HostQuizPanel] Skipping current question...');
  
  // If quiz is running, reveal it first with no correct answer (null)
  // This will end the current quiz properly
  if (quizState && quizState.status === 'running') {
    try {
      await dispatch(
        revealQuizThunk({
          sessionId: session.id,
          correctOption: null, // No correct answer when skipping
        })
      ).unwrap();
      
      console.log('[HostQuizPanel] Quiz revealed (skipped), moving to next question...');
      
      // Wait a moment for the reveal to process
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('[HostQuizPanel] Failed to reveal quiz before skipping:', error);
    }
  }
  
  // Now move to next question
  handleNextQuestion();
};
```

#### UI Changes
- **New Button**: "⏭️ Skip Question" button added to host controls
- **Visibility**: Only shows when a quiz is currently running
- **Styling**: Orange theme (`border-orange-500/40 bg-orange-500/10 text-orange-300`)
- **Position**: Between "Next Question" and round navigation buttons

### Internationalization (`apps/web/src/messages/en.json`)

Added new translation key:
```json
"hostQuiz.skipQuestion": "⏭️ Skip Question"
```

## How It Works

### User Flow
1. **Host starts a quiz question** → Question is running, timer counting down
2. **Host clicks "Skip Question" button** → Skips to next question immediately
3. **System behavior**:
   - Current quiz is revealed with `correctOption: null` (no correct answer)
   - Backend processes the reveal and ends the quiz
   - After 500ms delay, automatically moves to next question
   - Next question is loaded and ready to start

### Technical Flow
```
Running Quiz → Skip Button Click → Reveal Quiz (null answer) → Wait 500ms → handleNextQuestion() → Next Quiz Ready
```

### Skip vs Next Question
- **Next Question**: Only works when no quiz is running (loads next question)
- **Skip Question**: Only works when quiz IS running (ends current + loads next)

## Use Cases

1. **Time Management**: Host wants to move faster through questions
2. **Technical Issues**: A question has issues and needs to be skipped
3. **Audience Engagement**: Crowd is disengaged with current question
4. **Testing**: Quick testing of quiz flow without waiting
5. **Wrong Question**: Host started wrong question and wants to skip

## Behavior Details

### When Skipping:
- ✅ Current quiz ends immediately
- ✅ No correct answer is set (`correctOption: null`)
- ✅ Players who submitted answers get 0 points (wrong answer)
- ✅ No coin animation or correct answer sound
- ✅ Next question loads automatically
- ✅ Host can start the next question when ready

### Button States:
- **Enabled**: When quiz is running and not loading
- **Disabled**: When loading or no quiz running
- **Visible**: Only when `quizState.status === 'running'`
- **Hidden**: When quiz is not running or already revealed

## Integration with Existing Features

### Works with:
- ✅ Template Mode (Quiz Templates)
- ✅ Sample Questions Mode
- ✅ Auto-Advance (moves to next round when needed)
- ✅ Round Navigation (Previous/Next Round buttons)
- ✅ Buzzer Mode
- ✅ Choice Answer Mode

### Respects:
- ✅ Loading states (disabled during loading)
- ✅ Quiz state management
- ✅ Score tracking (skipped questions award 0 points)
- ✅ Round progression

## UI Layout

```
[Start Question] [Next Question] [⏭️ Skip Question] [⏮️ Previous Round] [Next Round ⏭️]
     ↑                ↑                  ↑                    ↑                 ↑
 Not running    Not running         Running only      Template only      Template only
```

## Error Handling

- If reveal fails: Error logged to console, skip attempt continues
- If next question fails: Handled by existing `handleNextQuestion` error handling
- Loading state prevents multiple clicks

## Future Enhancements

Potential improvements:
1. Add confirmation dialog: "Are you sure you want to skip this question?"
2. Add skip reason tracking for analytics
3. Show skip count in quiz stats
4. Allow skipping to specific question number
5. Add keyboard shortcut (e.g., Ctrl+→)

## Testing Checklist

- [x] Skip button appears when quiz is running
- [x] Skip button hidden when quiz is not running
- [x] Clicking skip ends current quiz
- [x] Next question loads after skip
- [x] Works with template mode
- [x] Works with sample questions mode
- [x] Disabled during loading
- [x] Players get 0 points for skipped questions
- [x] No animation/sound for skipped questions
- [x] Round advances if last question in round is skipped

## Files Modified

1. `apps/web/src/components/HostQuizPanel.tsx` - Added skip functionality
2. `apps/web/src/messages/en.json` - Added translation key

## Related Features

- Round Navigation (Previous/Next Round)
- Auto-Advance to Next Question
- Quiz Template Integration
- Host Controls Panel
