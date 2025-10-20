# Running the PlayUtsav apps (API, web, TV)

This document shows copy-pastable PowerShell commands to run the API, the web admin app, and the TV app (dev and production build). It also covers serving the built `apps/tv/dist` to a TV device on the LAN, building the Android debug APK, and common troubleshooting (CORS/network). Replace placeholder IPs with your machine's LAN IP where noted.

---

## 0. Prerequisites

- Node + pnpm installed (this repo uses pnpm workspaces).
- JDK 11+ (for Android builds) and Android SDK if building the APK.
- Python (optional) for `python -m http.server` when serving static files.
- `adb` (Android Platform Tools) if you will install or debug on an Android/Fire TV device.

Paths used in examples:
- repo root: `D:\My Projects\Personal\Event Management App` (run commands from here)
- adb (example): `D:\My Projects\Personal\Event Management App\tools\platform-tools\platform-tools\adb.exe`

---

## 1. Get your host LAN IP
Run in PowerShell and note the returned IPv4 (example: `192.168.1.106`):

```powershell
(Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } |
  Select-Object -First 1).IPAddress
```

Call that value `$LANIP` below.

---

## 2. Start the API (development)

This starts the API in dev mode (automatic restart on code changes).

```powershell
# from repo root
$env:HOST='0.0.0.0'  # ensure API binds to all interfaces for TV access
$env:PORT='3000'     # optional - used if the API reads PORT env
pnpm --filter @svc/api start:dev
```

If you prefer to build and run the compiled Node output:

```powershell
pnpm --filter @svc/api build
node services\api\dist\main.js
```

If you need to enable permissive CORS for development (Nest bootstrap `main.ts`):

```ts
// services/api/src/main.ts (example)
app.enableCors({ origin: true, credentials: true });
```

Restart the API after changes.

---

## 3. Start the web admin app (dev)

```powershell
pnpm run dev:web
# or
cd apps\web
pnpm run dev
```

Vite will print the dev URL (usually `http://localhost:5173`).

---

## 4. Start the TV app in dev mode (vite)

```powershell
pnpm run dev:tv
# or
cd apps\tv
pnpm run dev
```

This runs a Vite server for the TV app. For device testing, prefer building `dist` and serving it over LAN (next section).

---

## 5. Build the TV app and serve `dist` on the LAN (for TV/browser)

1) Build:

```powershell
pnpm --filter @app/tv build
# output: apps\tv\dist
```

2) Make the runtime config point to your API (replace `$LANIP`):

```powershell
$LANIP = '192.168.1.106'  # set to your machine IP
Set-Content -Path 'apps/tv/dist/config.json' -Value ("{`"API_BASE_URL`": `"http://$LANIP:3000`"}")
```

3) Serve the `dist` folder on the LAN (port 8080 example):

- With Node `http-server` (if installed):

```powershell
cd apps\tv\dist
npx http-server . -p 8080 -a 0.0.0.0
```

- Or Python built-in server:

```powershell
cd apps\tv\dist
python -m http.server 8080 --bind 0.0.0.0
```

Open on the TV device: `http://$LANIP:8080` (add `?_nocache=1` to force reload).

---

## 6. Open the page on a Fire TV (via adb)

```powershell
$adb='D:\My Projects\Personal\Event Management App\tools\platform-tools\platform-tools\adb.exe'
& $adb devices
& $adb shell am start -a android.intent.action.VIEW -d "http://$LANIP:8080"
```

If the device shows a cached build, append query string `?_nocache=1`.

---

## 7. Build and install the Android debug APK (optional)

From `apps/tv/android`:

```powershell
# ensure Android SDK path is set in local.properties
Set-Content -Path .\local.properties -Value "sdk.dir=D:\\My Projects\\Personal\\Event Management App\\tools\\android-sdk"

# ensure JDK is on PATH (example: after installation)
# Build debug apk
cd apps\tv\android
.\gradlew.bat assembleDebug --no-daemon -x lint

# Install (using adb)
$apk = "$(Resolve-Path .)\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apk) {
  & $adb install -r $apk
} else {
  Write-Error "APK not found: $apk"
}
```

Notes:
- The native APK may bundle a copy of `apps/tv/dist`. If you rebuild the web assets, repackage the APK to include them.

---

## 8. Tail logs + capture device output

Tail logcat (filter for WebView/Chromium and your DEV messages):

```powershell
& $adb logcat -v time | Select-String -Pattern 'DEV:','fetch','Chromium','WebView','console.error','playapp' -SimpleMatch
```

Take a screenshot:

```powershell
& $adb shell screencap -p /sdcard/tv_screenshot.png
& $adb pull /sdcard/tv_screenshot.png .\tools\tv_screenshot.png
& $adb shell rm /sdcard/tv_screenshot.png
```

---

## 9. Quick checks when the TV shows "failed to fetch"

1) Confirm the TV is attempting the correct API URL (use the DEV JOIN overlay or screenshot). If it shows `http://192.168.2.1:3000`, that means the TV page is using a different IP.

2) From your dev PC test connectivity:

```powershell
Test-NetConnection -ComputerName 192.168.2.1 -Port 3000 -InformationLevel Detailed
Test-NetConnection -ComputerName 192.168.1.106 -Port 3000 -InformationLevel Detailed
```

If TV IP fails and dev PC succeeds, the TV is on another subnet.

3) From your PC inspect API headers (CORS):

```powershell
$response = Invoke-WebRequest -Uri "http://$LANIP:3000/sessions" -UseBasicParsing -Method Get -ErrorAction Stop
$response.StatusCode
$response.Headers
$response.Content.Substring(0,200)
```

Required CORS headers for the TV browser if client uses `credentials: 'include'`:

```
Access-Control-Allow-Origin: http://$LANIP:8080    (or the specific origin)
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,OPTIONS,PUT,DELETE
Access-Control-Allow-Headers: Content-Type,Authorization
```

For dev only, enabling `origin: true` in Nest (see section 2) is the fastest fix.

---

## 10. Quick "run everything" example

Open three PowerShell windows and run:

Window 1 (API):
```powershell
cd "D:\My Projects\Personal\Event Management App"
$env:HOST='0.0.0.0'; $env:PORT='3000'
pnpm --filter @svc/api start:dev
```

Window 2 (TV dev server) - or build+serve dist:
```powershell
cd "D:\My Projects\Personal\Event Management App\apps\tv"
pnpm run dev
# OR build+serve
pnpm --filter @app/tv build
cd apps\tv\dist
python -m http.server 8080 --bind 0.0.0.0
```

Window 3 (web admin):
```powershell
pnpm run dev:web
```

---

## 11. Troubleshooting notes

- If the TV cannot reach your PC, connect both devices to the same Wi‑Fi and verify IPs are on the same 192.168.x.x subnet. Some routers isolate wireless clients—disable client isolation.
- If the API is up but the browser reports CORS issues, update the API's CORS configuration and restart.
- If you see cached old assets in the native APK, rebuild the web assets and repackage the APK.

---

If you want, I can also:
- Patch the API's `services/api/src/main.ts` to enable permissive CORS for dev and create a follow-up commit.
- Patch the TV `index.html` dev tester to try multiple fallback IPs automatically.

Tell me which one you want next or run the commands above and paste any errors you see.