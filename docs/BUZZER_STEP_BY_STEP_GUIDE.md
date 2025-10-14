# 🎯 BUZZER MODE - Complete Step-by-Step Guide

## ⚠️ IMPORTANT: Buzzer Only Works During Active Quiz!

The buzzer feature **only appears when there's an active quiz running**. You must start a quiz BEFORE you can use the buzzer.

---

## 📋 Prerequisites Checklist

Before starting, make sure:
- [ ] API server is running on port 3000
- [ ] Web app is running on port 5173
- [ ] You have 2-3 browser tabs ready (1 host + 2 players)

---

## 🚀 Complete Workflow

### STEP 1: Create a BUZZER Mode Session

**On Host Tab:**

1. Go to `http://localhost:5173`
2. Click **"Create New Session"** button
3. Fill in:
   - Session Name: `Test Buzzer`
   - Team Names: `Red Team`, `Blue Team`
4. **IMPORTANT**: In "Player Engagement Type" section, select:
   ```
   ● Buzzer Mode  ← Click this radio button!
   ```
   (NOT "Multiple Choice")
5. Click **"Start Session"**
6. You'll get a 6-digit join code (e.g., `ABC123`)

**What you should see:**
```
┌─────────────────────────────────────┐
│ Player Engagement Type              │
│                                     │
│ ○ Multiple Choice (Default)        │
│   Players select from answer...    │
│                                     │
│ ● Buzzer Mode  ← SELECTED          │
│   Fast-paced quick-fire rounds...  │
└─────────────────────────────────────┘
```

---

### STEP 2: Join as Players

**On Player Tab 1:**
1. Open new browser tab: `http://localhost:5173`
2. Enter join code: `ABC123`
3. Enter name: `Player 1`
4. Join `Red Team`
5. Click **"Join Session"**

**On Player Tab 2:**
1. Open another browser tab: `http://localhost:5173`
2. Enter same join code: `ABC123`
3. Enter name: `Player 2`
4. Join `Blue Team`
5. Click **"Join Session"**

**What players should see:**
- Waiting screen with session info
- Team color badge
- "Waiting for host to start quiz"

---

### STEP 3: Host Starts a Quiz (CRITICAL!)

**Back on Host Tab:**

1. In left sidebar, click **"Game Control"** tab
2. You'll see TWO sections:
   - **"Host Game Control"** (top section)
   - **"Buzzer Controls"** (bottom section) ← This is where buzzer controls are!

3. In the **"Host Game Control"** section (TOP):
   - Enter a question: `What is 2+2?`
   - Enter options:
     - Option 1: `3`
     - Option 2: `4`
     - Option 3: `5`
     - Option 4: `6`
   - Select correct answer: `4`
   - Duration: `30` seconds
   
4. Click **"Start Quiz"** button

**What you should see:**
```
┌────────────────────────────────────────┐
│ HOST GAME CONTROL                      │
├────────────────────────────────────────┤
│ Question: What is 2+2?                 │
│ Options: [3] [4] [5] [6]               │
│ Correct: 4                             │
│ Duration: 30s                          │
│                                        │
│ [Start Quiz] ← CLICK THIS!             │
└────────────────────────────────────────┘
```

**AFTER clicking "Start Quiz":**

```
┌────────────────────────────────────────┐
│ HOST GAME CONTROL                      │
├────────────────────────────────────────┤
│ 📝 What is 2+2?                        │
│ ⏱️ 30 seconds remaining                │
│ Status: Running                        │
│ [Reveal Answer]                        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ BUZZER CONTROLS  ← NOW VISIBLE!       │
├────────────────────────────────────────┤
│ Status: Buzzer Closed                  │
│                                        │
│ [Open Buzzer] [Close] [Reset]          │
│                                        │
│ Buzzer Presses                         │
│ No buzzers yet. Open the buzzer...    │
└────────────────────────────────────────┘
```

---

### STEP 4: Host Opens Buzzer

**On Host Tab:**

1. Scroll down to **"Buzzer Controls"** section
2. Click **"Open Buzzer"** button

**What changes:**
```
┌────────────────────────────────────────┐
│ BUZZER CONTROLS                        │
├────────────────────────────────────────┤
│ Status: 🟢 Buzzer Open                 │
│ ⏱️ Time remaining: 30s                 │
│                                        │
│ [Open Buzzer] [Close] [Reset]          │
│  ↑ button now disabled/grayed out     │
│                                        │
│ Buzzer Presses                         │
│ Waiting for players to buzz in...     │
└────────────────────────────────────────┘
```

**On Player Tabs:**
- Both players should now see a **BUZZER BUTTON** appear!
- Quiz options should be **LOCKED** (disabled/grayed out)
- Blue banner: "🔒 Quiz locked. Press the buzzer..."

```
┌────────────────────────────────────────┐
│ PLAYER 1 VIEW                          │
├────────────────────────────────────────┤
│ 🔒 Quiz locked. Press the buzzer and   │
│    wait for host to allow you.         │
│                                        │
│ ┌────────────────────────────────┐    │
│ │         BUZZER                 │    │
│ │  [    PRESS TO BUZZ IN!    ]   │    │ ← Click this!
│ │         Ready                  │    │
│ └────────────────────────────────┘    │
│                                        │
│ Quiz: What is 2+2?                     │
│ ○ 3  (disabled)                        │
│ ○ 4  (disabled)                        │
│ ○ 5  (disabled)                        │
│ ○ 6  (disabled)                        │
└────────────────────────────────────────┘
```

---

### STEP 5: Player 1 Presses Buzzer

**On Player 1 Tab:**
1. Click the big **"PRESS TO BUZZ IN!"** button

**What Player 1 sees:**
- Buzzer button changes to show `#1` badge (red)
- Still shows locked quiz (waiting for host to allow)

**What Host sees (IMPORTANT!):**
```
┌────────────────────────────────────────┐
│ BUZZER CONTROLS                        │
├────────────────────────────────────────┤
│ Status: 🟢 Buzzer Open                 │
│                                        │
│ Buzzer Presses                         │
│ ┌────────────────────────────────┐    │
│ │ [#1] Player 1                  │    │ ← NEW!
│ │      Red Team                  │    │
│ │      10:23:45 PM               │    │
│ │                  [1ST] [Allow] │ ← CLICK THIS!
│ └────────────────────────────────┘    │
└────────────────────────────────────────┘
```

The **[Allow]** button appears next to the player who buzzed!

---

### STEP 6: Host Clicks "Allow" Button

**On Host Tab:**
1. Find the player who pressed buzzer (Player 1)
2. Click the **[Allow]** button next to their name

**What changes:**

**Host sees:**
```
┌────────────────────────────────────────┐
│ [#1] Player 1 [Answering]  ← Green badge
│      Red Team                          │
│      10:23:45 PM                       │
│                    [1ST] [Selected]    │ ← Button turns GREEN
│                          ↑ Changed!    │
└────────────────────────────────────────┘
```

**Player 1 sees:**
```
┌────────────────────────────────────────┐
│ ✅ You buzzed first! Select your answer│ ← Green banner
│                                        │
│ Quiz: What is 2+2?                     │
│ ○ 3  (enabled now!)                    │
│ ○ 4  (enabled now!)                    │
│ ○ 5  (enabled now!)                    │
│ ○ 6  (enabled now!)                    │
│ [Submit Answer]                        │
└────────────────────────────────────────┘
```

**Player 2 sees:**
```
┌────────────────────────────────────────┐
│ ⚠️ Another player is answering.        │ ← Amber banner
│    Wait for the next round.            │
│                                        │
│ Quiz: What is 2+2?                     │
│ ○ 3  (still disabled)                  │
│ ○ 4  (still disabled)                  │
│ ○ 5  (still disabled)                  │
│ ○ 6  (still disabled)                  │
└────────────────────────────────────────┘
```

---

### STEP 7: Player 1 Submits Answer

**On Player 1 Tab:**
1. Select answer: `4`
2. Click **"Submit Answer"**

**Host can now:**
- Click **"Reveal Answer"** to show correct answer
- Click **"Reset"** buzzer to let others try
- Start a new quiz question

---

## 🎯 Quick Reference

### Where is Everything?

| What | Where | Tab |
|------|-------|-----|
| Create Session | Dashboard → Create New Session | Host |
| Select Buzzer Mode | Session creation form, radio button | Host |
| Buzzer Controls | Game Control tab → Bottom section | Host |
| Start Quiz | Game Control tab → Top section | Host |
| Open Buzzer | Buzzer Controls → "Open Buzzer" button | Host |
| Allow Button | Buzzer Controls → Next to player name | Host |
| Buzzer Button | Player lobby, appears when buzzer opens | Player |
| Quiz Panel | Player lobby, below buzzer button | Player |

---

## 🐛 Troubleshooting

### I don't see "Buzzer Controls" section
- ❌ You created a "Multiple Choice" session
- ✅ Create NEW session with "Buzzer Mode" selected

### I don't see the "Open Buzzer" button
- ❌ No active quiz running
- ✅ Start a quiz first (Host Game Control → Start Quiz)

### Players don't see buzzer button
- ❌ Buzzer not opened by host
- ✅ Host must click "Open Buzzer" in Buzzer Controls

### Quiz options are disabled for everyone
- ❌ No one has been "Allowed" yet
- ✅ Host must click "Allow" button after someone buzzes

### "Allow" button doesn't appear
- ❌ No player has pressed buzzer yet
- ✅ Player must click the buzzer button first

### Button doesn't change to "Selected"
- Check browser console for errors
- Hard refresh (Ctrl+Shift+R)
- Check if API server is running

---

## 📝 Console Debug Commands

Open browser console (F12) and type:

```javascript
// Check current session
const session = window.store?.getState()?.session?.current;
console.log('Session Type:', session?.playerEngagementType);
// Should show: "BUZZER"

// Check quiz state
const quiz = window.store?.getState()?.quiz?.current;
console.log('Quiz Active:', quiz?.status);
console.log('Buzzer State:', quiz?.buzzerState);
```

---

## ✅ Success Criteria

You know it's working when:
1. ✅ You create session with "Buzzer Mode" selected
2. ✅ "Buzzer Controls" section appears in Game Control tab
3. ✅ After starting quiz, "Open Buzzer" button is clickable
4. ✅ Players see buzzer button when host opens buzzer
5. ✅ Host sees player name + [Allow] button when player buzzes
6. ✅ [Allow] button changes to green [Selected] when clicked
7. ✅ Player 1 can answer quiz, Player 2 sees "locked" message
