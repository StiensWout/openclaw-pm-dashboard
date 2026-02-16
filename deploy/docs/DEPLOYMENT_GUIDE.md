# OpenClaw PM Dashboard - Deployment Guide

## Overview

This deployment system provides automated development and production environments for the OpenClaw PM Dashboard with comprehensive monitoring, health checks, and Tailscale integration.

## Port Allocation Strategy

### Development Environment
- **Frontend**: Port 3000 (React development server)
- **Backend**: Port 3001 (Express API with ts-node-dev)

### Production Environment  
- **Frontend**: Port 4000 (Static files served via `serve`)
- **Backend**: Port 4001 (Compiled Node.js application)

### Protected Ports
- **OpenClaw Gateway**: Port 18789 (NEVER interfered with)
- **System**: Avoid ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

## Quick Start

### Development Environment

```bash
# Start development environment
./deploy/scripts/dev-start.sh

# Start in background mode
./deploy/scripts/dev-start.sh --background

# Stop development environment  
./deploy/scripts/dev-stop.sh

# Check health
./deploy/scripts/health-check.sh
```

### Production Environment

```bash
# Deploy to production
./deploy/scripts/prod-deploy.sh

# Stop production
./deploy/scripts/prod-stop.sh

# Health check
./deploy/scripts/health-check.sh
```

### Using npm Scripts (from project root)

```bash
# Development
npm run dev:start          # Start dev environment
npm run dev:stop           # Stop dev environment

# Production  
npm run prod:deploy        # Deploy production
npm run prod:stop          # Stop production

# Health & Monitoring
npm run health:check       # Check all services
npm run monitor:start      # Start monitoring
npm run monitor:stop       # Stop monitoring
```

## Deployment Scripts

### `dev-start.sh`
- Checks port availability (3000, 3001)
- Kills conflicting processes
- Installs dependencies if needed
- Starts backend on port 3001
- Starts frontend on port 3000
- Performs health checks
- Logs to `deploy/logs/`

### `prod-deploy.sh`
- Full production deployment
- Runs tests (optional)
- Builds production assets
- Starts backend on port 4001
- Serves frontend on port 4000
- Sets up monitoring
- Health verification

### `health-check.sh`
- Checks all environments (dev + prod)
- Verifies port availability
- Tests HTTP endpoints
- Shows system resources
- Provides service summary

## Monitoring System

### Setup
```bash
# Setup monitoring (automatic with prod deploy)
./deploy/monitoring/setup-monitoring.sh

# Control monitoring
./deploy/monitoring/monitor-control.sh start
./deploy/monitoring/monitor-control.sh stop  
./deploy/monitoring/monitor-control.sh status
./deploy/monitoring/monitor-control.sh logs
```

### Features
- **Auto-restart**: Failed services restart automatically
- **Rate limiting**: Max 3 restart attempts per service
- **Cooldown period**: 5 minutes between restart attempts
- **State tracking**: JSON state file tracks service health
- **Log aggregation**: Centralized logging for all services

### Monitoring Configuration
- Location: `deploy/monitoring/config.json`
- Health check interval: 30 seconds
- Automatic restart: Enabled
- Log retention: Managed automatically

## Tailscale Integration

### Setup Tailscale
```bash
# Configure Tailscale integration
./deploy/tailscale/configure-tailscale.sh

# Start with Tailscale support
./deploy/tailscale/start-with-tailscale.sh dev    # Development
./deploy/tailscale/start-with-tailscale.sh prod   # Production

# Setup port forwarding (optional)
./deploy/tailscale/setup-port-forwarding.sh
```

### External Access URLs
- **Development**: `https://hostingervps.barracuda-banfish.ts.net:3000`
- **Production**: `https://hostingervps.barracuda-banfish.ts.net:4000`
- **Dev API**: `https://hostingervps.barracuda-banfish.ts.net:3001`
- **Prod API**: `https://hostingervps.barracuda-banfish.ts.net:4001`

### HTTPS Setup (Optional)
For proper HTTPS routing, nginx configuration is provided:
1. Install nginx
2. Copy `deploy/tailscale/nginx-dashboard.conf` to `/etc/nginx/sites-available/`
3. Enable the site
4. Generate Tailscale certificates: `sudo tailscale cert hostingervps.barracuda-banfish.ts.net`

## GitHub Actions

### Automatic Deployment
- **Trigger**: Push to `main`/`master` branch
- **Stages**: Test → Deploy Dev → Deploy Prod → Notify
- **Manual**: Use workflow dispatch for specific environments

### Self-Hosted Runner
The workflow expects a self-hosted GitHub runner on the target server:

```bash
# Setup GitHub runner (one-time)
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
./config.sh --url https://github.com/StiensWout/openclaw-pm-dashboard --token YOUR_TOKEN
./run.sh
```

### OpenClaw Notifications
The workflow attempts to send deployment notifications via OpenClaw:
- Success: Deployment URLs and commit info
- Failure: Error notification with troubleshooting hints

## Directory Structure

```
deploy/
├── scripts/
│   ├── dev-start.sh          # Start development environment
│   ├── dev-stop.sh           # Stop development environment  
│   ├── prod-deploy.sh        # Deploy production environment
│   ├── prod-stop.sh          # Stop production environment
│   └── health-check.sh       # Health check all services
├── monitoring/
│   ├── setup-monitoring.sh   # Setup monitoring system
│   ├── monitor-control.sh    # Control monitoring daemon
│   ├── health-monitor.sh     # Monitoring daemon script
│   ├── config.json           # Monitoring configuration
│   └── monitor-state.json    # Service state tracking
├── tailscale/
│   ├── configure-tailscale.sh      # Configure Tailscale
│   ├── start-with-tailscale.sh     # Start with Tailscale
│   ├── setup-port-forwarding.sh    # Port forwarding
│   ├── backend-tailscale.env       # Tailscale env vars
│   └── nginx-dashboard.conf        # Nginx HTTPS config
├── logs/
│   ├── backend-dev.log       # Development backend logs
│   ├── frontend-dev.log      # Development frontend logs  
│   ├── backend-prod.log      # Production backend logs
│   ├── frontend-prod.log     # Production frontend logs
│   └── monitoring/           # Monitoring system logs
└── docs/
    ├── DEPLOYMENT_GUIDE.md   # This file
    ├── PORT_ALLOCATION.md    # Port management guide
    └── TROUBLESHOOTING.md    # Common issues and solutions
```

## Environment Variables

### Development (.env.development)
```env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,https://hostingervps.barracuda-banfish.ts.net:3000
```

### Production (.env.production)  
```env
NODE_ENV=production
PORT=4001
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:4000,https://hostingervps.barracuda-banfish.ts.net:4000
TRUST_PROXY=true
```

### Tailscale Integration
The `backend-tailscale.env` file provides additional configuration for Tailscale compatibility.

## Troubleshooting

### Common Issues

**Ports in use:**
```bash
# Check what's using a port
lsof -i :3000
lsof -i :4000

# Kill processes on specific ports
./deploy/scripts/dev-stop.sh
./deploy/scripts/prod-stop.sh
```

**Services not starting:**
```bash
# Check logs
tail -f deploy/logs/backend-dev.log
tail -f deploy/logs/frontend-prod.log

# Manual health check
curl http://localhost:3001/health
curl http://localhost:4000
```

**Monitoring not working:**
```bash
# Check monitoring status
./deploy/monitoring/monitor-control.sh status

# Restart monitoring
./deploy/monitoring/monitor-control.sh restart

# View monitoring logs
./deploy/monitoring/monitor-control.sh logs
```

**Tailscale connectivity issues:**
```bash
# Check Tailscale status
tailscale status
tailscale ping hostingervps.barracuda-banfish.ts.net

# Test connectivity
curl https://hostingervps.barracuda-banfish.ts.net:4000
```

### Log Locations
- **Deployment logs**: `deploy/logs/`
- **Monitoring logs**: `deploy/logs/monitoring/`
- **Service PIDs**: Stored in `deploy/logs/*.pid`

### Recovery Procedures

**Complete environment reset:**
```bash
# Stop everything
./deploy/scripts/dev-stop.sh
./deploy/scripts/prod-stop.sh
./deploy/monitoring/monitor-control.sh stop

# Clean logs (optional)
rm -rf deploy/logs/*

# Restart monitoring
./deploy/monitoring/setup-monitoring.sh

# Redeploy
./deploy/scripts/prod-deploy.sh
```

## Best Practices

1. **Always check health** after deployment
2. **Monitor logs** during initial deployment
3. **Use background mode** for automated deployments  
4. **Keep monitoring active** in production
5. **Test Tailscale connectivity** after changes
6. **Backup configuration** before major changes

## Security Considerations

- All services bind to `0.0.0.0` for Tailscale access
- CORS configured for known origins only
- Proxy headers trusted only when needed
- OpenClaw Gateway port (18789) never interfered with
- Tailscale provides encrypted transport layer