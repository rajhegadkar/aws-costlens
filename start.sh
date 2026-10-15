#!/usr/bin/env bash
# =======================================================
#    AWS CostLens - Read-Only AWS FinOps Dashboard
#    Linux / macOS One-Touch Host & Launch Script
# =======================================================

set -e

# Always ensure working directory is the script's root folder
cd "$(dirname "$0")"

echo "======================================================="
echo "   AWS CostLens - Read-Only AWS FinOps Dashboard"
echo "======================================================="
echo ""

# 1. Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed or not in PATH!"
    echo "Please install Node.js 18+ or 20+ from https://nodejs.org"
    exit 1
fi

echo "[OK] Node.js detected: $(node -v)"

# 2. Check for npm
if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm is not installed or not in PATH!"
    exit 1
fi

# 3. Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[INFO] Creating .env from .env.example..."
        cp .env.example .env
        echo "[NOTICE] Default .env created. You can customize AWS settings in .env anytime."
    fi
fi

# 4. Check for dependencies
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing required dependencies. Please wait..."
    npm install
fi

# 5. Check for production build
if [ ! -f "dist/index.html" ] || [ ! -f "dist/server/server/index.js" ]; then
    echo "[INFO] Building production client and server bundles..."
    npm run build
fi

echo ""
echo "======================================================="
echo "[SUCCESS] Starting AWS CostLens Server..."
echo "  * Local Access:  http://localhost:4000"

# Detect LAN IP on Linux/macOS safely
LAN_IP=""
if command -v hostname >/dev/null 2>&1; then
    LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
fi
if [ -z "$LAN_IP" ] && command -v ipconfig >/dev/null 2>&1; then
    LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || true)
fi
if [ -n "$LAN_IP" ]; then
    echo "  * LAN Network:   http://${LAN_IP}:4000 (Open on phones, tablets, or other PCs)"
fi

echo ""
echo "[INFO] Default Dashboard Login:"
echo "       Username: admin"
echo "       Password: admin123"
echo "======================================================="
echo ""
echo "Press Ctrl+C to stop the server anytime."
echo ""

# Open browser if possible in background
if command -v xdg-open >/dev/null 2>&1; then
    (sleep 2 && xdg-open "http://localhost:4000" >/dev/null 2>&1) &
elif command -v open >/dev/null 2>&1; then
    (sleep 2 && open "http://localhost:4000" >/dev/null 2>&1) &
fi

exec npm start
