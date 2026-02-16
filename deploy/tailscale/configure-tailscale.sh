#!/bin/bash

# OpenClaw PM Dashboard - Tailscale Configuration Script
# Configure Tailscale for external access to dashboard

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAILSCALE_DIR="$PROJECT_DIR/deploy/tailscale"

echo "🌐 Configuring Tailscale for OpenClaw PM Dashboard"

# Check if Tailscale is installed
if ! command -v tailscale >/dev/null 2>&1; then
    echo "❌ Tailscale is not installed. Please install Tailscale first:"
    echo "   curl -fsSL https://tailscale.com/install.sh | sh"
    exit 1
fi

# Check if Tailscale is running
if ! tailscale status >/dev/null 2>&1; then
    echo "❌ Tailscale is not running. Please start Tailscale first:"
    echo "   sudo tailscale up"
    exit 1
fi

# Get Tailscale status
echo "📡 Current Tailscale status:"
tailscale status | head -10

# Get Tailscale IP
TAILSCALE_IP=$(tailscale ip -4)
echo "🔗 Tailscale IPv4: $TAILSCALE_IP"

# Check if our hostname is configured
HOSTNAME="hostingervps.barracuda-banfish.ts.net"
if tailscale status | grep -q "$HOSTNAME"; then
    echo "✅ Hostname $HOSTNAME is configured"
else
    echo "⚠️  Hostname $HOSTNAME not found in Tailscale status"
    echo "   Current hostname may be different"
fi

# Create Tailscale backend configuration
echo "⚙️  Creating Tailscale configuration..."

# Backend environment configuration for Tailscale
cat > "$TAILSCALE_DIR/backend-tailscale.env" << EOF
# Tailscale Configuration for Backend
# This file should be sourced in the backend environment

# Bind to all interfaces (including Tailscale)
HOST=0.0.0.0

# Tailscale-specific settings
TAILSCALE_IP=$TAILSCALE_IP
TAILSCALE_HOSTNAME=$HOSTNAME

# Enable CORS for Tailscale domain
CORS_ORIGINS="https://$HOSTNAME,https://$HOSTNAME:3000,https://$HOSTNAME:4000,http://localhost:3000,http://localhost:4000"

# Trust Tailscale proxy headers
TRUST_PROXY=true
EOF

# Create nginx configuration for HTTPS (if nginx is available)
if command -v nginx >/dev/null 2>&1; then
    echo "🔧 Creating nginx configuration..."
    
    cat > "$TAILSCALE_DIR/nginx-dashboard.conf" << EOF
# OpenClaw PM Dashboard - Nginx Configuration for Tailscale HTTPS
# Place this in /etc/nginx/sites-available/ and enable with symlink

server {
    listen 443 ssl;
    server_name $HOSTNAME;
    
    # SSL configuration (using Tailscale certificates)
    ssl_certificate /var/lib/tailscale/certs/$HOSTNAME.crt;
    ssl_certificate_key /var/lib/tailscale/certs/$HOSTNAME.key;
    
    # Development Frontend (port 3000)
    location /dev/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Development API
    location /dev/api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Production Frontend (port 4000) - default
    location / {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Production API
    location /api/ {
        proxy_pass http://localhost:4001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $HOSTNAME;
    return 301 https://\$server_name\$request_uri;
}
EOF
    
    echo "⚠️  To enable HTTPS with nginx:"
    echo "   1. Copy $TAILSCALE_DIR/nginx-dashboard.conf to /etc/nginx/sites-available/"
    echo "   2. Enable with: sudo ln -s /etc/nginx/sites-available/nginx-dashboard.conf /etc/nginx/sites-enabled/"
    echo "   3. Generate Tailscale certificates: sudo tailscale cert $HOSTNAME"
    echo "   4. Reload nginx: sudo nginx -s reload"
else
    echo "⚠️  Nginx not found. HTTPS routing will use direct port access."
fi

# Create port forwarding script for simpler setup
cat > "$TAILSCALE_DIR/setup-port-forwarding.sh" << 'EOF'
#!/bin/bash

# Simple port forwarding setup without nginx
# This makes the dashboard accessible via Tailscale on standard ports

echo "🔧 Setting up port forwarding for Tailscale access..."

# Check if iptables is available
if command -v iptables >/dev/null 2>&1; then
    # Forward port 80 to development frontend (3000)
    sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
    
    # Forward port 443 to production frontend (4000)  
    sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 4000
    
    echo "✅ Port forwarding configured:"
    echo "   HTTP (80) -> Development Frontend (3000)"
    echo "   HTTPS (443) -> Production Frontend (4000)"
    echo ""
    echo "⚠️  This configuration is not persistent across reboots."
    echo "   For permanent setup, add rules to /etc/iptables/rules.v4"
else
    echo "❌ iptables not available. Manual port access required."
fi
EOF

chmod +x "$TAILSCALE_DIR/setup-port-forwarding.sh"

# Test Tailscale connectivity
echo ""
echo "🧪 Testing Tailscale connectivity..."

# Test if we can reach ourselves via Tailscale
if curl -s --connect-timeout 5 "http://$TAILSCALE_IP:18789/health" >/dev/null 2>&1; then
    echo "✅ Tailscale connectivity test passed"
else
    echo "⚠️  Could not reach OpenClaw Gateway via Tailscale IP"
    echo "   This may be normal if the Gateway health endpoint is not available"
fi

# Create startup script that includes Tailscale configuration
cat > "$TAILSCALE_DIR/start-with-tailscale.sh" << 'EOF'
#!/bin/bash

# Start OpenClaw PM Dashboard with Tailscale configuration

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAILSCALE_DIR="$PROJECT_DIR/deploy/tailscale"

# Source Tailscale environment
if [ -f "$TAILSCALE_DIR/backend-tailscale.env" ]; then
    echo "🌐 Loading Tailscale configuration..."
    export $(cat "$TAILSCALE_DIR/backend-tailscale.env" | grep -v '^#' | xargs)
fi

# Start the requested environment
case "$1" in
    "dev")
        echo "🔧 Starting development environment with Tailscale support..."
        "$PROJECT_DIR/deploy/scripts/dev-start.sh" "${@:2}"
        ;;
    "prod")
        echo "🚀 Starting production environment with Tailscale support..."
        "$PROJECT_DIR/deploy/scripts/prod-deploy.sh" "${@:2}"
        ;;
    *)
        echo "Usage: $0 {dev|prod} [additional arguments]"
        echo "  dev  - Start development environment"
        echo "  prod - Start production environment"
        exit 1
        ;;
esac
EOF

chmod +x "$TAILSCALE_DIR/start-with-tailscale.sh"

echo ""
echo "✅ Tailscale configuration complete!"
echo ""
echo "🌐 Access URLs:"
echo "   Development:"
echo "     Frontend: https://$HOSTNAME:3000"
echo "     Backend:  https://$HOSTNAME:3001"
echo "   Production:"
echo "     Frontend: https://$HOSTNAME:4000" 
echo "     Backend:  https://$HOSTNAME:4001"
echo ""
echo "🔧 Configuration files:"
echo "   Backend env: $TAILSCALE_DIR/backend-tailscale.env"
echo "   Nginx conf:  $TAILSCALE_DIR/nginx-dashboard.conf"
echo ""
echo "🚀 Start with Tailscale:"
echo "   Development: $TAILSCALE_DIR/start-with-tailscale.sh dev"
echo "   Production:  $TAILSCALE_DIR/start-with-tailscale.sh prod"
echo ""
echo "⚠️  For HTTPS access, consider setting up nginx or use direct port access"