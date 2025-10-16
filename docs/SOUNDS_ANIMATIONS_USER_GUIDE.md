# Sounds & Animations - User Guide

## ✅ System Status: FULLY IMPLEMENTED

Your application has a complete sound and animation system! Everything is already coded and ready to work.

## 🎵 Available Sounds

| Event | Sound File | Trigger |
|-------|-----------|---------|
| **Buzzer Press** | `buzzer.mp3` | When player clicks buzzer button |
| **Correct Answer** | `coin.mp3` | When player gets correct answer (on reveal) |
| **Wrong Answer** | `coin_wrong.mp3` | When player gets wrong answer (on reveal) |

## ✨ Available Animations

| Animation | Description | Trigger |
|-----------|-------------|---------|
| **Flying Coins** | Gold coins fly to team score | When correct answer is revealed |
| **Score Pulse** | Score number grows/shrinks with gold color | When points are awarded |

## 🚀 How to Enable (First Time Use)

### Step 1: Click Anywhere on the Page
Modern browsers block audio until you interact with the page. Just **click anywhere** to unlock sounds.

You'll see in console:
```
[SoundManager] Audio unlocked successfully
```

### Step 2: Verify Settings (Optional)
Sounds are **enabled by default**, but you can check:
1. Open Host Settings panel
2. Look for "Sound Settings" section
3. Ensure:
   - ✅ Master Volume: 70%
   - ✅ Sounds Enabled: ON
   - ✅ Buzzer Sound: ON
   - ✅ Coin Sound: ON
   - ✅ Wrong Answer Sound: ON

## 🎮 Testing Each Feature

### Test 1: Buzzer Sound 🔔

**Setup**:
1. Create session with **"Buzzer Mode"** selected
2. Join as a player on your phone/another tab
3. Host starts a quiz question

**Action**: Player taps/clicks the **buzzer button**

**Expected Result**:
- ✅ You hear a buzzer sound
- ✅ Buzzer button shows "Buzzed!" or locks
- ✅ Host sees who buzzed first

**Console Check** (press F12):
```
[SoundManager] playSound called for "buzzer"
[SoundManager] Playing sound "buzzer" at volume 0.7
[SoundManager] Sound "buzzer" played successfully
```

### Test 2: Wrong Answer Sound ❌

**Setup**:
1. Quiz question is running
2. Player selects a **wrong answer**
3. Player submits the answer
4. Host clicks "Reveal Answer"

**Action**: Host reveals with correct answer set

**Expected Result**:
- ✅ Player hears "coin_wrong.mp3" sound (sad trombone style)
- ✅ Correct answer highlighted in green
- ✅ Player's wrong answer visible

**Console Check**:
```
[SoundManager] playSound called for "coin_wrong"
[SoundManager] Playing sound "coin_wrong" at volume 0.7
```

### Test 3: Correct Answer Sound + Animation ✨

**Setup**:
1. Quiz question is running
2. Player selects the **correct answer**
3. Player submits
4. Host clicks "Reveal Answer"

**Action**: Host reveals answer (with teams created!)

**Expected Result**:
- ✅ You hear "coin.mp3" sound (positive chime)
- ✅ **Flying gold coins** animation appears
- ✅ Coins fly toward the team's score
- ✅ Team score **pulses** and turns gold briefly
- ✅ Team score increases by 10 points

**Console Check**:
```
[useSessionSync] Score animation event: {teamId: "abc", points: 10, isBonus: false}
[useSessionSync] Triggering coin sound...
[SoundManager] playSound called for "coin"
[SoundManager] Playing sound "coin" at volume 0.7
```

## ❗ Important Notes

### For Score Animations to Work:
1. ✅ **Teams must be created** (not just individual players)
2. ✅ **Players must be assigned to teams**
3. ✅ **Correct answer must be set when revealing**
4. ✅ **Player who answered correctly must be on a team**

### Why You Might Not Hear Sounds:

| Issue | Reason | Fix |
|-------|--------|-----|
| No sounds at all | Audio not unlocked | Click anywhere on page first |
| Sounds work once, then stop | Page refreshed | Click again to re-unlock |
| Buzzer sound works, quiz sounds don't | Wrong answer or no teams | Ensure correct setup |
| No score animation | Player not on team | Create teams, assign players |
| Silent in mobile | Browser restrictions | Tap screen first, check volume |

## 🔧 Troubleshooting

### Open Browser Console (F12)

**Good System (Working)**:
```
✅ [SoundManager] Initializing with settings: {...}
✅ [SoundManager] Preloading sound "coin": /sounds/coin.mp3
✅ [SoundManager] Preloading sound "buzzer": /sounds/buzzer.mp3
✅ [SoundManager] Preloading sound "coin_wrong": /sounds/coin_wrong.mp3
✅ [SoundManager] Audio unlocked successfully
✅ [SoundManager] Playing sound "buzzer" at volume 0.7
✅ [SoundManager] Sound "buzzer" played successfully
```

**Problem Indicators**:
```
❌ Sound "buzzer" blocked: audio not unlocked yet
   → Click anywhere on the page

❌ Sound "buzzer" blocked: settings not ready or sounds disabled
   → Check settings, enable sounds

❌ Sound "buzzer" blocked: cache not found or disabled
   → Refresh page, check sound files exist

❌ 404 on /sounds/buzzer.mp3
   → Web server issue, verify server running on port 5173
```

### Quick Sound Test

Paste this in browser console (F12):
```javascript
// Test if sound files are accessible and play correctly
const testSound = async (name) => {
  const audio = new Audio(`/sounds/${name}.mp3`);
  audio.volume = 0.7;
  try {
    await audio.play();
    console.log(`✅ ${name} sound works!`);
  } catch (err) {
    console.error(`❌ ${name} sound failed:`, err);
  }
};

// Test all sounds with 1 second delay between each
testSound('buzzer');
setTimeout(() => testSound('coin'), 1000);
setTimeout(() => testSound('coin_wrong'), 2000);
```

If this works, your sound system is 100% functional!

## 📱 Mobile Considerations

### iOS Safari
- Requires user tap before audio plays
- Check device volume and ringer switch
- Sounds work in PWA mode

### Android Chrome
- Usually works after first tap
- Check notification/media volume
- Enable audio in browser permissions

## 🎨 Animation Settings

Animations are also **enabled by default**. To disable:
1. Open Host Settings
2. Find "Animation Settings"
3. Toggle off if experiencing lag

**Performance**: System auto-detects slow devices and may disable heavy animations automatically.

## 🎯 Expected User Experience

### Host View:
1. Start quiz → No sound (visual only)
2. Player buzzes → See notification
3. Reveal answer → No sound (unless you're also a player)

### Player View:
1. Press buzzer → **🔔 Hear buzzer sound**
2. Submit answer → No sound yet
3. Host reveals (you're wrong) → **❌ Hear sad sound**
4. Host reveals (you're right) → **✨ Hear chime, see flying coins**

## 🆘 Still Not Working?

Please provide these details:

1. **Browser**: Chrome/Firefox/Safari/Edge + version
2. **Device**: Windows/Mac/iPhone/Android
3. **Console Logs**: Copy all `[SoundManager]` lines
4. **Which sound**: Buzzer/Correct/Wrong
5. **Test result**: Does the manual console test work?
6. **Settings**: Screenshot of sound settings panel

Attach this info and we can debug further!

---

## Quick Reference: Files

- Sound files: `apps/web/public/sounds/*.mp3`
- Sound manager: `apps/web/src/lib/soundManager.ts`
- Settings: `apps/web/src/store/slices/settingsSlice.ts`
- Animations: `apps/web/src/components/ScoreAnimation.tsx`

Everything is ready to go! Just click to unlock audio and enjoy! 🎉
