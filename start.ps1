# =======================================================
#    AWS CostLens - Read-Only AWS FinOps Dashboard
#    PowerShell One-Touch Host & Launch Script
# =======================================================

$ErrorActionPreference = "Stop"

# Ensure script executes in its own directory
if ($PSScriptRoot) {
    Set-Location -LiteralPath $PSScriptRoot
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   AWS CostLens - Read-Only AWS FinOps Dashboard" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not available in PATH!" -ForegroundColor Red
    Write-Host "Please download and install Node.js 18+ or 20+ from: https://nodejs.org" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$nodeVersion = node -v
Write-Host "[OK] Node.js detected: $nodeVersion" -ForegroundColor Green

# 2. Check for npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm is not available in PATH!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 3. Check for .env file
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "[INFO] Creating .env from .env.example..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"
        Write-Host "[NOTICE] Created .env file. Review credentials if needed." -ForegroundColor Yellow
    }
}

# 4. Check for dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing npm dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install encountered an error." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# 5. Check for production build
$hasFrontend = Test-Path "dist/index.html"
$hasServer = Test-Path "dist/server/server/index.js"

if (-not $hasFrontend -or -not $hasServer) {
    Write-Host "[INFO] Building production bundle..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Application build failed." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "[SUCCESS] Starting AWS CostLens Server..." -ForegroundColor Green
Write-Host "  * Local Access:   http://localhost:4000" -ForegroundColor Cyan

# Detect active LAN IPs safely
try {
    $lanIps = Get-CimInstance Win32_NetworkAdapterConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -and $_.DefaultIPGateway } |
        ForEach-Object { $_.IPAddress[0] }

    if ($lanIps) {
        foreach ($ip in $lanIps) {
            $url = "http://" + $ip + ":4000"
            Write-Host "  * LAN Network:    $url (Open from phones/tablets on Wi-Fi)" -ForegroundColor Yellow
        }
    }
} catch {
    # Ignore network query failures on restricted systems
}

Write-Host ""
Write-Host "[INFO] Default Dashboard Login:" -ForegroundColor White
Write-Host "       Username: admin" -ForegroundColor Yellow
Write-Host "       Password: admin123" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C in this terminal window to stop the server anytime." -ForegroundColor Gray
Write-Host ""

# Safely launch browser in background without Start-Job dependency
try {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c ping -n 3 127.0.0.1 >nul && start http://localhost:4000" -WindowStyle Hidden
} catch {
    # Fallback to direct process launch
    Start-Process "http://localhost:4000"
}

# Run server
npm start
