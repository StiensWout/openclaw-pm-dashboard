#!/bin/bash

# OpenClaw PM Dashboard - Stop Production Environment

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$PROJECT_DIR/deploy/logs"

echo "🛑 Stopping OpenClaw PM Dashboard - Production Environment"

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    echo "🔪 Killing processes on port $port..."
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
}

# Kill by PID if available
if [ -f "$LOG_DIR/backend-prod.pid" ]; then
    BACKEND_PID=$(cat "$LOG_DIR/backend-prod.pid")
    echo "🔪 Killing backend process (PID: $BACKEND_PID)..."
    kill -9 $BACKEND_PID 2>/dev/null || true
    rm "$LOG_DIR/backend-prod.pid"
fi

if [ -f "$LOG_DIR/frontend-prod.pid" ]; then
    FRONTEND_PID=$(cat "$LOG_DIR/frontend-prod.pid")
    echo "🔪 Killing frontend process (PID: $FRONTEND_PID)..."
    kill -9 $FRONTEND_PID 2>/dev/null || true
    rm "$LOG_DIR/frontend-prod.pid"
fi

# Kill by port as backup
kill_port 4000
kill_port 4001

# Kill any remaining production processes
echo "🧹 Cleaning up any remaining processes..."
pkill -f "serve.*4000" 2>/dev/null || true
pkill -f "node.*server.js.*4001" 2>/dev/null || true
pkill -f "openclaw-pm-dashboard" 2>/dev/null || true

sleep 3

# Stop monitoring
echo "📊 Stopping monitoring..."
pkill -f "health-monitor" 2>/dev/null || true

# Verify ports are free
echo "🔍 Verifying ports are free..."
if lsof -i :4000 > /dev/null 2>&1; then
    echo "⚠️  Port 4000 still in use:"
    lsof -i :4000
else
    echo "✅ Port 4000 is free"
fi

if lsof -i :4001 > /dev/null 2>&1; then
    echo "⚠️  Port 4001 still in use:"
    lsof -i :4001
else
    echo "✅ Port 4001 is free"
fi

echo "✅ Production environment stopped successfully!"