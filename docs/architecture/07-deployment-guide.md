# Deployment & Setup Guide

## Overview

This guide covers the deployment and management of the OpenClaw Project Management Dashboard in both development and production environments, with proper isolation from the OpenClaw system.

## Prerequisites

### System Requirements
- Node.js 18+ with npm/yarn
- MongoDB 5.0+
- PM2 process manager
- Git for version control
- Tailscale network access

### Tailscale Network Configuration
- Access to `hostingervps.barracuda-banfish.ts.net`
- OpenClaw running on port `:18789` (DO NOT INTERFERE)
- Available ports `:3000`, `:3001` (development) and `:4000`, `:4001` (production)

## Project Structure

```
/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard/
├── frontend/                    # Next.js frontend application
├── backend/                     # Express.js backend API
├── agents/                      # Multi-agent system code
├── shared/                      # Shared types and utilities
├── docs/                        # Architecture and API documentation
├── scripts/                     # Deployment and utility scripts
├── data/                        # Database files (created during setup)
│   ├── dev/                     # Development databases
│   └── prod/                    # Production databases
├── ecosystem.dev.config.js      # PM2 development configuration
├── ecosystem.prod.config.js     # PM2 production configuration
└── docker-compose.yml           # Local MongoDB setup
```

## Initial Setup

### 1. Clone and Install Dependencies
```bash
# Navigate to workspace
cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..

# Install agent system dependencies
cd agents && npm install && cd ..
```

### 2. Environment Configuration
```bash
# Create environment files
cp .env.example .env.development
cp .env.example .env.production

# Edit development environment
nano .env.development
```

#### Development Environment Variables (.env.development)
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=https://hostingervps.barracuda-banfish.ts.net:3000
BACKEND_URL=https://hostingervps.barracuda-banfish.ts.net:3001

# Database Configuration
SQLITE_PATH=./data/dev/pm-dashboard-dev.sqlite
MONGODB_URL=mongodb://localhost:27017/pm-dashboard-dev

# OpenClaw Integration
OPENCLAW_URL=https://hostingervps.barracuda-banfish.ts.net
OPENCLAW_MESSAGING_ENDPOINT=https://hostingervps.barracuda-banfish.ts.net/api/messaging
OPENCLAW_TOOLS_ENDPOINT=https://hostingervps.barracuda-banfish.ts.net/api/tools

# Tailscale Configuration
TAILSCALE_HOSTNAME=hostingervps.barracuda-banfish.ts.net
BIND_HOST=100.x.x.x  # Tailscale IP address
CORS_ORIGIN=https://hostingervps.barracuda-banfish.ts.net:3000

# Security
JWT_SECRET=dev_jwt_secret_key_change_in_production
SESSION_SECRET=dev_session_secret_change_in_production
RATE_LIMIT_MAX=1000

# Agent Configuration
AGENT_ORCHESTRATOR_ENABLED=true
AGENT_MAX_CONCURRENT_TASKS=5
AGENT_HEARTBEAT_INTERVAL=30000

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json
```

#### Production Environment Variables (.env.production)
```env
NODE_ENV=production
PORT=4001
FRONTEND_URL=https://hostingervps.barracuda-banfish.ts.net:4000
BACKEND_URL=https://hostingervps.barracuda-banfish.ts.net:4001

# Database Configuration
SQLITE_PATH=./data/prod/pm-dashboard.sqlite
MONGODB_URL=mongodb://localhost:27017/pm-dashboard-prod

# OpenClaw Integration (same as dev)
OPENCLAW_URL=https://hostingervps.barracuda-banfish.ts.net
OPENCLAW_MESSAGING_ENDPOINT=https://hostingervps.barracuda-banfish.ts.net/api/messaging
OPENCLAW_TOOLS_ENDPOINT=https://hostingervps.barracuda-banfish.ts.net/api/tools

# Tailscale Configuration
TAILSCALE_HOSTNAME=hostingervps.barracuda-banfish.ts.net
BIND_HOST=100.x.x.x  # Tailscale IP address
CORS_ORIGIN=https://hostingervps.barracuda-banfish.ts.net:4000

# Security (CHANGE THESE IN PRODUCTION)
JWT_SECRET=secure_production_jwt_secret_key
SESSION_SECRET=secure_production_session_secret
RATE_LIMIT_MAX=500

# Agent Configuration
AGENT_ORCHESTRATOR_ENABLED=true
AGENT_MAX_CONCURRENT_TASKS=10
AGENT_HEARTBEAT_INTERVAL=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### 3. Database Setup
```bash
# Create data directories
mkdir -p data/dev data/prod data/dev/backups data/prod/backups

# Start local MongoDB
docker-compose up -d mongodb

# Run database migrations for development
npm run db:migrate:dev

# Run database migrations for production
npm run db:migrate:prod

# Seed development database with sample data
npm run db:seed:dev
```

### 4. Build Applications
```bash
# Build backend
cd backend
npm run build
cd ..

# Build frontend for development
cd frontend
npm run build:dev
cd ..

# Build frontend for production
cd frontend
npm run build
cd ..
```

## Deployment Scripts

### Development Deployment
```bash
#!/bin/bash
# scripts/deploy-dev.sh

set -e

echo "🚀 Deploying PM Dashboard - Development Environment"

# Load environment variables
source .env.development

# Stop existing services (if running)
pm2 stop ecosystem.dev.config.js || echo "No dev services running"

# Build applications
echo "📦 Building applications..."
cd backend && npm run build && cd ..
cd frontend && npm run build:dev && cd ..

# Run database migrations
echo "🗃️  Running database migrations..."
npm run db:migrate:dev

# Start services with PM2
echo "🔄 Starting services..."
pm2 start ecosystem.dev.config.js

# Wait for services to start
sleep 5

# Health check
echo "🏥 Running health checks..."
curl -f https://hostingervps.barracuda-banfish.ts.net:3001/health || {
  echo "❌ Backend health check failed"
  pm2 logs pm-dashboard-dev-backend --lines 20
  exit 1
}

curl -f https://hostingervps.barracuda-banfish.ts.net:3000 || {
  echo "❌ Frontend health check failed"
  pm2 logs pm-dashboard-dev-frontend --lines 20
  exit 1
}

echo "✅ Development environment deployed successfully!"
echo "🌐 Frontend: https://hostingervps.barracuda-banfish.ts.net:3000"
echo "🔧 Backend: https://hostingervps.barracuda-banfish.ts.net:3001"
echo "📊 PM2 Status: pm2 list"
```

### Production Deployment
```bash
#!/bin/bash
# scripts/deploy-prod.sh

set -e

echo "🚀 Deploying PM Dashboard - Production Environment"

# Load environment variables
source .env.production

# Create backup before deployment
echo "💾 Creating backup..."
./scripts/backup-prod.sh

# Run tests
echo "🧪 Running tests..."
npm test

# Build applications
echo "📦 Building applications..."
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# Run database migrations
echo "🗃️  Running database migrations..."
npm run db:migrate:prod

# Zero-downtime deployment
echo "🔄 Starting new services..."
pm2 start ecosystem.prod.config.js --update-env

# Wait for new services to be ready
sleep 10

# Health check
echo "🏥 Running health checks..."
curl -f https://hostingervps.barracuda-banfish.ts.net:4001/health || {
  echo "❌ Production deployment failed - Rolling back"
  pm2 restart ecosystem.prod.config.js
  exit 1
}

curl -f https://hostingervps.barracuda-banfish.ts.net:4000 || {
  echo "❌ Frontend deployment failed - Rolling back"
  pm2 restart ecosystem.prod.config.js
  exit 1
}

echo "✅ Production environment deployed successfully!"
echo "🌐 Frontend: https://hostingervps.barracuda-banfish.ts.net:4000"
echo "🔧 Backend: https://hostingervps.barracuda-banfish.ts.net:4001"
echo "📊 PM2 Status: pm2 list"
```

### Environment Switching
```bash
#!/bin/bash
# scripts/switch-env.sh

ENVIRONMENT=$1

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "Usage: ./scripts/switch-env.sh [dev|prod]"
    echo ""
    echo "Available environments:"
    echo "  dev  - Development environment (ports 3000/3001)"
    echo "  prod - Production environment (ports 4000/4001)"
    exit 1
fi

echo "🔄 Switching to $ENVIRONMENT environment..."

if [ "$ENVIRONMENT" = "dev" ]; then
    # Stop production services
    pm2 stop ecosystem.prod.config.js || echo "Production services not running"
    
    # Start development services
    pm2 start ecosystem.dev.config.js
    
    echo "✅ Switched to Development environment"
    echo "🌐 URL: https://hostingervps.barracuda-banfish.ts.net:3000"
    echo "🔧 API: https://hostingervps.barracuda-banfish.ts.net:3001"
    
elif [ "$ENVIRONMENT" = "prod" ]; then
    # Stop development services
    pm2 stop ecosystem.dev.config.js || echo "Development services not running"
    
    # Start production services
    pm2 start ecosystem.prod.config.js
    
    echo "✅ Switched to Production environment"  
    echo "🌐 URL: https://hostingervps.barracuda-banfish.ts.net:4000"
    echo "🔧 API: https://hostingervps.barracuda-banfish.ts.net:4001"
fi

echo ""
echo "📊 Service Status:"
pm2 list
```

## PM2 Process Management

### Development Configuration (ecosystem.dev.config.js)
```javascript
module.exports = {
  apps: [
    {
      name: 'pm-dashboard-dev-backend',
      script: './backend/dist/index.js',
      cwd: '/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard',
      env_file: '.env.development',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/dev-backend-error.log',
      out_file: './logs/dev-backend-out.log',
      log_file: './logs/dev-backend.log',
      time: true,
      merge_logs: true
    },
    {
      name: 'pm-dashboard-dev-frontend',
      script: 'serve',
      args: '-s frontend/dist -l 3000 --host 100.x.x.x', // Tailscale IP
      cwd: '/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard',
      env: {
        NODE_ENV: 'development'
      },
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/dev-frontend-error.log',
      out_file: './logs/dev-frontend-out.log'
    }
  ]
};
```

### Production Configuration (ecosystem.prod.config.js)
```javascript
module.exports = {
  apps: [
    {
      name: 'pm-dashboard-prod-backend',
      script: './backend/dist/index.js',
      cwd: '/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard',
      env_file: '.env.production',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      instances: 1, // Single instance for SQLite
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/prod-backend-error.log',
      out_file: './logs/prod-backend-out.log',
      log_file: './logs/prod-backend.log',
      time: true,
      merge_logs: true,
      restart_delay: 4000,
      min_uptime: '10s',
      max_restarts: 3
    },
    {
      name: 'pm-dashboard-prod-frontend',
      script: 'serve',
      args: '-s frontend/dist -l 4000 --host 100.x.x.x', // Tailscale IP
      cwd: '/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      error_file: './logs/prod-frontend-error.log',
      out_file: './logs/prod-frontend-out.log'
    }
  ]
};
```

## Backup & Recovery

### Backup Scripts
```bash
#!/bin/bash
# scripts/backup-prod.sh

BACKUP_DIR="./data/prod/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "📦 Creating production backup: $TIMESTAMP"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup SQLite database
echo "💾 Backing up SQLite database..."
sqlite3 ./data/prod/pm-dashboard.sqlite ".backup $BACKUP_DIR/pm-dashboard-$TIMESTAMP.sqlite"

# Backup MongoDB
echo "💾 Backing up MongoDB..."
mongodump --db pm-dashboard-prod --out $BACKUP_DIR/mongodb-$TIMESTAMP

# Compress backups
echo "🗜️  Compressing backups..."
tar -czf $BACKUP_DIR/backup-$TIMESTAMP.tar.gz $BACKUP_DIR/mongodb-$TIMESTAMP
rm -rf $BACKUP_DIR/mongodb-$TIMESTAMP

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sqlite" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_DIR/backup-$TIMESTAMP.tar.gz"
```

### Recovery Script
```bash
#!/bin/bash
# scripts/restore-backup.sh

BACKUP_FILE=$1
ENVIRONMENT=${2:-prod}

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./scripts/restore-backup.sh <backup-file> [dev|prod]"
    exit 1
fi

echo "🔄 Restoring backup: $BACKUP_FILE to $ENVIRONMENT environment"

# Stop services
pm2 stop pm-dashboard-$ENVIRONMENT-backend || true

# Restore SQLite database
if [ "$ENVIRONMENT" = "prod" ]; then
    cp $BACKUP_FILE ./data/prod/pm-dashboard.sqlite
else
    cp $BACKUP_FILE ./data/dev/pm-dashboard-dev.sqlite
fi

# Start services
pm2 start ecosystem.$ENVIRONMENT.config.js

echo "✅ Backup restored successfully"
```

## Monitoring & Maintenance

### Health Check Endpoints
```bash
# Backend health check
curl https://hostingervps.barracuda-banfish.ts.net:3001/health
curl https://hostingervps.barracuda-banfish.ts.net:4001/health

# Frontend availability check
curl https://hostingervps.barracuda-banfish.ts.net:3000
curl https://hostingervps.barracuda-banfish.ts.net:4000

# Database health check
curl https://hostingervps.barracuda-banfish.ts.net:3001/health/db
curl https://hostingervps.barracuda-banfish.ts.net:4001/health/db

# Agent system health
curl https://hostingervps.barracuda-banfish.ts.net:3001/health/agents
curl https://hostingervps.barracuda-banfish.ts.net:4001/health/agents
```

### Log Management
```bash
# View logs
pm2 logs pm-dashboard-dev-backend --lines 100
pm2 logs pm-dashboard-prod-backend --lines 100

# Clear logs
pm2 flush

# Monitor processes
pm2 monit

# Process information
pm2 info pm-dashboard-prod-backend
```

### Database Maintenance
```bash
# SQLite maintenance
sqlite3 ./data/prod/pm-dashboard.sqlite "VACUUM;"
sqlite3 ./data/prod/pm-dashboard.sqlite "PRAGMA optimize;"

# MongoDB maintenance
mongo pm-dashboard-prod --eval "db.runCommand({compact: 'events'})"

# Database size check
du -sh data/prod/pm-dashboard.sqlite
du -sh data/prod/pm-dashboard-mongo
```

This deployment guide ensures proper isolation, easy environment switching, and comprehensive monitoring for the PM Dashboard system.