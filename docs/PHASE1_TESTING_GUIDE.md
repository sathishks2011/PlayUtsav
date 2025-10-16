# Phase 1 Testing Guide - Template Selection & Attachment

## ✅ What Was Implemented

### HostDashboard Updates (`apps/web/src/screens/HostDashboard.tsx`)

1. **Imports Added**:
   - `listQuizTemplates` API method
   - `attachQuizTemplate` API method
   - `QuizTemplateResponse` type

2. **New State Variables**:
   - `templates: QuizTemplateResponse[]` - List of available templates
   - `selectedTemplateId: string` - ID of selected template
   - `isLoadingTemplates: boolean` - Loading state for templates
   - `isAttachingTemplate: boolean` - Loading state during attachment

3. **New Functions**:
   - `loadTemplates()` - Fetches all quiz templates on mount
   - Updated `handleCreateSession()` - Attaches template after session creation if one is selected

4. **UI Components Added**:
   - Template selector dropdown after Player Engagement Type
   - Shows template name, round count, and question count
   - "No template" option for custom questions
   - Loading state while fetching templates
   - Helpful tip message when template selected
   - Button text changes to "Attaching template..." during attachment

5. **Sessions List Enhancement**:
   - Shows attached template name with purple badge
   - Displays template icon (📋)

## 🧪 Testing Steps

### Test 1: UI Display
**Goal**: Verify template selector appears correctly

**Steps**:
1. ✅ Start the web app: `cd apps/web && pnpm dev`
2. ✅ Login as a host
3. ✅ Navigate to Host Portal > Dashboard
4. ✅ Scroll to "Create New Session" form
5. ✅ Verify template selector appears after game mode section

**Expected Results**:
- Dropdown labeled "Quiz Template (Optional)"
- Description text explaining templates
- Default option: "No template (use custom questions)"
- If templates exist: List showing name, rounds, questions
- If no templates: Only default option shows

**Pass Criteria**: Template selector renders correctly

---

### Test 2: Template Loading
**Goal**: Verify templates load from API

**Steps**:
1. ✅ Open browser DevTools > Network tab
2. ✅ Refresh the Host Dashboard page
3. ✅ Look for API call to `/quiz-templates`
4. ✅ Check response contains template data

**Expected Results**:
- `GET /quiz-templates` request fires on page load
- Response status: 200
- Response body: Array of templates with categories and questions
- Dropdown populates with template options

**Pass Criteria**: Templates load successfully from API

---

### Test 3: Session Creation Without Template
**Goal**: Verify normal session creation still works

**Steps**:
1. ✅ Fill in session details (host name, max players, language)
2. ✅ Select game mode (e.g., Multiple Choice)
3. ✅ Leave template dropdown on "No template"
4. ✅ Click "Create Session"
5. ✅ Verify session is created
6. ✅ Check you're redirected to Lobby

**Expected Results**:
- Session creates successfully
- No template attachment occurs
- Button shows "Creating..." briefly
- Redirect to Lobby happens
- Session has no `quizTemplateId` field

**Pass Criteria**: Session creation without template works as before

---

### Test 4: Session Creation With Template
**Goal**: Verify template attachment during session creation

**Steps**:
1. ✅ Fill in session details
2. ✅ Select a template from dropdown (e.g., "General Knowledge Quiz (3 rounds, 15 questions)")
3. ✅ Note the blue tip message appears
4. ✅ Click "Create Session"
5. ✅ Watch button text change: "Creating..." → "Attaching template..."
6. ✅ Open DevTools > Network tab
7. ✅ Verify API calls:
   - `POST /sessions` (create session)
   - `POST /sessions/{id}/attach-template` (attach template)

**Expected Results**:
- Session creates successfully
- Template attachment API call fires
- Button shows "Creating..." then "Attaching template..."
- Redirect to Lobby happens after both operations
- No errors in console

**Pass Criteria**: Template attaches successfully to new session

---

### Test 5: Template Attachment Failure Handling
**Goal**: Verify error handling if template attachment fails

**Steps**:
1. ✅ Stop the API server (simulate failure)
2. ✅ Try creating session with template selected
3. ✅ Session should create but template attachment should fail
4. ✅ Verify error alert appears
5. ✅ Restart API server

**Expected Results**:
- Session creates successfully (first API call succeeds if API was running at that moment)
- Alert message: "Session created but failed to attach template..."
- User can still access session
- Error logged to console

**Pass Criteria**: Graceful error handling with user-friendly message

---

### Test 6: Template Display in Sessions List
**Goal**: Verify attached templates show in session list

**Steps**:
1. ✅ Create a session with a template attached
2. ✅ Navigate back to Dashboard
3. ✅ Look at "Recent Sessions" list
4. ✅ Find your newly created session

**Expected Results**:
- Session shows in list
- Purple badge displays: "📋 [Template Name]"
- Badge appears below the game mode info
- Template name matches the selected template

**Pass Criteria**: Attached template displays correctly in session list

---

### Test 7: Multiple Templates Selection
**Goal**: Test selecting different templates

**Steps**:
1. ✅ Open session creation form
2. ✅ Select Template A
3. ✅ Change to Template B
4. ✅ Change back to "No template"
5. ✅ Change to Template C
6. ✅ Create session

**Expected Results**:
- Dropdown allows changing selection smoothly
- Blue tip appears/disappears based on selection
- Final selection (Template C) is what gets attached
- No errors during selection changes

**Pass Criteria**: Template selection works correctly

---

### Test 8: Loading States
**Goal**: Verify loading indicators work correctly

**Steps**:
1. ✅ Refresh dashboard page
2. ✅ Watch template dropdown area
3. ✅ Create session with template
4. ✅ Watch button text

**Expected Results**:
- "Loading templates..." shows while fetching (brief)
- Dropdown becomes enabled after load
- Button shows "Creating..." during session creation
- Button shows "Attaching template..." during attachment
- Button becomes enabled again after completion

**Pass Criteria**: Loading states display correctly

---

### Test 9: API Response Verification
**Goal**: Verify session has template data after attachment

**Steps**:
1. ✅ Create session with template attached
2. ✅ Open DevTools > Network tab
3. ✅ Look at response from `POST /sessions/{id}/attach-template`
4. ✅ Verify response includes:
   - `quizTemplateId` field
   - `currentCategoryIndex: 0`
   - `currentQuestionIndex: 0`
   - `quizTemplate` object with full template data

**Expected Results**:
- Response status: 200
- Session object has template fields populated
- Round tracking starts at 0, 0
- Template includes all categories and questions

**Pass Criteria**: API returns correct session data with template

---

### Test 10: Browser Compatibility
**Goal**: Verify UI works across browsers

**Steps**:
1. ✅ Test in Chrome
2. ✅ Test in Firefox
3. ✅ Test in Edge
4. ✅ Test responsive view (mobile size)

**Expected Results**:
- Template dropdown renders correctly
- Styling matches rest of form
- No layout issues
- Dropdown works on mobile

**Pass Criteria**: Works across all target browsers

---

## 🐛 Common Issues & Solutions

### Issue 1: Templates Don't Load
**Symptom**: Dropdown only shows "No template" option
**Solution**: 
- Check API server is running
- Verify you're logged in as a host
- Check browser console for errors
- Verify templates exist in database

### Issue 2: Template Attachment Fails
**Symptom**: Alert shows "failed to attach template"
**Solution**:
- Check API server logs for errors
- Verify session was created successfully
- Check template ID is valid
- Ensure user owns the template

### Issue 3: Template Doesn't Show in Session List
**Symptom**: No purple badge appears
**Solution**:
- Refresh sessions list
- Check session object has `quizTemplate` relation loaded
- Verify API includes template in session response

### Issue 4: Button Stuck on "Attaching template..."
**Symptom**: Button never returns to normal state
**Solution**:
- Check browser console for errors
- Verify API response is received
- Check network tab for hanging requests
- May need to refresh page

---

## ✅ Success Criteria

Phase 1 is complete when:
- [ ] All 10 tests pass
- [ ] Template selector renders correctly
- [ ] Templates load from API
- [ ] Session creation without template works
- [ ] Session creation with template works
- [ ] Template attaches successfully
- [ ] Attached template shows in session list
- [ ] Error handling works gracefully
- [ ] Loading states display correctly
- [ ] UI works across browsers

---

## 📋 Next Steps After Phase 1

Once all tests pass, proceed to **Phase 2: HostQuizPanel Integration**:
1. Load template questions
2. Add UI components (RoundInfoHeader, RoundSelector)
3. Implement round navigation
4. Add auto-advancing logic

See `docs/HOST_QUIZ_PANEL_INTEGRATION.md` for detailed implementation guide.
