#!/bin/bash

# OpenClaw PM Dashboard - Development Deployment Script
# Port Allocation: Frontend: 3000, Backend: 3001

set -e  # Exit on any error

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$PROJECT_DIR/deploy"
LOG_DIR="$DEPLOY_DIR/logs"

# Create logs directory
mkdir -p "$LOG_DIR"

echo "🚀 Starting OpenClaw PM Dashboard - Development Environment"
echo "Port Allocation: Frontend (3000), Backend (3001)"
echo "Project Directory: $PROJECT_DIR"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo "❌ Port $port is already in use"
        lsof -i :$port
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    echo "🔪 Killing processes on port $port..."
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check OpenClaw Gateway port (should NOT be touched)
if lsof -i :18789 > /dev/null 2>&1; then
    echo "✅ OpenClaw Gateway detected on port 18789 - will not interfere"
else
    echo "⚠️  OpenClaw Gateway not detected on port 18789"
fi

# Stop existing development processes
echo "🛑 Stopping any existing development processes..."
kill_port 3000
kill_port 3001

# Wait a moment for ports to be released
sleep 3

# Check port availability
echo "🔍 Checking port availability..."
check_port 3000 || { echo "Failed to free port 3000"; exit 1; }
check_port 3001 || { echo "Failed to free port 3001"; exit 1; }

# Install dependencies if node_modules don't exist
if [ ! -d "$PROJECT_DIR/node_modules" ] || [ ! -d "$PROJECT_DIR/backend/node_modules" ] || [ ! -d "$PROJECT_DIR/frontend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd "$PROJECT_DIR"
    npm run install:all
fi

# Start development servers
echo "🌟 Starting development servers..."

cd "$PROJECT_DIR"

# Start backend in background
echo "🖥️  Starting backend server on port 3001..."
cd "$PROJECT_DIR/backend"
cp .env.development .env 2>/dev/null || echo "⚠️  No .env.development found, using existing .env"
npm run dev > "$LOG_DIR/backend-dev.log" 2>&1 &
BACKEND_PID=$!

# Give backend time to start
sleep 5

# Start frontend
echo "🌐 Starting frontend server on port 3000..."
cd "$PROJECT_DIR/frontend"
npm run dev -- --port 3000 --host 0.0.0.0 > "$LOG_DIR/frontend-dev.log" 2>&1 &
FRONTEND_PID=$!

# Save PIDs for later cleanup
echo "$BACKEND_PID" > "$LOG_DIR/backend-dev.pid"
echo "$FRONTEND_PID" > "$LOG_DIR/frontend-dev.pid"

# Wait for servers to start
echo "⏳ Waiting for servers to initialize..."
sleep 10

# Health check
echo "🏥 Performing health checks..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend health check passed (port 3001)"
else
    echo "❌ Backend health check failed"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend health check passed (port 3000)"
else
    echo "❌ Frontend health check failed (still starting up?)"
fi

echo ""
echo "🎉 Development environment started successfully!"
echo ""
echo "📊 Dashboard URLs:"
echo "   Frontend (Dev):  http://localhost:3000"
echo "   Backend API:     http://localhost:3001"
echo "   Tailscale:       https://hostingervps.barracuda-banfish.ts.net:3000"
echo ""
echo "📝 Logs:"
echo "   Backend:         $LOG_DIR/backend-dev.log"
echo "   Frontend:        $LOG_DIR/frontend-dev.log"
echo ""
echo "🛑 To stop: npm run dev:stop or ./deploy/scripts/dev-stop.sh"
echo ""
echo "Press Ctrl+C to stop all services or run in background..."

# Keep script running to show logs
if [ "${1:-}" = "--background" ]; then
    echo "🔄 Running in background mode"
    exit 0
else
    # Show combined logs
    tail -f "$LOG_DIR/backend-dev.log" "$LOG_DIR/frontend-dev.log" 2>/dev/null || sleep infinity
fi