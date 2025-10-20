# Sprint 4 - Quick TODO Checklist
**Date:** October 17, 2025  
**Print this and check off as you complete tasks!**

---

## 🔥 TODAY'S PRIORITIES (Day 17)

### Testing Bug Fixes (MUST DO)
- [ ] **Test 1**: Create multi-game session (Quiz + Bioscope)
- [ ] **Test 2**: Switch to Bioscope → Verify start button ENABLED
- [ ] **Test 3**: Start Bioscope game successfully
- [ ] **Test 4**: Award +20 points to Team A participant
- [ ] **Test 5**: Verify scoreboard updates IMMEDIATELY
- [ ] **Test 6**: Award +30 more points to SAME participant
- [ ] **Test 7**: Verify score shows +50 total (20+30 delta)
- [ ] **Test 8**: Open in 2nd browser → Verify real-time sync

### Mobile Quick Check
- [ ] **Test 9**: Open on phone → Verify control panel works
- [ ] **Test 10**: Touch to switch games → Verify it works
- [ ] **Test 11**: Test Bioscope on mobile → Verify images display

---

## 📋 TOMORROW (Day 18)

### Reset All Implementation
- [ ] Create `POST /api/sessions/:id/reset-all-games` endpoint
- [ ] Implement reset service method (clear scores, reset states)
- [ ] Connect Reset All button in HostLobby.tsx
- [ ] Test: Click button → Verify all games reset
- [ ] Test: Verify teams/participants NOT deleted

### Integration Testing
- [ ] Test: Full session flow start to finish
- [ ] Test: Multiple players joining
- [ ] Test: Switching games mid-session
- [ ] Test: Scores persist across game switches

---

## 📱 DAY 19 - MOBILE & PERFORMANCE

### Mobile Testing
- [ ] Test on iPhone Safari
- [ ] Test on Android Chrome  
- [ ] Test on iPad
- [ ] Test animations smooth on mobile
- [ ] Test no horizontal scrolling

### Performance
- [ ] Profile component re-renders
- [ ] Check for memory leaks
- [ ] Test with 3+ games
- [ ] Optimize Redux selectors if needed

---

## 🚀 DAY 20 - FINAL POLISH

### Final Tasks
- [ ] Write unit tests for transformSession()
- [ ] Write unit tests for manual scoring
- [ ] Update user documentation
- [ ] Update API documentation
- [ ] Final bug sweep
- [ ] Deployment preparation

---

## 📊 COMPLETION CHECKLIST

### Features
- [x] Multi-game architecture
- [x] Game control panel
- [x] Bioscope game
- [x] Manual scoring
- [x] Bug fixes
- [ ] Reset All
- [ ] Full testing
- [ ] Documentation

### Testing Status
- [ ] End-to-end tests passed
- [ ] Mobile tests passed
- [ ] Performance tests passed
- [ ] Integration tests passed
- [ ] Unit tests written

### Launch Readiness
- [ ] All high priority items complete
- [ ] No open bugs
- [ ] Documentation complete
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Ready for production

---

## 🎯 SUCCESS CRITERIA

**Sprint 4 is DONE when:**
- ✅ All TODO items above are checked
- ✅ Both bugs verified fixed
- ✅ Reset All working
- ✅ Mobile responsive
- ✅ Documentation updated
- ✅ Team approves launch

**Target Launch:** October 20, 2025

---

**Quick Reference:**
- Branch: `feature/sprint4-bioscope`
- Backend: `services/api/src/modules/bioscope/`
- Frontend: `apps/web/src/components/` & `apps/web/src/screens/`
- Docs: `docs/SPRINT4_*.md`
