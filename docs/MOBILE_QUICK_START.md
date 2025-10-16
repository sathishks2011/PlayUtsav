# 📱 Quick Mobile Testing Setup

## 🚀 Access Your App on Mobile - RIGHT NOW!

### ✅ Servers Running:
- **Web App**: `http://192.168.1.106:5173/` ✅
- **API**: `http://192.168.2.1:3000` ✅

---

## 📲 STEP 1: Open on Mobile

**On your mobile phone:**

1. **Connect to same WiFi** as your computer
2. **Open browser** (Chrome, Safari, Firefox)
3. **Type this URL**: `http://192.168.1.106:5173/`

**If that doesn't work, try these alternatives:**
- `http://10.5.0.2:5173/`
- `http://172.25.128.1:5173/`

---

## 🔧 STEP 2: If Connection Fails

### Option A: Check Firewall (Quick Fix)
1. Windows Search → "Windows Firewall"
2. Click "Allow an app through firewall"
3. Find "Node.js" → Check both Private and Public
4. Click OK

### Option B: Use Same IP for Both Services

**The issue**: Your API is on `192.168.2.1` but web is on `192.168.1.106` - these might be different networks!

**Solution**: Use the same IP for both:

1. **Update API config** to use `192.168.1.106`:
   ```json
   // apps/web/public/config.json
   {
     "API_BASE_URL": "http://192.168.1.106:3000"
   }
   ```

2. **Restart web server** (already done automatically by Vite)

---

## 🎯 STEP 3: Test Template Feature

### Quick Test Flow:
1. ✅ Mobile browser → `http://192.168.1.106:5173/host/login`
2. ✅ Login with your host credentials
3. ✅ Create new session
4. ✅ **Select a template from dropdown** ⭐
5. ✅ Verify no error message
6. ✅ Open session → See round info banner
7. ✅ Use round selector to navigate

---

## 🆘 Quick Troubleshooting

### Problem: "Can't reach this page"
- **Check WiFi**: Same network on both devices?
- **Try alternatives**: Use the other URLs listed above
- **Disable VPN**: If you have VPN on mobile

### Problem: "API Error" or features don't work
- **Different networks detected!**
- **Quick Fix**: Update `apps/web/public/config.json` to use same IP as web server:
  ```json
  {
    "API_BASE_URL": "http://192.168.1.106:3000"
  }
  ```

### Problem: Firewall blocking
```powershell
# Temporarily disable firewall (testing only!)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Re-enable after testing
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

---

## ✨ What to Test

### Template Attachment ⭐ NEW!
- [ ] Template dropdown shows templates
- [ ] Session creates without error
- [ ] Template badge shows on card

### Round Navigation ⭐ NEW!
- [ ] Round info banner at top (gradient)
- [ ] Round selector dropdowns (host only)
- [ ] Selecting round changes question
- [ ] Selector disables during quiz

### Player View
- [ ] Join from mobile → `/join`
- [ ] See round info banner
- [ ] No round selector (player can't change)

---

## 📋 URLs Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| **Web App** | `http://192.168.1.106:5173/` | Main access |
| **Host Login** | `http://192.168.1.106:5173/host/login` | Host portal |
| **Player Join** | `http://192.168.1.106:5173/join` | Player entry |
| **API** | `http://192.168.2.1:3000` | Backend (may need update) |

---

## 🎉 You're Ready!

Just open `http://192.168.1.106:5173/` on your mobile browser and start testing!

For detailed testing guide, see: `docs/MOBILE_TESTING_GUIDE.md`
