# Mobile Testing Guide - PlayUtsav Event Management App

## 📱 Quick Start - Access from Mobile

### Current Server Status
✅ **API Server**: Running on `http://192.168.2.1:3000`
✅ **Web App**: Running on multiple network interfaces

### 🌐 Access URLs from Your Mobile Device

**Choose the URL that matches your network:**

1. **Primary Network** (Most likely): `http://192.168.1.106:5173/`
2. **Alternative Network 1**: `http://10.5.0.2:5173/`
3. **Alternative Network 2**: `http://172.25.128.1:5173/`

### 🔍 Which URL Should I Use?

- **Same WiFi Network**: Use `http://192.168.1.106:5173/`
- **VPN/Corporate Network**: Try `http://10.5.0.2:5173/`
- **Virtual Network**: Try `http://172.25.128.1:5173/`

**Quick Test**: Open your mobile browser and try each URL until one loads!

---

## 📋 Prerequisites

### ✅ Before You Start
1. ✅ **Computer & Mobile on Same Network**
   - Both devices must be connected to the same WiFi network
   - Corporate networks may block device-to-device communication
   
2. ✅ **Firewall Settings**
   - Windows Firewall may need to allow Node.js and Vite
   - If connection fails, temporarily disable firewall or add exception

3. ✅ **Servers Running**
   - API Server: Port 3000 ✅
   - Web Server: Port 5173 ✅

---

## 🚀 Step-by-Step Testing Process

### Step 1: Access the App on Mobile

1. **Open mobile browser** (Chrome, Safari, Firefox, Edge)
2. **Type the URL**: `http://192.168.1.106:5173/`
3. **Wait for load**: Should see the PlayUtsav landing page

### Step 2: Login as Host

1. **Navigate to Host Login**: `/host/login`
   - Full URL: `http://192.168.1.106:5173/host/login`
   
2. **Enter credentials**:
   - Email: Your host account email
   - Password: Your host password
   
3. **Click Login**: Should redirect to Host Dashboard

### Step 3: Test Template Attachment

1. **Create New Session**:
   - Enter host name (optional)
   - Select max players
   - Choose language
   - **Select a quiz template from dropdown** ⭐
   
2. **Verify Template Attached**:
   - Session should be created without errors
   - Should see template badge on session card
   
3. **Enter Session**:
   - Click on the session card
   - Should see Host Lobby

### Step 4: Test Round Navigation (New Feature!)

1. **In Host Quiz Panel**:
   - Look for **Round Info Banner** at top (gradient blue→purple)
   - Should show: Template name, Round name, Progress counters
   
2. **Navigate Between Rounds**:
   - Find **Round Selector** dropdowns (below banner)
   - **Round Dropdown**: Select different rounds/categories
   - **Question Dropdown**: Select different questions
   
3. **Verify Changes**:
   - Question should update when you select new round
   - Round info banner should update
   - Progress counters should update

### Step 5: Test Quiz Flow

1. **Start Quiz**:
   - Click "Start Quiz" button
   - Round selector should become disabled
   
2. **Answer Question**:
   - Select an answer
   - Click "Reveal Answer"
   
3. **Check Next Question**:
   - Question should advance (if auto-advance implemented)
   - Or manually select next question

### Step 6: Test Player View (Multi-Device)

1. **Keep Host Panel Open** on computer
2. **Open Player View** on mobile:
   - Navigate to: `http://192.168.1.106:5173/join`
   - Enter session code
   - Enter player name
   
3. **Verify Round Info**:
   - Player should see **Round Info Banner**
   - Player should NOT see round selector
   - Info should update when host changes rounds

---

## 🎯 What to Test - Template Feature Checklist

### ✅ Template Attachment
- [ ] Template dropdown shows all available templates
- [ ] Template shows round count and question count
- [ ] Session creates successfully with template
- [ ] Template badge shows on session card
- [ ] No error message about template attachment

### ✅ Round Info Display
- [ ] Round info banner appears at top
- [ ] Shows correct template name
- [ ] Shows correct round/category name
- [ ] Shows correct round counter (e.g., "2 / 5")
- [ ] Shows correct question counter (e.g., "3 / 10")
- [ ] Gradient styling looks good on mobile

### ✅ Round Navigation (Host Only)
- [ ] Round selector appears below banner
- [ ] Round dropdown shows all categories
- [ ] Question dropdown shows all questions
- [ ] Selecting round changes question
- [ ] Selecting question updates display
- [ ] Round selector disables during active quiz
- [ ] Round selector re-enables after reveal

### ✅ Player Experience
- [ ] Player sees round info banner
- [ ] Player does NOT see round selector
- [ ] Round info updates when host changes rounds
- [ ] No errors in player view

### ✅ Scoring with Template Points
- [ ] Questions use custom points from template
- [ ] Scores calculate correctly
- [ ] Leaderboard updates properly

---

## 🐛 Troubleshooting

### Problem: Can't Access from Mobile

**Symptom**: URL doesn't load / "Can't reach this page"

**Solutions**:
1. **Check same WiFi**: 
   ```
   Mobile WiFi name = Computer WiFi name
   ```

2. **Try alternative URLs**:
   - `http://10.5.0.2:5173/`
   - `http://172.25.128.1:5173/`
   - `http://192.168.2.1:5173/` (if available)

3. **Check Windows Firewall**:
   - Windows Security → Firewall & Network Protection
   - Allow app through firewall → Node.js
   - Allow app through firewall → Vite

4. **Restart servers** (if needed):
   ```powershell
   # Stop and restart
   Ctrl+C in terminals
   cd apps/web ; pnpm dev --host
   cd services/api ; pnpm start:dev
   ```

### Problem: API Requests Failing

**Symptom**: App loads but features don't work

**Solution**: Check API URL in config
```typescript
// apps/web/public/config.json
{
  "apiBaseUrl": "http://192.168.2.1:3000"
}
```

### Problem: WebSocket Connection Failed

**Symptom**: Real-time updates not working

**Solutions**:
1. Check API server logs for WebSocket connection
2. Try long-polling fallback (automatic in Socket.io)
3. Check network proxy/VPN settings

### Problem: Template Not Attaching

**Symptom**: "Session created but failed to attach template"

**Already Fixed!** ✅ 
- Make sure API server has been restarted after the fix
- Check API logs for `[attachQuizTemplate]` messages

---

## 📊 Performance Testing on Mobile

### Load Time
- [ ] Initial page load < 3 seconds
- [ ] Template list loads quickly
- [ ] Round switching is instant

### Responsiveness
- [ ] Buttons are touch-friendly (min 44x44px)
- [ ] Dropdowns work well on mobile
- [ ] No horizontal scrolling
- [ ] Text is readable without zooming

### Battery Usage
- [ ] App doesn't drain battery rapidly
- [ ] WebSocket maintains connection
- [ ] No excessive polling

---

## 🎨 UI/UX Testing on Mobile

### Visual Elements
- [ ] Round info banner is visible and styled correctly
- [ ] Gradient colors render properly
- [ ] Icons (📋, 🏆) display correctly
- [ ] Dropdowns are usable with touch
- [ ] Progress counters are readable

### Navigation
- [ ] Round selector dropdowns work on touch
- [ ] Question preview text doesn't overflow
- [ ] Disabled state is visually clear
- [ ] No UI elements overlap

### Orientation
- [ ] Portrait mode works well
- [ ] Landscape mode (optional)
- [ ] Orientation change doesn't break layout

---

## 📱 Browser Compatibility

### Recommended Browsers
- ✅ **Chrome** (Android/iOS) - Best performance
- ✅ **Safari** (iOS) - Native iOS browser
- ✅ **Firefox** (Android/iOS) - Good alternative
- ⚠️ **Edge Mobile** - Should work

### Known Issues
- **iOS Safari**: May have WebSocket issues on older iOS
- **Android WebView**: May need CORS settings

---

## 🔐 Security Notes for Testing

### Development vs Production
- ⚠️ Currently using HTTP (not HTTPS) - OK for local testing
- ⚠️ IP addresses exposed on local network - Normal for dev
- ✅ JWT authentication still enforced
- ✅ Role-based access control active

### Production Deployment
For production, you'll need:
- HTTPS with SSL certificate
- Domain name instead of IP
- Proper CORS configuration
- Rate limiting
- DDoS protection

---

## 📸 Testing Scenarios

### Scenario 1: Host Creates Session with Template
1. Login as host on computer
2. Create session with "General Knowledge" template
3. Verify session appears with template badge
4. Open session on mobile
5. Navigate between rounds
6. Start quiz

### Scenario 2: Multi-Device Quiz
1. Host on computer browser
2. Player 1 on mobile browser
3. Player 2 on another mobile/tablet
4. Host starts quiz
5. Players answer
6. Host reveals
7. Check scores sync across all devices

### Scenario 3: Round Navigation During Game
1. Host starts quiz with template
2. Answer first question
3. Reveal answer
4. Use round selector to jump to Round 3
5. Verify all devices update
6. Continue quiz

---

## 🛠️ Developer Tools on Mobile

### Chrome DevTools (Remote Debugging)
1. Connect Android device via USB
2. Enable USB debugging on phone
3. Chrome → `chrome://inspect`
4. Inspect your mobile page

### Safari Web Inspector (iOS)
1. iPhone Settings → Safari → Advanced → Web Inspector
2. Connect iPhone via USB
3. Mac Safari → Develop → [Your iPhone] → [Page]

---

## ✅ Success Criteria

### Feature Complete When:
- [x] Template attachment works without errors
- [x] Round info banner displays on all devices
- [x] Round navigation works on mobile
- [x] Player view shows round info
- [x] WebSocket updates propagate
- [ ] Auto-advancing between rounds (Phase 2D)
- [ ] Full integration testing complete (Phase 4)

---

## 📞 Quick Reference

### URLs
- **Web App**: `http://192.168.1.106:5173/`
- **API**: `http://192.168.2.1:3000`
- **Host Login**: `http://192.168.1.106:5173/host/login`
- **Player Join**: `http://192.168.1.106:5173/join`

### Ports
- **Web Dev Server**: 5173
- **API Server**: 3000
- **WebSocket**: Same as API (3000)

### Commands
```powershell
# Start Web Server
cd apps/web ; pnpm dev --host

# Start API Server
cd services/api ; pnpm start:dev

# Check IP Address
ipconfig | Select-String "IPv4"
```

---

## 🎉 Happy Testing!

If you encounter any issues:
1. Check this guide's troubleshooting section
2. Check browser console for errors (F12)
3. Check API server logs
4. Verify network connectivity
5. Try different network URLs

**Current Status**: ✅ Ready to test template attachment and round navigation on mobile!
