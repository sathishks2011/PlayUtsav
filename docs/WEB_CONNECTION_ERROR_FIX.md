# Web Connection Error Troubleshooting Guide

## 🔴 Current Status

**Issue**: Web app shows connection error, but mobile works fine.

**Analysis**:
- ✅ API Server: Running on `http://192.168.2.1:3000`
- ✅ Web Dev Server: Running on port 5173
- ✅ Mobile App: Working (connects successfully)
- ❌ Web App: Connection error

## 🔍 Root Cause Analysis

### Why Mobile Works but Web Doesn't

**Mobile Configuration**:
- Uses direct API URL configuration
- Likely configured with: `http://192.168.2.1:3000`
- No proxy involved

**Web Configuration**:
- Uses relative path: `/api` in `config.json`
- In development mode, this gets converted to: `http://localhost:3000`
- WebSocket tries to connect to: `http://<hostname>:3000`

### Possible Issues:

1. **Hostname Resolution**
   - `window.location.hostname` might return `localhost` or `127.0.0.1`
   - Should return `192.168.2.1` to match your network setup

2. **CORS Issues**
   - API server might not allow connections from web origin
   - WebSocket handshake might be failing

3. **Socket.IO Path Mismatch**
   - Web trying to connect to `/sessions` namespace
   - Path might not match what API expects

## 🎯 Quick Fixes

### Fix 1: Update Web Config (Recommended)

Change `apps/web/public/config.json`:
```json
{
  "API_BASE_URL": "http://192.168.2.1:3000"
}
```

This makes web use the same direct URL as mobile.

### Fix 2: Check Browser Console

Open browser DevTools (F12) and check:
1. **Console Tab**: Look for connection errors
2. **Network Tab**: Filter by WS (WebSocket), check handshake
3. Look for errors like:
   - `WebSocket connection failed`
   - `CORS error`
   - `404 Not Found`
   - `ERR_CONNECTION_REFUSED`

### Fix 3: Verify WebSocket URL

Add this to browser console:
```javascript
console.log('Hostname:', window.location.hostname);
console.log('Protocol:', window.location.protocol);
console.log('Expected WebSocket URL:', `${window.location.protocol}//${window.location.hostname}:3000`);
```

Expected output: `http://192.168.2.1:3000`

## 📝 Step-by-Step Testing

### Step 1: Check Current Config
1. Open: `http://192.168.2.1:5173`
2. Open DevTools (F12) → Console
3. Type: `await fetch('/config.json').then(r => r.json())`
4. Should show: `{ "API_BASE_URL": "/api" }`

### Step 2: Test API Connectivity
In browser console:
```javascript
// Test API health endpoint
fetch('http://192.168.2.1:3000/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

Expected: `{ status: 'ok' }`

### Step 3: Check WebSocket Connection
Look for these logs in browser console:
```
[WebSocketProvider] Initializing socket connection...
[SessionSocket] Connection state changed: connecting
[SessionSocket] Connected to server
[SessionSocket] Connection state changed: connected
```

If you see errors instead:
```
[SessionSocket] Connection error: ...
[SessionSocket] Connection state changed: error
```

### Step 4: Apply Fix

**Option A - Direct URL (Quick Fix)**:
1. Edit `apps/web/public/config.json`
2. Change to: `"API_BASE_URL": "http://192.168.2.1:3000"`
3. Refresh browser
4. Connection should work

**Option B - Debug Current Setup**:
1. Check what URL getWebSocketBaseUrl() returns
2. Add console.log in `apps/web/src/lib/config.ts`:
```typescript
export async function getWebSocketBaseUrl() {
  const config = await loadConfig();
  const apiUrl = config.API_BASE_URL.replace(/\/$/, '');
  
  console.log('[getWebSocketBaseUrl] Config:', config);
  console.log('[getWebSocketBaseUrl] isDev:', import.meta.env.DEV);
  console.log('[getWebSocketBaseUrl] hostname:', window.location.hostname);
  
  if (apiUrl.startsWith('/')) {
    const isDev = import.meta.env.DEV;
    if (isDev) {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const hostname = window.location.hostname;
      const url = `${protocol}//${hostname}:3000`;
      console.log('[getWebSocketBaseUrl] Returning dev URL:', url);
      return url;
    }
  }
  
  console.log('[getWebSocketBaseUrl] Returning config URL:', apiUrl);
  return apiUrl;
}
```

## 🔧 Common Issues & Solutions

### Issue 1: "Connection Refused"
**Symptom**: `ERR_CONNECTION_REFUSED` in console  
**Cause**: API server not running or wrong port  
**Solution**: 
- Check API server: `Get-NetTCPConnection -LocalPort 3000`
- Restart: `cd services/api ; pnpm start:dev`

### Issue 2: "WebSocket Handshake Failed"
**Symptom**: `WebSocket connection failed: Error during WebSocket handshake`  
**Cause**: CORS or path mismatch  
**Solution**: Check API CORS settings in `services/api/src/main.ts`

### Issue 3: "404 Not Found"
**Symptom**: WebSocket shows 404 in Network tab  
**Cause**: Wrong namespace or path  
**Solution**: Verify Socket.IO connects to `/sessions` namespace

### Issue 4: Hostname is "localhost" instead of IP
**Symptom**: Web tries to connect to `localhost:3000` instead of `192.168.2.1:3000`  
**Cause**: Accessing via `localhost:5173` instead of IP  
**Solution**: Always access via `http://192.168.2.1:5173`

## 📊 Comparison: Mobile vs Web

| Aspect | Mobile (Working ✅) | Web (Not Working ❌) |
|--------|---------------------|----------------------|
| Config | Direct URL: `192.168.2.1:3000` | Relative: `/api` |
| WebSocket URL | `192.168.2.1:3000/sessions` | `localhost:3000/sessions` (?) |
| Proxy | None | Vite proxy (dev mode) |
| Connection | Direct | Through dev server |

## ✅ Recommended Solution

**Change `apps/web/public/config.json`**:
```json
{
  "API_BASE_URL": "http://192.168.2.1:3000"
}
```

**Why This Works**:
- ✅ Uses same URL as mobile
- ✅ No hostname resolution issues
- ✅ No proxy complications
- ✅ Direct WebSocket connection
- ✅ Works across all devices on network

**After Change**:
1. Refresh browser
2. Connection banner should disappear
3. Check console for successful connection logs

## 🚀 Next Steps

1. **Immediate**: Apply Fix 1 (update config.json)
2. **Short-term**: Test web app connection
3. **Long-term**: Consider environment-based config
   - Dev: Use localhost for local dev
   - Network: Use IP for cross-device testing
   - Production: Use domain name

## 📝 Testing Checklist

- [ ] API server running on port 3000
- [ ] Web dev server running on port 5173
- [ ] Access web via: `http://192.168.2.1:5173`
- [ ] Update config.json with direct URL
- [ ] Refresh browser (Ctrl+Shift+R)
- [ ] Check connection banner (should be gone)
- [ ] Check console for connection logs
- [ ] Test real-time features (quiz updates)
- [ ] Mobile still works
- [ ] Web works on same device
- [ ] Web works on other devices

## 🎉 Success Criteria

Connection is working when:
- ✅ No red/orange connection banner
- ✅ Console shows: "Connected to server"
- ✅ WebSocket events working
- ✅ Real-time updates visible
- ✅ No connection errors in console
- ✅ Both mobile and web work simultaneously
