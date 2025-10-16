# 🚨 VPN Connection Issue - SOLUTION

## Problem: Mobile Can't Connect

**Your computer has NordVPN active**, which is blocking local network access from your mobile device.

---

## ✅ SOLUTION - Choose One:

### Option 1: Disable VPN (Easiest)
1. **Disconnect NordVPN** temporarily
2. **Use this URL on mobile**: `http://192.168.1.106:5173/`
3. **Re-enable VPN** after testing

### Option 2: Configure NordVPN Whitelist
1. Open **NordVPN Settings**
2. Go to **Advanced Settings**
3. Enable **"Allow LAN access"** or **"Local Network Discovery"**
4. Try URL again: `http://192.168.1.106:5173/`

### Option 3: Use Computer IP on VPN Network (Advanced)
If you need VPN active:
- VPN IP: `10.5.0.2`
- **Try this URL**: `http://10.5.0.2:5173/`
- **Note**: Mobile must also be on same VPN (unlikely to work)

---

## 🎯 Recommended: Option 1 (Quickest)

### Step-by-Step:
1. **Disconnect NordVPN** from system tray
2. **Wait 5 seconds** for network to stabilize
3. **On mobile phone**: Open browser
4. **Type URL**: `http://192.168.1.106:5173/`
5. **Test the app**
6. **Reconnect VPN** when done

---

## ✅ Verify It Works

After disconnecting VPN, test:
1. Mobile browser → `http://192.168.1.106:5173/`
2. Should load PlayUtsav landing page
3. Login as host
4. Create session with template

---

## 🔧 Alternative: Test on Computer First

Before mobile testing:
1. On your computer browser: `http://localhost:5173/`
2. Verify app works
3. Then try mobile with VPN off

---

## 🆘 Still Not Working?

### Check Windows Firewall:
```powershell
# Allow Node.js through firewall
New-NetFirewallRule -DisplayName "Node.js Dev Server" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
```

### Check if port is accessible:
```powershell
# From another computer/mobile on same network
# Use Termux on Android or similar
curl http://192.168.1.106:5173/
```

---

## 📋 Current Network Status

**Your Computer:**
- WiFi IP: `192.168.1.106` ✅ (Use this)
- VPN IP: `10.5.0.2` ⚠️ (Blocks local access)
- WSL IP: `172.25.128.1` (Internal only)

**Servers:**
- Web: Port 5173 ✅
- API: Port 3000 ✅

**Mobile Should Use:**
```
http://192.168.1.106:5173/
```

---

## 🎉 After Disconnecting VPN

You should be able to:
1. ✅ Access app from mobile
2. ✅ Login as host
3. ✅ Create session with template
4. ✅ Test round navigation
5. ✅ Join as player from mobile

---

## 💡 Pro Tip

**For regular development:**
- Keep VPN off during local testing
- Use VPN only for production access
- Or configure VPN to allow LAN access permanently

---

**Next Step**: Disconnect VPN and try `http://192.168.1.106:5173/` on mobile! 🚀
