#!/usr/bin/env bash
# =======================================================
#    AWS CostLens - Read-Only AWS FinOps Dashboard
#    Linux / macOS One-Touch Host & Launch Script
# =======================================================

set -e

echo "======================================================="
echo "   AWS CostLens - Read-Only AWS FinOps Dashboard"
echo "======================================================="
echo ""

# 1. Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed or not in PATH!"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "[OK] Node.js detected: $(node -v)"

# 2. Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[INFO] Creating .env from .env.example..."
        cp .env.example .env
        echo "[NOTICE] Please edit .env if configuring static AWS credentials."
    fi
fi

# 3. Check for dependencies
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing npm dependencies..."
    npm install
fi

# 4. Check for production build
if [ ! -d "dist" ]; then
    echo "[INFO] Building production bundle..."
    npm run build
fi

echo ""
echo "[SUCCESS] Starting AWS CostLens Server..."
echo "   📡 Local Access:  http://localhost:4000"

# Detect LAN IP on Linux/macOS
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo "")
if [ -n "$LAN_IP" ]; then
    echo "   🌐 LAN Network:   http://${LAN_IP}:4000 (Open on phones, tablets, or other PCs)"
fi

echo ""
echo "[INFO] Default Dashboard Login:"
echo "       Username: admin"
echo "       Password: admin123"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

# Open browser if possible in background
if command -v xdg-open >/dev/null 2>&1; then
    (sleep 2 && xdg-open "http://localhost:4000") &
elif command -v open >/dev/null 2>&1; then
    (sleep 2 && open "http://localhost:4000") &
fi

exec npm start
