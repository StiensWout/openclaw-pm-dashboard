#!/bin/bash

# OpenClaw PM Dashboard - Development Deployment Script
# Ports: Frontend 3000, Backend 3001

set -e

echo "🚀 Starting OpenClaw PM Dashboard DEVELOPMENT deployment..."
echo "📊 Development ports: Frontend 3000, Backend 3001"
echo "🌐 Access via: https://hostingervps.barracuda-banfish.ts.net:3000"

# Change to project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Verify Tailscale is running
if command -v tailscale &> /dev/null && tailscale status &> /dev/null; then
    TAILSCALE_IP=$(tailscale ip -4)
    echo "✅ Tailscale running - IP: $TAILSCALE_IP"
else
    echo "⚠️  Tailscale not detected - using localhost"
    TAILSCALE_IP="localhost"
fi

# Stop any existing development processes
echo "🛑 Stopping existing development processes..."
pkill -f 'vite.*3000' || true
pkill -f 'nodemon.*3001' || true
pkill -f 'node.*server.js.*3001' || true

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Set up development environment
echo "⚙️  Configuring development environment..."
cd backend
cp .env.development .env
echo "BIND_HOST=$TAILSCALE_IP" >> .env
cd ..

# Update frontend configuration for development
cd frontend
if [ ! -f "vite.config.ts.backup" ]; then
    cp vite.config.ts vite.config.ts.backup
fi

cat > vite.config.ts << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://$TAILSCALE_IP:3001',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://$TAILSCALE_IP:3001',
        changeOrigin: true,
        ws: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'build'
  }
})
EOF
cd ..

echo "🎯 Starting development servers..."

# Start backend in background
echo "🔧 Starting backend server on port 3001..."
cd backend
nohup npm run dev > ../logs/backend-dev.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend-dev.pid
cd ..

# Wait for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting frontend server on port 3000..."
cd frontend
nohup npm run dev > ../logs/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend-dev.pid
cd ..

# Create logs directory if it doesn't exist
mkdir -p logs

echo ""
echo "🎉 Development deployment complete!"
echo ""
echo "📊 Development servers running:"
echo "   Backend:  http://$TAILSCALE_IP:3001 (PID: $BACKEND_PID)"
echo "   Frontend: http://$TAILSCALE_IP:3000 (PID: $FRONTEND_PID)"
echo ""
echo "🌐 Access URLs (via Tailscale):"
echo "   Dashboard: https://hostingervps.barracuda-banfish.ts.net:3000"
echo "   API:       https://hostingervps.barracuda-banfish.ts.net:3001"
echo ""
echo "📋 Management commands:"
echo "   Stop dev:  npm run dev:stop"
echo "   Logs:      tail -f logs/backend-dev.log logs/frontend-dev.log"
echo "   Status:    ps aux | grep -E '(vite|nodemon)'"
echo ""
echo "⚡ Development mode features:"
echo "   • Hot reload enabled"
echo "   • Debug logging active"
echo "   • CORS allows localhost + Tailscale"
echo "   • No authentication required"
echo ""