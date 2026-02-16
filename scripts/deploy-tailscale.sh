#!/bin/bash

# OpenClaw PM Dashboard - Tailscale Deployment Script
# Ensures secure Tailscale-only deployment

set -e

echo "🚀 Starting OpenClaw PM Dashboard deployment..."
echo "🔒 Configuring for Tailscale-only access"

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

echo "✅ Tailscale is running"

# Get Tailscale IP
TAILSCALE_IP=$(tailscale ip -4)
if [ -z "$TAILSCALE_IP" ]; then
    echo "❌ Could not determine Tailscale IP address"
    exit 1
fi

echo "🔍 Detected Tailscale IP: $TAILSCALE_IP"

# Copy Tailscale environment configuration
echo "📝 Setting up environment configuration..."
cp backend/.env.tailscale backend/.env

# Update BIND_HOST with actual Tailscale IP
sed -i "s/BIND_HOST=100.64.0.1/BIND_HOST=$TAILSCALE_IP/" backend/.env

# Install dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Build frontend
echo "🔨 Building frontend..."
cd frontend && npm run build && cd ..

# Create systemd service file (optional)
cat > /tmp/openclaw-pm-dashboard.service << EOF
[Unit]
Description=OpenClaw PM Dashboard
After=network.target tailscaled.service
Wants=tailscaled.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "📄 Systemd service file created at /tmp/openclaw-pm-dashboard.service"
echo "   To install: sudo cp /tmp/openclaw-pm-dashboard.service /etc/systemd/system/"
echo "   To enable: sudo systemctl enable openclaw-pm-dashboard"
echo "   To start: sudo systemctl start openclaw-pm-dashboard"

# Security check
echo "🔒 Performing security checks..."

# Check if ports are bound only to Tailscale interface
echo "   Verifying network binding configuration..."
if grep -q "BIND_HOST=$TAILSCALE_IP" backend/.env; then
    echo "   ✅ Server configured to bind to Tailscale IP only"
else
    echo "   ⚠️  Warning: Server binding configuration may not be secure"
fi

# Check CORS configuration
if grep -q "hostingervps.barracuda-banfish.ts.net" backend/.env; then
    echo "   ✅ CORS configured for Tailscale hostname"
else
    echo "   ⚠️  Warning: CORS configuration may allow broader access"
fi

echo ""
echo "🎉 Deployment configuration complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the configuration in backend/.env"
echo "   2. Start the backend: cd backend && npm start"
echo "   3. Serve the frontend build directory"
echo "   4. Access via: http://hostingervps.barracuda-banfish.ts.net:3001"
echo ""
echo "🔐 Security Notes:"
echo "   - Server binds only to Tailscale interface ($TAILSCALE_IP)"
echo "   - CORS restricted to Tailscale hostname"
echo "   - No public internet access configured"
echo ""