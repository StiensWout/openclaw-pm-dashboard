# OpenClaw Multi-Agent Project Management Dashboard

A real-time project management dashboard designed for multi-agent coordination and collaboration within the OpenClaw ecosystem.

## Overview

This dashboard provides a centralized interface for managing projects, coordinating multiple AI agents, and tracking real-time progress across various tasks and workflows. It leverages OpenClaw's agent infrastructure to enable seamless collaboration between human users and AI agents.

## 🔐 Security & Access

**Tailscale-Only Access:** This application is configured for secure access via Tailscale network only. It is **not accessible** from the public internet.

**Access URLs:**
- **Development:** `https://hostingervps.barracuda-banfish.ts.net:3000`
- **Production:** `https://hostingervps.barracuda-banfish.ts.net:4000`

## 📊 Port Configuration

The application uses specific ports to avoid conflicts with OpenClaw Gateway (port 18789):

| Environment | Frontend Port | Backend Port | Purpose |
|-------------|---------------|--------------|---------|
| Development | 3000 | 3001 | Active development with hot reload |
| Production | 4000 | 4001 | Stable production deployment |
| OpenClaw Gateway | N/A | 18789 | **Reserved - Do Not Use** |

## Architecture

```
openclaw-pm-dashboard/
├── frontend/           # React-based dashboard UI
├── backend/            # Express API server with Socket.io
├── agents/             # Agent implementations and coordinators
├── shared/             # Shared utilities and types
└── docs/              # Project documentation
```

## Features

- **Real-time Updates**: Live project status updates via Socket.io
- **Multi-Agent Coordination**: Seamlessly manage and communicate with multiple AI agents
- **Task Management**: Create, assign, and track tasks across agents and humans
- **Visual Dashboard**: Interactive charts and progress visualization
- **Agent Status Monitoring**: Real-time agent health and activity monitoring
- **Project Analytics**: Insights into project progress and agent performance

## Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **Material-UI** - Component library for consistent design
- **Socket.io Client** - Real-time communication
- **Recharts** - Data visualization
- **React Router** - Navigation and routing

### Backend
- **Express.js** - Web server framework
- **Socket.io** - Real-time bidirectional communication
- **Node.js** - Runtime environment
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logging

### Agents
- **OpenClaw SDK** - Agent framework integration
- **WebSocket Communication** - Real-time agent messaging
- **Task Queue Management** - Distributed task processing

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** 
- **npm** (comes with Node.js)
- **Git**
- **Tailscale** (must be running and authenticated)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/StiensWout/openclaw-pm-dashboard.git
   cd openclaw-pm-dashboard
   ```

2. Install all dependencies:
   ```bash
   npm run install:all
   ```

### Development Mode

**Start both frontend and backend (recommended):**
```bash
npm run dev:start
```

**Or start individually:**
```bash
# Backend only (port 3001)
npm run dev:backend-only

# Frontend only (port 3000) 
npm run dev:frontend-only
```

**Access development dashboard:**
- 🌐 **Main Dashboard:** https://hostingervps.barracuda-banfish.ts.net:3000
- 🔧 **API Endpoint:** https://hostingervps.barracuda-banfish.ts.net:3001

### Production Mode

**Deploy to production:**
```bash
npm run deploy:prod
```

**Or manually:**
```bash
# Build and start production
npm run prod:build
npm run prod:start
```

**Access production dashboard:**
- 🏭 **Production Dashboard:** https://hostingervps.barracuda-banfish.ts.net:4000
- 🔧 **Production API:** https://hostingervps.barracuda-banfish.ts.net:4001

## 🎛️ Management Commands

### Development Commands
```bash
npm run dev:start          # Start both frontend and backend
npm run dev:stop           # Stop development servers
npm run logs:dev           # View development logs
```

### Production Commands  
```bash
npm run deploy:prod        # Full production deployment
npm run prod:start         # Start production servers
npm run prod:stop          # Stop production servers
npm run logs:prod          # View production logs
```

### Utility Commands
```bash
npm run status             # Show running processes
npm run health             # Test API health endpoints
npm run clean              # Clean all node_modules
npm test                   # Run all tests
npm run lint               # Run linting
```

### Git Workflow
```bash
npm run commit "message"   # Add, commit with message
npm run push               # Push to GitHub
```

## ⚙️ Configuration

The application uses environment-specific configuration:

### Development (.env.development)
- Ports: Frontend 3000, Backend 3001
- Debug logging enabled
- CORS allows localhost + Tailscale
- Hot reload active

### Production (.env.production) 
- Ports: Frontend 4000, Backend 4001
- Optimized builds
- Restricted CORS
- Error logging only

### Tailscale (.env.tailscale)
- Tailscale-only binding
- Production security settings
- Network interface restrictions

## Project Structure

### Frontend (`/frontend`)
- `src/components/` - Reusable UI components
- `src/pages/` - Main dashboard pages
- `src/services/` - API and Socket.io services
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React context providers

### Backend (`/backend`)
- `routes/` - Express route handlers
- `services/` - Business logic and external integrations
- `middleware/` - Express middleware
- `sockets/` - Socket.io event handlers
- `models/` - Data models and schemas

### Agents (`/agents`)
- `coordinators/` - High-level agent coordination logic
- `workers/` - Specific task-focused agents
- `utils/` - Agent utility functions
- `types/` - Agent interface definitions

### Shared (`/shared`)
- `types/` - TypeScript type definitions
- `utils/` - Common utility functions
- `constants/` - Shared constants and configuration

## 🔧 Troubleshooting

### Common Issues

**Q: Can't access the dashboard**
```bash
# Check if Tailscale is running
tailscale status

# Check if servers are running
npm run status

# Check logs for errors
npm run logs:dev  # or logs:prod
```

**Q: Port conflicts**
```bash
# Check what's using the ports
lsof -i :3000 -i :3001 -i :4000 -i :4001

# Kill processes if needed
npm run dev:stop
npm run prod:stop
```

**Q: Backend API not responding**
```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Check backend logs
tail -f logs/backend-dev.log
```

**Q: Frontend not loading**
```bash
# Check if frontend server is running
ps aux | grep vite

# Try rebuilding
cd frontend && rm -rf node_modules && npm install
```

### Environment Issues

**Tailscale IP Detection:**
```bash
# Get your Tailscale IP
tailscale ip -4

# Update environment if needed
echo "BIND_HOST=$(tailscale ip -4)" >> backend/.env
```

**Permission Denied:**
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Fix ownership if needed
sudo chown -R $(whoami):$(whoami) .
```

### Development vs Production

| Issue | Development | Production |
|-------|-------------|------------|
| Hot reload not working | Check Vite config | N/A |
| Build errors | Not applicable | Check build logs |
| CORS errors | Check CORS_ORIGIN | Verify Tailscale hostname |
| Port conflicts | Use dev ports 3000/3001 | Use prod ports 4000/4001 |

## 🏗️ Project Structure Explained

```
openclaw-pm-dashboard/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main dashboard pages
│   │   ├── services/      # API and Socket.io services
│   │   └── hooks/         # Custom React hooks
│   ├── public/            # Static assets
│   └── build/             # Production build output
│
├── backend/               # Express server
│   ├── services/          # Business logic services
│   │   └── notificationService.js
│   ├── routes/            # API route handlers (future)
│   └── server.js          # Main server file
│
├── scripts/               # Deployment and utility scripts
│   ├── deploy-development.sh
│   ├── deploy-production.sh
│   └── deploy-tailscale.sh
│
├── shared/                # Shared utilities
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Common utility functions
│
├── docs/                  # Project documentation
│   └── ARCHITECTURE.md
│
└── logs/                  # Runtime logs (created automatically)
    ├── backend-dev.log
    ├── frontend-dev.log
    ├── backend-prod.log
    └── frontend-prod.log
```

## 🤖 Agent Integration

This dashboard integrates with OpenClaw agents through:

- **Real-time Communication:** Socket.io for live agent status updates
- **Notification System:** Alerts when user input is required
- **Task Management:** Coordination of agent workflows
- **Status Monitoring:** Live agent health and activity tracking

### Agent Notification Examples

```javascript
// Request user input
await notificationService.requestUserInput(
  'Choose Deployment Strategy',
  'Which deployment approach should we use?',
  ['Blue-Green', 'Rolling Update', 'Recreate'],
  { agent: 'deployment-agent', deadline: '5 minutes' }
);

// Notify milestone completion
await notificationService.notifyMilestone(
  'Frontend Build Complete',
  'build-agent',
  { build_time: '45s', bundle_size: '2.3MB' }
);
```

## 🔒 Security Features

- **Tailscale-Only Access:** No public internet exposure
- **CORS Protection:** Restricted to allowed origins only
- **Network Binding:** Server binds only to specific interfaces
- **Rate Limiting:** Protection against abuse (production)
- **Security Headers:** Helmet.js security middleware

## 📚 Development Workflow

1. **Start Development:**
   ```bash
   npm run deploy:dev
   ```

2. **Make Changes:**
   - Edit files in `frontend/src/` or `backend/`
   - Hot reload automatically updates the browser

3. **Test Changes:**
   ```bash
   # Check health
   npm run health
   
   # View logs
   npm run logs:dev
   ```

4. **Commit Work:**
   ```bash
   npm run commit "feat(component): add new dashboard widget"
   npm run push
   ```

5. **Deploy to Production:**
   ```bash
   npm run deploy:prod
   ```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes using the development environment
4. Test thoroughly with both `npm run dev:start` and `npm run deploy:prod`
5. Commit with proper agent attribution: `git commit -m "feat(agent-name): description"`
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please refer to the OpenClaw documentation or create an issue in this repository.