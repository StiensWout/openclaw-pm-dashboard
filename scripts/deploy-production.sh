#!/bin/bash

# OpenClaw PM Dashboard - Production Deployment Script
# Ports: Frontend 4000, Backend 4001

set -e

echo "🚀 Starting OpenClaw PM Dashboard PRODUCTION deployment..."
echo "🏭 Production ports: Frontend 4000, Backend 4001"
echo "🌐 Access via: https://hostingervps.barracuda-banfish.ts.net:4000"

# Change to project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Verify Tailscale is running
if ! command -v tailscale &> /dev/null; then
    echo "❌ Tailscale is not installed or not in PATH"
    exit 1
fi

if ! tailscale status &> /dev/null; then
    echo "❌ Tailscale is not running or not authenticated"
    echo "Please run: sudo tailscale up"
    exit 1
fi

TAILSCALE_IP=$(tailscale ip -4)
if [ -z "$TAILSCALE_IP" ]; then
    echo "❌ Could not determine Tailscale IP address"
    exit 1
fi

echo "✅ Tailscale running - IP: $TAILSCALE_IP"

# Stop any existing production processes
echo "🛑 Stopping existing production processes..."
pkill -f 'serve.*4000' || true
pkill -f 'node.*server.js.*4001' || true
pm2 stop openclaw-pm-frontend || true
pm2 stop openclaw-pm-backend || true

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Set up production environment
echo "⚙️  Configuring production environment..."
cd backend
cp .env.production .env
echo "BIND_HOST=$TAILSCALE_IP" >> .env
cd ..

# Build frontend for production
echo "🔨 Building frontend for production..."
cd frontend

# Update build configuration
if [ ! -f "vite.config.ts.backup" ]; then
    cp vite.config.ts vite.config.ts.backup
fi

cat > vite.config.ts << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 4000
  },
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
          utils: ['axios', 'socket.io-client']
        }
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4000,
    proxy: {
      '/api': {
        target: 'http://$TAILSCALE_IP:4001',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://$TAILSCALE_IP:4001',
        changeOrigin: true,
        ws: true,
        secure: false
      }
    }
  }
})
EOF

npm run build
cd ..

# Create logs directory
mkdir -p logs

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    echo "🔧 Using PM2 for process management..."
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'openclaw-pm-backend',
      script: 'server.js',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 5000,
      max_restarts: 10,
      error_file: '../logs/backend-prod-error.log',
      out_file: '../logs/backend-prod.log',
      log_file: '../logs/backend-prod-combined.log',
      time: true
    },
    {
      name: 'openclaw-pm-frontend',
      script: 'npx',
      args: 'serve -s build -l 4000 --host 0.0.0.0',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 5000,
      max_restarts: 10,
      error_file: '../logs/frontend-prod-error.log',
      out_file: '../logs/frontend-prod.log',
      log_file: '../logs/frontend-prod-combined.log',
      time: true
    }
  ]
};
EOF

    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save
    
    echo "✅ Production servers started with PM2"
    echo "   Manage with: pm2 status, pm2 logs, pm2 restart all"
    
else
    echo "🔧 Using background processes (PM2 not available)..."
    
    # Start backend
    cd backend
    nohup npm run prod:start > ../logs/backend-prod.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend-prod.pid
    cd ..
    
    # Start frontend static server
    cd frontend
    nohup npx serve -s build -l 4000 --host 0.0.0.0 > ../logs/frontend-prod.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend-prod.pid
    cd ..
    
    echo "✅ Production servers started as background processes"
    echo "   Backend PID: $BACKEND_PID"
    echo "   Frontend PID: $FRONTEND_PID"
fi

# Wait for servers to start
echo "⏳ Waiting for servers to start..."
sleep 5

# Test backend health
echo "🔍 Testing backend health..."
if curl -f http://$TAILSCALE_IP:4001/api/health &>/dev/null; then
    echo "✅ Backend health check passed"
else
    echo "⚠️  Backend health check failed - check logs"
fi

# Test frontend
echo "🔍 Testing frontend..."
if curl -f http://$TAILSCALE_IP:4000 &>/dev/null; then
    echo "✅ Frontend serving correctly"
else
    echo "⚠️  Frontend test failed - check logs"
fi

echo ""
echo "🎉 Production deployment complete!"
echo ""
echo "🏭 Production servers running:"
echo "   Backend:  https://hostingervps.barracuda-banfish.ts.net:4001"
echo "   Frontend: https://hostingervps.barracuda-banfish.ts.net:4000"
echo ""
echo "🔐 Security Configuration:"
echo "   • Server bound to Tailscale IP only"
echo "   • CORS restricted to production frontend"
echo "   • Production optimizations enabled"
echo "   • Error logging enabled"
echo ""
echo "📊 Management:"
if command -v pm2 &> /dev/null; then
    echo "   Status:   pm2 status"
    echo "   Logs:     pm2 logs"
    echo "   Restart:  pm2 restart all"
    echo "   Stop:     pm2 stop all"
else
    echo "   Stop:     npm run prod:stop"
    echo "   Logs:     tail -f logs/backend-prod.log logs/frontend-prod.log"
    echo "   Status:   ps aux | grep -E '(serve|node.*server)'"
fi
echo ""