# Testing Guide: Round Auto-Advance Feature

## Quick Start Testing

### Prerequisites
1. Have a quiz template with **multiple rounds** (categories)
2. Template should have different numbers of questions per round
3. Example structure:
   ```
   Round 1: 2 questions
   Round 2: 4 questions
   Round 3: 3 questions
   ```

### Test Scenario 1: Auto-Advance (Normal Flow)

**Steps**:
1. Create a new session as host
2. Attach your multi-round template
3. Start the session
4. Click "Start Question" → Question 1 begins
5. Have players answer
6. Click "Reveal Answer"
7. Click "Next Question" → Question 2 begins
8. Have players answer
9. Click "Reveal Answer"
10. Click "Next Question" → **🔥 Should AUTO-ADVANCE to Round 2**

**Expected Results**:
- ✅ Console shows: `[HostQuizPanel] All questions in round complete, advancing to next round...`
- ✅ Console shows: `[HostQuizPanel] Advanced to next round:` with new round data
- ✅ Round indicator updates: "Round 2 of 3"
- ✅ Question counter resets: "Question 1 of 4"
- ✅ Round 2, Question 1 starts automatically
- ✅ New category name shows in RoundInfoHeader

**What to Watch**:
- Backend console: `[SessionsService] Advanced session xxx to round 2`
- Frontend console: Look for round advancement logs
- UI updates immediately (no manual refresh needed)
- Players see round change

---

### Test Scenario 2: Manual Round Skip

**Steps**:
1. In middle of Round 1 (e.g., after Question 1)
2. Look for purple "Next Round ⏭️" button in host controls
3. Click the button

**Expected Results**:
- ✅ Alert shows: "✅ Advanced to Round 2: [Category Name]"
- ✅ Round indicator updates to Round 2
- ✅ Question counter shows Round 2 questions
- ✅ Quiz does NOT auto-start (waits for host to click "Start Question")

**Use Case**: 
- Skip boring questions
- Demo/testing purposes
- Time constraints during game

---

### Test Scenario 3: Quiz Completion

**Steps**:
1. Play through all rounds to the last one
2. Complete all questions in the last round
3. After revealing last answer, click "Next Question"

**Expected Results**:
- ✅ Alert shows: "🎉 Quiz Complete! All rounds finished."
- ✅ No crash or errors
- ✅ Can't advance further
- ✅ Console shows error: "Already at the last round"

---

### Test Scenario 4: Error Handling

**Test A: Try to skip when already at last round**
1. Get to last round
2. Click "Next Round ⏭️"
3. **Expected**: Alert shows "🎉 Quiz Complete! You are already at the last round."

**Test B: Try with no template**
1. Create session without attaching template
2. **Expected**: "Next Round ⏭️" button is hidden (only shows with templates)

---

## What to Check in Console

### Backend Logs (API Terminal)
```
[SessionsService] Advanced session cmgsi70lj0001qvqxrlirdavj to round 2
```

### Frontend Logs (Browser Console)
```
[HostQuizPanel] All questions in round complete, advancing to next round...
[HostQuizPanel] Advanced to next round: { session: {...}, currentCategory: {...}, questions: [...] }
[HostQuizPanel] Template questions loaded: [...]
```

---

## Common Issues & Solutions

### Issue: Auto-advance doesn't work
**Symptom**: Click "Next Question" after last question, nothing happens
**Check**:
- Is template attached? (Look for RoundInfoHeader)
- Are you using template questions? (Check `usingTemplate` state)
- Check console for errors
- Verify `templateQuestions.length` matches actual question count

**Fix**: 
- Refresh page and re-attach template
- Check backend logs for API errors

---

### Issue: "Next Round" button not visible
**Symptom**: Can't find the purple button
**Check**:
- Is `usingTemplate` true?
- Is template attached to session?
- Look in host controls section (next to "Next Question")

**Fix**: 
- Attach a template to the session
- Template must have multiple categories

---

### Issue: Wrong round shows after advance
**Symptom**: Advances to Round 3 instead of Round 2
**Check**:
- Database `currentCategoryIndex` value
- Backend response from `/sessions/:id/round/next`
- Frontend state: `currentCategoryIndex`, `currentQuestionIndex`

**Fix**: 
- Check backend logs for index values
- Verify categories are ordered by `displayOrder`

---

### Issue: Questions don't load after round advance
**Symptom**: Round advances but no questions appear
**Check**:
- `getRoundQuestions()` API response
- `templateQuestions` state after update
- Category has questions (not empty)

**Fix**:
- Check template structure in database
- Verify category has questions
- Check browser console for API errors

---

## Advanced Testing

### Test with Different Template Structures

**Single-round template**:
- Should show completion message after last question
- "Next Round" button should show completion alert

**Many rounds (10+)**:
- Performance should remain smooth
- All rounds should advance correctly
- Round indicator should update correctly

**Uneven rounds**:
- Round 1: 2 questions
- Round 2: 1 question
- Round 3: 5 questions
- All should advance correctly

---

### Test WebSocket Sync

1. Open two browser windows (Host + Player)
2. Play through quiz on host
3. Watch player screen during round advance

**Expected**:
- Player sees round change in real-time
- Player UI updates automatically
- No manual refresh needed

---

### Test State Persistence

1. Advance to Round 2
2. Refresh browser (F5)
3. **Expected**: Still on Round 2 (state saved in database)

---

## Performance Metrics

**Expected timings**:
- Round advance API call: < 100ms
- Question reload: < 200ms
- UI update: Immediate (< 50ms)
- Total auto-advance flow: < 500ms

**Memory**:
- No memory leaks when advancing through 10+ rounds
- Check browser DevTools → Memory tab

---

## Debugging Tips

### Enable Detailed Logging
Check these console groups:
- `[HostQuizPanel]` - Frontend quiz logic
- `[SessionsService]` - Backend round management
- `[SessionGateway]` - WebSocket events

### Check Network Tab
Look for these API calls:
- `PUT /sessions/:id/round/next`
- `GET /sessions/:id/round/questions`
- `POST /sessions/:id/quiz/start`

### Check Redux DevTools
Watch these state changes:
- `session.current.currentCategoryIndex`
- `session.current.currentQuestionIndex`
- `quiz.current` (quiz state)

---

## Success Criteria

Your implementation is working correctly if:
- [x] Auto-advances after last question in each round
- [x] Manual "Next Round" button skips correctly
- [x] Quiz completion message shows after last round
- [x] UI updates instantly without refresh
- [x] No console errors during advancement
- [x] State syncs across host, players, TV
- [x] Can navigate all rounds without crashes

---

## Known Limitations

1. **Cannot go backwards**: Once advanced, can't return to previous round
   - **Workaround**: Create new session

2. **Cannot reorder rounds**: Rounds follow `displayOrder` in template
   - **Workaround**: Edit template `displayOrder` values

3. **All questions in round play**: Can't skip individual questions within round
   - **Workaround**: Use "Next Round" button to skip entire round

---

## Next Steps After Testing

Once testing is complete:
1. Move to **Phase 3**: Add round info to player view
2. Then **Phase 4**: Full integration testing with scoring
3. Test on mobile devices
4. Test with real users
5. Production deployment

---

## Questions?

Check these docs:
- `PHASE2D_ROUND_AUTO_ADVANCE_COMPLETE.md` - Full implementation details
- `ROUND_NAVIGATION_EXPLANATION.md` - Why rounds work this way
- `QUIZ_TEMPLATE_FORMAT.md` - Template structure
