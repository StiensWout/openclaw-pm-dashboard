# 🚀 OpenClaw PM Dashboard - Backend Deployment Guide

## 📋 Pre-Deployment Checklist

### System Requirements
- ✅ Node.js 18+ installed
- ✅ Tailscale connected and running
- ✅ OpenClaw workspace accessible
- ✅ Port 3001 (dev) / 4001 (prod) available
- ✅ Git repository access

### Port Configuration ⚠️
**CRITICAL: Avoid OpenClaw Gateway conflicts**
- **DO NOT USE**: Port 18789 (OpenClaw Gateway)
- **Development**: Port 3001 (Backend API)
- **Production**: Port 4001 (Backend API)

## 🔧 Installation

### 1. Clone and Install
```bash
cd /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard/backend
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your specific configuration
```

Key environment variables:
```env
NODE_ENV=development
PORT=3001
TAILSCALE_INTERFACE=hostingervps.barracuda-banfish.ts.net
DB_PATH=./data/openclaw-pm.db
OPENCLAW_NOTIFICATIONS=true
```

### 3. Database Initialization
```bash
npm run db:init
```

## 🚦 Running the Server

### Development Mode
```bash
npm run dev
```
- Auto-restart on file changes
- Detailed logging
- Port 3001
- Accessible: https://hostingervps.barracuda-banfish.ts.net:3001

### Production Mode
```bash
npm run build:prod
npm run start:prod
```
- Optimized build
- Production logging
- Port 4001
- Accessible: https://hostingervps.barracuda-banfish.ts.net:4001

### Quick Preview Deploy
```bash
npm run preview
```
Builds and starts production server in one command.

## 🔍 Health Monitoring

### System Status
```bash
curl https://hostingervps.barracuda-banfish.ts.net:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-16T16:08:31.626Z",
  "version": "0.1.0",
  "environment": "development",
  "port": 3001,
  "tailscale": {
    "enabled": true,
    "hostname": "hostingervps.barracuda-banfish.ts.net"
  }
}
```

### API Status
```bash
curl https://hostingervps.barracuda-banfish.ts.net:3001/api/status
```

### Tailscale Status
```bash
curl https://hostingervps.barracuda-banfish.ts.net:3001/tailscale/status
```

## 🗄️ Database Management

### Backup Database
```bash
cp ./data/openclaw-pm.db ./data/openclaw-pm-backup-$(date +%Y%m%d_%H%M%S).db
```

### Reset Database
```bash
rm ./data/openclaw-pm.db
npm run db:init
```

### View Database
```bash
sqlite3 ./data/openclaw-pm.db
.tables
.schema agents
SELECT COUNT(*) FROM agents;
```

## 📡 OpenClaw Integration

### Notification Testing
The backend automatically sends notifications to Wout via OpenClaw messaging:
- Server startup/shutdown events
- Agent status changes
- Project completion updates
- System errors and warnings

### Notification Files
If OpenClaw messaging fails, notifications are written to:
```
/home/wout/.openclaw/workspace/memory/pm-dashboard-notifications.json
```

## 🔐 Security & Network

### Tailscale-Only Access
- Server binds to `0.0.0.0` but only accessible via Tailscale network
- No public internet exposure
- Private network isolation

### Rate Limiting
- API: 100 requests per 15 minutes
- Auth: 5 attempts per 15 minutes
- WebSocket: 1000 events per minute

### CORS Configuration
```
http://localhost:3000 (development frontend)
https://hostingervps.barracuda-banfish.ts.net:4000 (production frontend)
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :3001
# Kill process if needed
sudo kill -9 <PID>
```

#### Database Permissions
```bash
chmod 644 ./data/openclaw-pm.db
chown wout:wout ./data/openclaw-pm.db
```

#### Tailscale Connection
```bash
tailscale status
tailscale ping hostingervps.barracuda-banfish.ts.net
```

#### OpenClaw Messaging
```bash
# Check OpenClaw CLI
openclaw help
# Check workspace path
ls -la /home/wout/.openclaw/workspace
```

### Log Analysis
```bash
# View server logs
tail -f logs/app.log

# Check system logs
journalctl -u pm-dashboard -f
```

## 🚀 Production Deployment

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Deploy with PM2
npm run deploy:preview

# Monitor
pm2 status
pm2 logs openclaw-pm-backend

# Stop
npm run stop:preview
```

### Using systemd
Create `/etc/systemd/system/openclaw-pm-backend.service`:
```ini
[Unit]
Description=OpenClaw PM Dashboard Backend
After=network.target

[Service]
Type=simple
User=wout
WorkingDirectory=/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard/backend
Environment=NODE_ENV=production
Environment=PORT=4001
ExecStart=/usr/bin/npm run start:prod
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable openclaw-pm-backend
sudo systemctl start openclaw-pm-backend
sudo systemctl status openclaw-pm-backend
```

## 📊 Performance Monitoring

### Key Metrics to Monitor
- Memory usage (< 500MB normal)
- Response times (< 100ms for API calls)
- WebSocket connections
- Database query performance
- Error rates

### Monitoring Commands
```bash
# Memory usage
ps aux | grep node

# Network connections
netstat -tulpn | grep 3001

# Database size
du -sh ./data/openclaw-pm.db

# API response test
time curl https://hostingervps.barracuda-banfish.ts.net:3001/api/status
```

## 🔄 Updates & Maintenance

### Update Code
```bash
git pull origin master
npm install
npm run build:prod
pm2 restart openclaw-pm-backend
```

### Database Migrations
When schema changes:
```bash
# Backup first
npm run db:backup
# Run migration
npm run db:migrate
```

## 📞 Support & Debugging

### Contact Information
- **Repository**: https://github.com/your-repo/openclaw-pm-dashboard
- **Documentation**: /home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard/docs/
- **Logs**: ./logs/app.log

### Debug Mode
```bash
DEBUG=* npm run dev
```

### API Testing
```bash
# Test all endpoints
curl https://hostingervps.barracuda-banfish.ts.net:3001/api/agents
curl https://hostingervps.barracuda-banfish.ts.net:3001/api/projects  
curl https://hostingervps.barracuda-banfish.ts.net:3001/api/tasks
curl https://hostingervps.barracuda-banfish.ts.net:3001/api/analytics/overview
```

## ✅ Success Indicators

✅ **Health check returns 200 OK**  
✅ **Tailscale status shows connected**  
✅ **Database initialized with tables**  
✅ **WebSocket connections working**  
✅ **API endpoints responding**  
✅ **OpenClaw notifications functional**  
✅ **No port conflicts with Gateway (18789)**

---

🎉 **Backend successfully deployed and running!**

Access your dashboard at:
- **Development**: https://hostingervps.barracuda-banfish.ts.net:3001
- **Production**: https://hostingervps.barracuda-banfish.ts.net:4001