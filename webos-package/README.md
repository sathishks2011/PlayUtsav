Packaging instructions for PlayUtsav TV webOS app

1. Build the TV app:
   pnpm --filter @app/tv build

2. Copy build output (already automated by the included script):
   .\package-webos.ps1 will copy the build into webos-package/out

3. Create an .ipk and (optionally) install to a registered device:
   .\package-webos.ps1 -DeviceName myLGtv -Install

Requirements: webOS SDK (ares tools) installed and in PATH.
