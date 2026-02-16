#!/bin/bash

# OpenClaw PM Dashboard - Stop Development Environment

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$PROJECT_DIR/deploy/logs"

echo "🛑 Stopping OpenClaw PM Dashboard - Development Environment"

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    echo "🔪 Killing processes on port $port..."
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
}

# Kill by PID if available
if [ -f "$LOG_DIR/backend-dev.pid" ]; then
    BACKEND_PID=$(cat "$LOG_DIR/backend-dev.pid")
    echo "🔪 Killing backend process (PID: $BACKEND_PID)..."
    kill -9 $BACKEND_PID 2>/dev/null || true
    rm "$LOG_DIR/backend-dev.pid"
fi

if [ -f "$LOG_DIR/frontend-dev.pid" ]; then
    FRONTEND_PID=$(cat "$LOG_DIR/frontend-dev.pid")
    echo "🔪 Killing frontend process (PID: $FRONTEND_PID)..."
    kill -9 $FRONTEND_PID 2>/dev/null || true
    rm "$LOG_DIR/frontend-dev.pid"
fi

# Kill by port as backup
kill_port 3000
kill_port 3001

# Kill any remaining development processes
echo "🧹 Cleaning up any remaining processes..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "ts-node-dev.*server.ts" 2>/dev/null || true
pkill -f "vite.*--port 3000" 2>/dev/null || true

sleep 2

# Verify ports are free
echo "🔍 Verifying ports are free..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 still in use:"
    lsof -i :3000
else
    echo "✅ Port 3000 is free"
fi

if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  Port 3001 still in use:"
    lsof -i :3001
else
    echo "✅ Port 3001 is free"
fi

echo "✅ Development environment stopped successfully!"