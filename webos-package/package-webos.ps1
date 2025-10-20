param(
  [string]$DeviceName = '',
  [switch]$Install
)

# Paths
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$tvDist = Join-Path $root '..\apps\tv\dist'
$out = Join-Path $root 'out'

Write-Host "Preparing webOS package..."

if (-Not (Test-Path $tvDist)) {
  Write-Error "TV build not found at $tvDist. Run: pnpm --filter @app/tv build"
  exit 1
}

# Clean out
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Path $out | Out-Null

# Copy build output
Copy-Item -Recurse -Force (Join-Path $tvDist '*') $out

# Copy appinfo.json and config.json
Copy-Item -Force (Join-Path $root 'appinfo.json') $out
Copy-Item -Force (Join-Path $root 'config.json') $out

# Optionally copy icon if exists in apps/tv/public
$iconSrc = Join-Path $root '..\apps\tv\public\icon.png'
if (Test-Path $iconSrc) { Copy-Item -Force $iconSrc $out }

Push-Location $out
try {
  $ipkName = "PlayUtsavTV.ipk"
  Write-Host "Packaging folder to $ipkName..."
  ares-package . -o $ipkName

  if ($Install -and $DeviceName) {
    Write-Host "Installing $ipkName to device $DeviceName..."
    ares-install -d $DeviceName $ipkName
    Write-Host "Launching app on device $DeviceName..."
    # id from appinfo.json
    ares-launch -d $DeviceName com.playutsav.tv
  } else {
    Write-Host "Package created: $(Join-Path (Get-Location) $ipkName)"
  }
} finally {
  Pop-Location
}
