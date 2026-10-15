@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo =======================================================
echo    AWS CostLens - Read-Only AWS FinOps Dashboard
echo =======================================================
echo.

:: 1. Check for Node.js runtime
where node >nul 2>nul
if %ERRORLEVEL% neq 0 goto :err_node

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
echo [OK] Node.js runtime detected: !NODE_VER!

:: 2. Check for npm package manager
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 goto :err_npm

:: 3. Prepare .env configuration file if missing
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example template...
        copy /y ".env.example" ".env" >nul
        echo [NOTICE] Default .env created. You can customize AWS settings in .env anytime.
    ) else (
        echo [WARNING] No .env found. Continuing with default port and credentials.
    )
)

:: 4. Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies. Please wait a moment...
    call npm install
    if %ERRORLEVEL% neq 0 goto :err_install
    echo [OK] Dependencies installed successfully.
)

:: 5. Build production bundle if dist is missing
if not exist "dist\index.html" goto :do_build
if not exist "dist\server\server\index.js" goto :do_build
goto :ready_to_start

:do_build
echo [INFO] Building production client and server bundles...
call npm run build
if %ERRORLEVEL% neq 0 goto :err_build
echo [OK] Production build completed.

:ready_to_start
echo.
echo =======================================================
echo [SUCCESS] Starting AWS CostLens Server...
echo   Local Access:   http://localhost:4000
echo   LAN Access:     Available across your local Wi-Fi / LAN
echo   Default Login:  admin / admin123
echo =======================================================
echo.
echo Press Ctrl+C in this terminal window to stop the server anytime.
echo.

:: Safely open browser in background after 2 second delay (using ping for universal compatibility)
start "" cmd /c "ping -n 3 127.0.0.1 >nul && start http://localhost:4000"

:: Start the server process
call npm start

if %ERRORLEVEL% neq 0 (
    echo.
    echo [NOTICE] Server process exited with code %ERRORLEVEL%.
)
pause
exit /b %ERRORLEVEL%

:err_node
echo.
echo [ERROR] Node.js is not installed or not in your system PATH!
echo Please download and install Node.js 18+ or 20+ from:
echo   https://nodejs.org/
echo After installing, restart this script or your terminal.
echo.
pause
exit /b 1

:err_npm
echo.
echo [ERROR] npm was not found in your system PATH!
echo Please ensure Node.js and npm are properly installed.
echo.
pause
exit /b 1

:err_install
echo.
echo [ERROR] Dependency installation (npm install) failed!
echo Please check your internet connection or run: npm install
echo.
pause
exit /b 1

:err_build
echo.
echo [ERROR] Application production build (npm run build) failed!
echo Please verify dependencies and run: npm run build
echo.
pause
exit /b 1
