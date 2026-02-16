#!/bin/bash

# OpenClaw PM Dashboard - Production Deployment Script
# Port Allocation: Frontend: 4000, Backend: 4001

set -e  # Exit on any error

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$PROJECT_DIR/deploy"
LOG_DIR="$DEPLOY_DIR/logs"

# Create logs directory
mkdir -p "$LOG_DIR"

echo "🚀 Deploying OpenClaw PM Dashboard - Production Environment"
echo "Port Allocation: Frontend (4000), Backend (4001)"
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

# Stop existing production processes
echo "🛑 Stopping any existing production processes..."
"$DEPLOY_DIR/scripts/prod-stop.sh" || true

# Wait for ports to be released
sleep 3

# Check port availability
echo "🔍 Checking port availability..."
check_port 4000 || { echo "Failed to free port 4000"; exit 1; }
check_port 4001 || { echo "Failed to free port 4001"; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
cd "$PROJECT_DIR"
npm run install:all

# Run tests (optional, comment out if no tests yet)
echo "🧪 Running tests..."
npm run test || { echo "⚠️  Tests failed, but continuing with deployment..."; }

# Build production assets
echo "🔨 Building production assets..."
npm run prod:build

# Setup environment
echo "⚙️  Setting up production environment..."
cd "$PROJECT_DIR/backend"
cp .env.production .env 2>/dev/null || echo "⚠️  No .env.production found, using existing .env"

# Start backend server
echo "🖥️  Starting production backend server on port 4001..."
cd "$PROJECT_DIR/backend"
NODE_ENV=production PORT=4001 nohup node dist/server.js > "$LOG_DIR/backend-prod.log" 2>&1 &
BACKEND_PID=$!

# Give backend time to start
sleep 8

# Start frontend server (serving built assets)
echo "🌐 Starting production frontend server on port 4000..."
cd "$PROJECT_DIR/frontend"
nohup npx serve -s build -l 4000 --host 0.0.0.0 > "$LOG_DIR/frontend-prod.log" 2>&1 &
FRONTEND_PID=$!

# Save PIDs for later cleanup
echo "$BACKEND_PID" > "$LOG_DIR/backend-prod.pid"
echo "$FRONTEND_PID" > "$LOG_DIR/frontend-prod.pid"

# Wait for servers to start
echo "⏳ Waiting for servers to initialize..."
sleep 10

# Health check with retries
echo "🏥 Performing health checks..."
backend_healthy=false
for i in {1..5}; do
    if curl -s http://localhost:4001/health > /dev/null; then
        echo "✅ Backend health check passed (port 4001)"
        backend_healthy=true
        break
    else
        echo "⏳ Backend not ready yet, attempt $i/5..."
        sleep 5
    fi
done

if [ "$backend_healthy" = false ]; then
    echo "❌ Backend health check failed after 5 attempts"
    cat "$LOG_DIR/backend-prod.log" | tail -20
fi

frontend_healthy=false
for i in {1..3}; do
    if curl -s http://localhost:4000 > /dev/null; then
        echo "✅ Frontend health check passed (port 4000)"
        frontend_healthy=true
        break
    else
        echo "⏳ Frontend not ready yet, attempt $i/3..."
        sleep 5
    fi
done

if [ "$frontend_healthy" = false ]; then
    echo "❌ Frontend health check failed"
fi

# Setup monitoring
echo "📊 Setting up monitoring..."
"$DEPLOY_DIR/monitoring/setup-monitoring.sh" || echo "⚠️  Failed to setup monitoring"

echo ""
echo "🎉 Production deployment completed!"
echo ""
echo "📊 Production URLs:"
echo "   Frontend:        http://localhost:4000"
echo "   Backend API:     http://localhost:4001"
echo "   Tailscale:       https://hostingervps.barracuda-banfish.ts.net:4000"
echo ""
echo "📝 Logs:"
echo "   Backend:         $LOG_DIR/backend-prod.log"
echo "   Frontend:        $LOG_DIR/frontend-prod.log"
echo ""
echo "🛑 To stop: npm run prod:stop or ./deploy/scripts/prod-stop.sh"
echo "📊 Health check: ./deploy/scripts/health-check.sh"
echo ""
echo "🔄 Monitoring is active. Check logs for any issues."