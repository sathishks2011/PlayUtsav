# 🧪 Complete Testing Guide

## Quick Test Flow

### 🎮 Full Game Flow Test

#### **1. Host Setup (5 minutes)**

**Login as Demo Host:**
```
Email: host@demo.com
Password: Host@123
```

**OR Create New Host Account:**
1. Click "Sign up" from landing page
2. Fill in:
   - Email: your@email.com
   - Password: (min 8 chars)
   - Display Name: Your Name
   - Organization: (optional)
   - Contact Email: (optional)
3. Click "Create Account"

#### **2. Create Session**

From Host Dashboard:
1. Enter Host Name (optional, defaults to your display name)
2. Select Max Players (2-32)
3. Select Language (English/Español)
4. Click "Create Session"

✅ **Expected**: You're automatically taken to HostLobby with session code

#### **3. Player Join (Use Another Browser/Incognito)**

From Landing Page:
1. Enter Session Code (shown in host view)
2. Enter Player Name
3. Click "Join Lobby"

✅ **Expected**: Player sees lobby with host and other players

#### **4. Create Teams (Host View)**

In HostLobby:
1. Scroll to "Create a team" section
2. Enter team name (e.g., "Lightning Lions")
3. Pick a color
4. Click "Add team"
5. Repeat for second team

✅ **Expected**: Teams appear in Teams section

#### **5. Start Quiz Round (Host View)**

In HostLobby (scroll down to Quiz Panel):
1. Click "Start quiz round"
2. Timer starts (30 seconds)
3. Players can now see the question

✅ **Expected**: Question appears for both host and players

#### **6. Submit Answers (Player View)**

In PlayerLobby:
1. Select an answer option
2. Click "Submit answer"
3. See feedback

✅ **Expected**: Answer is recorded, feedback shown

#### **7. Reveal Answer (Host View)**

In Quiz Panel:
1. Click "Reveal correct answer"
2. OR click individual answer buttons to reveal them

✅ **Expected**: Correct answer highlighted, players see result

#### **8. Award Points (Host View)**

1. Click team award button (e.g., "Award to Lightning Lions")
2. Points added to scoreboard

✅ **Expected**: Scoreboard updates, streak counter increases

#### **9. Return to Dashboard (Host View)**

1. Click "← Dashboard" button in header
2. See session in Recent Sessions list
3. Click "Manage" to re-enter session

✅ **Expected**: Can leave and re-enter sessions

---

## 🎨 Feature Testing

### Theme Switching

**Test 1: Preset Themes**
1. Scroll to Theme Studio panel (in HostLobby)
2. Click different preset buttons
3. Observe background and accent colors change

**Test 2: Custom Colors**
1. Use color pickers to choose custom colors
2. See changes applied instantly

### Locale Switching

**Test 1: Language Toggle**
1. Click language switcher (top right)
2. Switch between English and Español
3. All labels should translate

### Real-time Updates

**Test 1: WebSocket Sync**
1. Have host and player in different browsers
2. Host creates a team
3. Player should see new team instantly
4. Host starts quiz
5. Player should see question instantly

---

## 🔒 Authentication Testing

### Sign Up Flow

**Test 1: Valid Signup**
```
Email: test@example.com
Password: Test1234
Display Name: Test User
```
✅ Expected: Account created, redirected to dashboard

**Test 2: Duplicate Email**
- Try signing up with same email twice
✅ Expected: Error message shown

**Test 3: Weak Password**
- Try password less than 8 characters
✅ Expected: Validation error

### Login Flow

**Test 1: Valid Credentials**
```
Email: host@demo.com
Password: Host@123
```
✅ Expected: Logged in, see dashboard

**Test 2: Invalid Credentials**
- Try wrong password
✅ Expected: Error message

**Test 3: Session Persistence**
- Login
- Refresh page
- ✅ Expected: Still logged in

### Logout Flow

**Test 1: Sign Out**
- Click "Sign Out" from dashboard
✅ Expected: Redirected to landing, cannot access dashboard

---

## 🐛 Error Scenarios

### Network Errors

**Test 1: Server Offline**
1. Stop backend server
2. Try to create session
✅ Expected: Error message displayed

**Test 2: Invalid Session Code**
1. Enter random code as player
✅ Expected: Error message

### State Errors

**Test 1: Refresh During Game**
1. Start a session
2. Refresh browser
✅ Expected: Session state maintained (WebSocket reconnects)

---

## 📊 Performance Testing

### Load Test

**Test 1: Multiple Players**
1. Join with 4-6 players from different browsers/devices
2. All should see updates
✅ Expected: No lag, all updates propagate

**Test 2: Rapid Actions**
1. Create multiple teams quickly
2. Start and reveal quiz multiple times
✅ Expected: No errors, state stays consistent

---

## 🎯 Browser Testing

Test in:
- ✅ Chrome/Edge (Primary)
- ✅ Firefox
- ✅ Safari (if available)
- ✅ Mobile browsers (responsive design)

---

## 📱 Mobile Testing

### Responsive Layout

**Test 1: Mobile Host**
1. Open host dashboard on mobile
2. Create session
3. Use all controls
✅ Expected: Usable on small screens

**Test 2: Mobile Player**
1. Join session from mobile
2. Submit answers
✅ Expected: Touch-friendly interface

---

## 🔍 Current Known Issues

1. **Timer Bar**: Uses text instead of visual progress bar (minor cosmetic)
2. **QR Code**: Not yet implemented for session sharing
3. **Session Ending**: No explicit "End Session" flow yet

---

## ✅ Success Criteria

**Core Flow Complete When:**
- [x] Host can login/signup
- [x] Host can create session
- [x] Player can join (no auth)
- [x] Teams can be created
- [x] Quiz can be started
- [x] Answers can be submitted
- [x] Scores update correctly
- [x] Host can leave/return to dashboard

**All criteria met! ✅**

---

## 🚀 Next Steps After Testing

1. **Commit all changes** to feature/vibe-coding branch
2. **Merge to master** if tests pass
3. **Deploy** to staging/production
4. **Document** any bugs found
5. **Plan** Sprint 3 features

---

## 💡 Tips

- Use Redux DevTools to monitor state changes
- Check browser console for errors
- Use Network tab to see API calls
- Backend logs show request processing

## 🆘 Troubleshooting

**Problem**: Can't login
- Check backend is running on port 3000
- Clear browser cookies
- Try demo credentials

**Problem**: Player can't join
- Check session code is correct (case-sensitive)
- Verify backend is running
- Check browser console for errors

**Problem**: Quiz not starting
- Ensure teams are created first
- Check host is authenticated
- Verify WebSocket connection

