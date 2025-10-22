# Chrome Compatibility Fix

## What was fixed:

1. **Vite Configuration Updated** ([vite.config.ts](apps/web/vite.config.ts)):
   - Set explicit `host: '0.0.0.0'` and `port: 5174`
   - Disabled Service Worker in development (`devOptions.enabled: false`)
   - Added explicit CORS support (`cors: true`)
   - Configured HMR (Hot Module Replacement) to use `localhost` with `ws` protocol for Chrome compatibility

2. **Service Worker Issue**: The PWA plugin was registering a service worker in dev mode, which can cause caching issues in Chrome.

## Steps to Clear Chrome Cache:

### Method 1: Clear Service Workers (Recommended)
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in the left sidebar
4. Click **Unregister** for any PlayUtsav service workers
5. Click **Storage** in left sidebar
6. Click **Clear site data** button
7. Close DevTools and refresh the page (Ctrl+Shift+R for hard refresh)

### Method 2: Clear All Cache
1. In Chrome, press `Ctrl+Shift+Delete`
2. Select **All time** for time range
3. Check:
   - Cached images and files
   - Cookies and other site data
4. Click **Clear data**
5. Restart Chrome

### Method 3: Use Incognito Mode (Quick Test)
1. Open Chrome Incognito window (Ctrl+Shift+N)
2. Navigate to `http://localhost:5174`
3. This bypasses all cache and service workers

## How to Restart the Dev Server:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart with:
pnpm --filter @app/web dev
```

The server will now run on `http://localhost:5174` with Chrome-compatible settings.

## Common Chrome Issues Fixed:

- ✅ WebSocket/HMR connection issues
- ✅ Service Worker caching in development
- ✅ CORS policy errors
- ✅ Port consistency (now uses 5174)
- ✅ 0.0.0.0 vs localhost binding issues

## If Still Not Working:

Check Chrome Console (F12 → Console tab) for specific errors and share them for further debugging.
