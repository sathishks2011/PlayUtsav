# WebSocket Connection URL Fix

## Problem

The web app was showing a **red "Connection error" banner** at the top of the screen, indicating that the WebSocket connection could not be established.

### Root Cause

The Socket.IO client was trying to connect using a **relative URL path** (`/api/sessions`), but WebSocket connections require an **absolute URL with protocol and host** (e.g., `http://192.168.2.1:3000/sessions`).

**Why this happened:**
- The `config.json` specified `API_BASE_URL: "/api"`
- This works fine for HTTP requests because Vite's proxy middleware intercepts them and forwards to `http://127.0.0.1:3000`
- **However, WebSocket connections bypass the HTTP proxy** and try to establish a direct connection
- Socket.IO tried to connect to `ws://192.168.2.1:5173/api/sessions` (wrong - that's the Vite dev server)
- It should connect to `ws://192.168.2.1:3000/sessions` (correct - the API server)

### Error Symptoms

- ❌ Red "Connection error" banner displayed
- ❌ No real-time events propagating (buzzer, quiz updates, etc.)
- ❌ Console shows WebSocket connection failures
- ❌ All WebSocket features non-functional

## Solution

Created a **WebSocket-specific URL resolver** that provides the correct full URL for Socket.IO connections in development mode.

### Changes Made

#### 1. **New Function in `apps/web/src/lib/config.ts`**

```typescript
/**
 * Get the WebSocket base URL for Socket.IO connections.
 * For development, this returns the full URL with protocol and host.
 * For production, it returns the API base URL (which will be proxied).
 */
export async function getWebSocketBaseUrl() {
  const config = await loadConfig();
  const apiUrl = config.API_BASE_URL.replace(/\/$/, '');
  
  // If API_BASE_URL is a relative path (like /api), construct full URL for WebSocket
  if (apiUrl.startsWith('/')) {
    // In development, use the actual backend server URL
    // Socket.IO needs a full URL with protocol for WebSocket connections
    const isDev = import.meta.env.DEV;
    if (isDev) {
      // Use the same host as the current page, but port 3000 (API server)
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:3000`;
    }
  }
  
  // For production or absolute URLs, return as-is
  return apiUrl;
}
```

**What it does:**
- ✅ Detects when running in development mode (`import.meta.env.DEV`)
- ✅ Constructs full URL: `http://[current-hostname]:3000`
- ✅ Uses the same hostname as the browser (works with `localhost`, `192.168.2.1`, etc.)
- ✅ Targets port 3000 (where the API server runs)
- ✅ For production, returns the API base URL as-is (will be proxied by reverse proxy)

#### 2. **Updated `apps/web/src/lib/socket.ts`**

```typescript
import { createSessionSocket, SessionSocket } from '@pkg/core';
import { getWebSocketBaseUrl } from './config';  // Changed from getApiBaseUrl

let sessionSocketPromise: Promise<SessionSocket> | null = null;

export async function getSessionSocket(): Promise<SessionSocket> {
  if (!sessionSocketPromise) {
    sessionSocketPromise = getWebSocketBaseUrl().then((base) => createSessionSocket(base));
  }
  return sessionSocketPromise;
}
```

**What changed:**
- ✅ Now uses `getWebSocketBaseUrl()` instead of `getApiBaseUrl()`
- ✅ Socket.IO receives the full URL: `http://192.168.2.1:3000`
- ✅ Connects directly to the API server, not through Vite proxy

## How It Works

### Development Mode
```
Browser URL: http://192.168.2.1:5173
              ↓
getWebSocketBaseUrl() returns: http://192.168.2.1:3000
              ↓
Socket.IO connects to: ws://192.168.2.1:3000/sessions
              ↓
✅ Direct WebSocket connection to API server
```

### HTTP Requests (unchanged)
```
Browser: fetch('/api/sessions')
              ↓
Vite Proxy: Intercepts and forwards to http://127.0.0.1:3000/sessions
              ↓
✅ Works as before
```

### Production Mode
In production, both HTTP and WebSocket will use the same base URL, typically proxied by Nginx or similar:
```
Production URL: https://yourdomain.com
getWebSocketBaseUrl() returns: /api (relative, will be proxied)
Socket.IO connects to: wss://yourdomain.com/api/sessions
✅ Reverse proxy handles both HTTP and WebSocket
```

## Testing the Fix

### 1. **Connection Status Banner**
- ✅ Banner should **not** appear when page loads
- ✅ If it briefly shows "Connecting...", it should quickly disappear
- ✅ Should show "Connected" state (banner hidden)

### 2. **Browser Console**
Look for these logs:
```
[WebSocketProvider] Initializing socket connection...
[SessionSocket] Connected to server
[SessionSocket] Connection state changed: connected
```

### 3. **Real-Time Features**
Test that these work **without manual refresh**:
- ✅ Host opens buzzer → Players see it instantly
- ✅ Player presses buzzer → Host sees it instantly
- ✅ Host starts quiz → All clients see question
- ✅ Host reveals answer → All clients see answer
- ✅ Score updates → All clients see animation

### 4. **Network Tab**
Check in browser DevTools → Network tab:
- ✅ Should see WebSocket connection to `ws://192.168.2.1:3000/sessions`
- ✅ Status should be `101 Switching Protocols`
- ✅ Connection should stay open (not closing/reopening)

## Server Configuration

### Development
- **Web (Vite)**: http://192.168.2.1:5173
- **API (NestJS)**: http://192.168.2.1:3000
- **WebSocket**: Direct connection to API on port 3000

### Production (Future)
- **Both**: Served through reverse proxy
- **WebSocket**: Upgraded from HTTP on same domain

## Key Differences

| Aspect | HTTP Requests | WebSocket Connections |
|--------|---------------|----------------------|
| Protocol | HTTP/HTTPS | WS/WSS |
| Vite Proxy | ✅ Works | ❌ Doesn't work |
| URL Type | Relative OK | Must be absolute |
| Development | `/api/sessions` → Proxied | `http://host:3000/sessions` → Direct |
| Production | `/api/sessions` → Proxied | `/api/sessions` → Proxied |

## Summary

### Before (Broken)
```typescript
// Trying to connect to: ws://192.168.2.1:5173/api/sessions
// ❌ This is the Vite server, not the API server
// ❌ WebSocket fails, red error banner appears
```

### After (Fixed)
```typescript
// Connecting to: ws://192.168.2.1:3000/sessions
// ✅ This is the API server
// ✅ WebSocket succeeds, no error banner
// ✅ Real-time features work perfectly
```

---

## Current Status

**Both servers running successfully:**
- 🚀 **API**: http://192.168.2.1:3000
- 🚀 **Web**: http://192.168.2.1:5173

**WebSocket connection should now work!** 🎉

Please refresh your browser and verify:
1. No red error banner at the top
2. Real-time events work across devices
3. No manual refresh needed for updates
