# =======================================================
#    AWS CostLens - Read-Only AWS FinOps Dashboard
#    PowerShell One-Touch Host & Launch Script
# =======================================================

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   AWS CostLens - Read-Only AWS FinOps Dashboard" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not available in PATH!" -ForegroundColor Red
    Write-Host "Please download and install Node.js 18+ from https://nodejs.org" -ForegroundColor White
    Read-Host "Press Enter to exit..."
    exit 1
}

$nodeVersion = node -v
Write-Host "[OK] Node.js runtime detected: $nodeVersion" -ForegroundColor Green

# 2. Check for .env file
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "[INFO] Creating .env from .env.example..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"
        Write-Host "[NOTICE] Created .env file. Review credentials if needed." -ForegroundColor Yellow
    }
}

# 3. Check for dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing npm dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install encountered an error." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
}

# 4. Check for production build
if (-not (Test-Path "dist")) {
    Write-Host "[INFO] Building production bundle..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Build failed." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
}

Write-Host ""
Write-Host "[SUCCESS] Starting AWS CostLens Server..." -ForegroundColor Green
Write-Host "   📡 Local Access:   http://localhost:4000" -ForegroundColor Cyan

# Try detecting active LAN IP
try {
    $lanIps = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPAddress -and $_.DefaultIPGateway } | ForEach-Object { $_.IPAddress[0] }
    if ($lanIps) {
        foreach ($ip in $lanIps) {
            Write-Host "   🌐 LAN Network:    http://${ip}:4000 (Open on phones, tablets, or other PCs)" -ForegroundColor Yellow
        }
    }
} catch {}

Write-Host ""
Write-Host "[INFO] Default Dashboard Login:" -ForegroundColor White
Write-Host "       Username: admin" -ForegroundColor Yellow
Write-Host "       Password: admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the local server anytime." -ForegroundColor Gray
Write-Host ""

# Launch default browser in background
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:4000"
} | Out-Null

# Run server
npm start
