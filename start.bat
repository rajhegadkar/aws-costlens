@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo    AWS CostLens - Read-Only AWS FinOps Dashboard
echo =======================================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

:: 2. Check for .env file
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example...
        copy .env.example .env >nul
        echo [NOTICE] Please review and edit your .env file with your AWS credentials if not using AWS CLI default profile.
    ) else (
        echo [WARNING] No .env file found. Running with default environment variables.
    )
)

:: 3. Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies (first-time setup)...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed. Please check your network connection and npm configuration.
        pause
        exit /b 1
    )
)

:: 4. Build application if dist is missing
if not exist "dist\server\server\index.js" (
    echo [INFO] Building production client and server bundles...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Application build failed.
        pause
        exit /b 1
    )
)

:: 5. Launch application server and open browser
echo.
echo [SUCCESS] Starting AWS CostLens Server...
echo [INFO] Local Access:    http://localhost:4000
echo [INFO] LAN Access:      Available across your local Wi-Fi / LAN network
echo [INFO] Default Login:   admin / admin123
echo.
echo [NOTE] If connecting from another PC or phone on your Wi-Fi, ensure Windows Firewall allows Node.js on Private Networks.
echo.
echo Press Ctrl+C in this terminal window to stop the server.
echo.

:: Launch browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:4000"

:: Start the production server
call npm start

pause
