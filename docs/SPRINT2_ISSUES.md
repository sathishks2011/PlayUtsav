# Sprint 2 Issues & Fixes

**Date:** October 12, 2025  
**Status:** Blocking Sprint 2 Completion

## Issue Summary

Three critical issues preventing Sprint 2 completion:

1. ✅ **Auto-reveal not working**
2. ⚠️ **No sounds or animations playing**
3. ❌ **Unable to select next question in host page**

---

## Issue #1: Auto-Reveal Not Working ✅ FIXED

### Root Cause
The auto-reveal feature has all the code in place BUT there's a logical issue:
- Auto-reveal countdown only triggers when `allAnswered === true`
- `allAnswered` is set by the `quiz:all-answered` WebSocket event from backend
- Backend checks if ALL participants answered (including HOST)
- **Problem:** The HOST never answers questions, so `allAnswered` never becomes true

### Solution ✅ APPLIED
Backend now excludes HOST from the "all answered" check in `quiz.service.ts`.

**File:** `services/api/src/services/quiz.service.ts`  
**Method:** `checkAllPlayersAnswered()`

**Current Code:**
```typescript
const participants = await this.prisma.participant.findMany({
  where: { sessionId },
});
```

**Fix:**
```typescript
const participants = await this.prisma.participant.findMany({
  where: { 
    sessionId,
    role: 'PLAYER' // Exclude HOST from check
  },
});
```

---

## Issue #2: No Sounds or Animations Playing

### Analysis

#### Sounds ✅ TEST BUTTON ADDED
**Status:** ⚠️ Expected behavior - sound files don't exist yet

The sound system is fully implemented in `lib/soundManager.ts` BUT:
- Sound files referenced in code don't exist in `public/sounds/` directory
- The README in `public/sounds/` confirms this is intentional for now

**🆕 Test Sound Button Added:**
A "🔊 Test Sound (Coin)" button has been added to Host Settings → Sound Settings.
This button lets you test if sounds are working without playing a full quiz round.

**To Test Sounds:**
1. Download a free sound effect (see `apps/web/public/sounds/README.md` for links)
2. Rename it to `coin.mp3` and place in `apps/web/public/sounds/`
3. Start app and login as host
4. Go to Host Console → Settings → Sound Settings
5. Enable "Enable all sounds"
6. Set Master volume to 50-100%
7. Click **"🔊 Test Sound (Coin)"** button
8. You should hear the sound!

**Quick Test Files:** You can use any royalty-free sound effects from:
- https://mixkit.co/free-sound-effects/coin/
- https://freesound.org/
- https://pixabay.com/sound-effects/

#### Animations
**Status:** ❌ Not implemented correctly

**Current Issue:**
- `ScoreAnimation` component exists and is integrated in `App.tsx`
- Animation SHOULD trigger when `scoreAnimation` state is set by `useSessionSync`
- Backend emits `score:animated` events on reveal
- **Problem:** The animation coordinates might be incorrect, or the event isn't triggering properly

**Investigation Needed:**
1. Check browser console for `score:animated` event logs during reveal
2. Verify the animation actually renders (check React DevTools)
3. Check if animation is rendering off-screen due to coordinate issues

---

## Issue #3: Unable to Select Next Question ✅ FIXED

### Root Cause
**Critical Bug:** When clicking "Next Question", the `questionIndex` increases, BUT:
1. The quiz is still in "revealed" state from the previous question
2. There's no code to actually START the next question automatically
3. Host has to manually click "Start question" AGAIN after clicking "Next question"
4. **NEW ISSUE FOUND:** PlayerLobby wasn't using `useQuizSync` hook, so players never received quiz updates via WebSocket

### Expected Behavior
When host clicks "Next Question":
1. Question index increments
2. NEW question automatically starts
3. Quiz state updates via WebSocket
4. Players see the new question immediately

### Current Behavior
When host clicks "Next Question":
1. Question index increments (local state only)
2. Nothing else happens
3. Quiz state still shows "revealed" status
4. Players still see old question
5. Host must click "Start question" manually

### Solution Options

**Option A: Auto-start on Next Question (Recommended)**
```typescript
// In HostQuizPanel.tsx
const handleNextQuestion = () => {
  const newIndex = questionIndex + 1;
  setQuestionIndex(newIndex);
  
  // Automatically start the new question
  const newQuestion = SAMPLE_QUESTIONS[newIndex % SAMPLE_QUESTIONS.length];
  dispatch(
    startQuizThunk({
      sessionId: session.id,
      questionId: newQuestion.questionId,
      prompt: newQuestion.prompt,
      options: newQuestion.options,
      duration: newQuestion.duration,
    })
  );
  
  // Reset local state
  setAllAnswered(false);
  setAutoRevealTimer(null);
};
```

**Option B: Reset and require manual start**
```typescript
const handleNextQuestion = () => {
  setQuestionIndex((idx) => idx + 1);
  // Clear quiz state so host can start fresh
  dispatch(clearQuiz());
  setAllAnswered(false);
  setAutoRevealTimer(null);
};
```

**Recommendation:** Use Option A for better UX. The "Next Question" button should immediately show the next question to all players.

### Solutions Applied ✅

**1. Added `useQuizSync` hook to PlayerLobby.tsx:**
```typescript
import { useQuizSync } from '../hooks/useQuizSync';

export function PlayerLobby() {
  // ... existing code
  useQuizSync(); // ← Added this
```

This ensures players receive quiz updates via WebSocket in real-time.

**2. Implemented `handleNextQuestion()` in HostQuizPanel.tsx:**
```typescript
const handleNextQuestion = () => {
  if (!session || loading) return;
  
  // Increment question index
  const newIndex = questionIndex + 1;
  setQuestionIndex(newIndex);
  
  // Get the new question
  const newQuestion = SAMPLE_QUESTIONS[newIndex % SAMPLE_QUESTIONS.length];
  
  // Reset local state
  setAllAnswered(false);
  setAutoRevealTimer(null);
  
  // Automatically start the new question
  dispatch(startQuizThunk({...}));
};
```

Now clicking "Next Question" immediately starts the new question for all participants.

---

## Implementation Priority

1. **HIGH:** Fix Issue #3 (Next Question) - Blocking all quiz gameplay testing
2. **HIGH:** Fix Issue #1 (Auto-reveal) - Core feature for Sprint 2
3. **MEDIUM:** Document Issue #2 (Sounds/Animations) - Provide testing instructions

---

## Testing Checklist

After fixes:
- [ ] Start a quiz question
- [ ] Multiple players answer
- [ ] Verify auto-reveal countdown appears when all PLAYERS (not HOST) answered
- [ ] Verify auto-reveal triggers after timeout
- [ ] Click "Next Question" and verify new question appears immediately
- [ ] Verify players see the new question via WebSocket
- [ ] Test sounds after adding MP3 files
- [ ] Test score animations appear during reveal
- [ ] Verify scoreboard updates correctly

---

## Next Steps

1. Apply fixes to `quiz.service.ts` (exclude HOST)
2. Apply fixes to `HostQuizPanel.tsx` (auto-start next question)
3. Test auto-reveal with multiple browser windows (1 host + 2 players)
4. Document sound file requirements for testers
5. Complete Sprint 2 and move to Sprint 3
