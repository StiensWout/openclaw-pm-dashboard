# OpenClaw Integration Architecture

## System Isolation Strategy

The OpenClaw Project Management Dashboard is designed as a complementary system that integrates with OpenClaw without interfering with its core functionality. This document outlines the isolation and integration architecture.

## Port Architecture

### Service Port Allocation
```
┌─────────────────────────────────────────────────────────────────┐
│                    Tailscale Network                             │
│  hostingervps.barracuda-banfish.ts.net                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │   OpenClaw      │    │  PM Dashboard   │    │ PM Dashboard │ │
│  │   Gateway       │    │  Development    │    │ Production   │ │
│  │   :18789        │    │  :3000 + :3001  │    │ :4000 + :4001│ │
│  │   (EXISTING)    │    │                 │    │              │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
│           │                       │                       │      │
│           │                       │                       │      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ OpenClaw Tools  │    │   Dev SQLite    │    │ Prod SQLite  │ │
│  │ & Integrations  │    │   Databases     │    │  Databases   │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Access URLs
- **OpenClaw**: `https://hostingervps.barracuda-banfish.ts.net` *(port :18789 - existing)*
- **PM Dev**: `https://hostingervps.barracuda-banfish.ts.net:3000`
- **PM Prod**: `https://hostingervps.barracuda-banfish.ts.net:4000`

## Service Architecture

### Development Environment
```yaml
frontend:
  port: 3000
  url: "https://hostingervps.barracuda-banfish.ts.net:3000"
  websocket: "wss://hostingervps.barracuda-banfish.ts.net:3001/ws"

backend:
  port: 3001
  api: "https://hostingervps.barracuda-banfish.ts.net:3001/api/v1"
  websocket: "wss://hostingervps.barracuda-banfish.ts.net:3001/ws"
  database: "./data/dev/pm-dashboard-dev.sqlite"
  mongodb: "./data/dev/pm-dashboard-dev-mongo"

openclaw_integration:
  gateway_url: "https://hostingervps.barracuda-banfish.ts.net"
  messaging_endpoint: "https://hostingervps.barracuda-banfish.ts.net/api/messaging"
  tools_access: true
```

### Production Environment
```yaml
frontend:
  port: 4000
  url: "https://hostingervps.barracuda-banfish.ts.net:4000"
  websocket: "wss://hostingervps.barracuda-banfish.ts.net:4001/ws"

backend:
  port: 4001
  api: "https://hostingervps.barracuda-banfish.ts.net:4001/api/v1"
  websocket: "wss://hostingervps.barracuda-banfish.ts.net:4001/ws"
  database: "./data/prod/pm-dashboard.sqlite"
  mongodb: "./data/prod/pm-dashboard-mongo"

openclaw_integration:
  gateway_url: "https://hostingervps.barracuda-banfish.ts.net"
  messaging_endpoint: "https://hostingervps.barracuda-banfish.ts.net/api/messaging"
  tools_access: true
```

## Database Isolation

### SQLite Database Structure
```
/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard/
├── data/
│   ├── dev/
│   │   ├── pm-dashboard-dev.sqlite
│   │   ├── pm-dashboard-dev-mongo/
│   │   └── backups/
│   └── prod/
│       ├── pm-dashboard.sqlite
│       ├── pm-dashboard-mongo/
│       └── backups/
```

### Database Configuration
```typescript
// Development configuration
const devConfig = {
  sqlite: {
    path: './data/dev/pm-dashboard-dev.sqlite',
    options: {
      enableWAL: true,
      busyTimeout: 30000,
      pragmas: {
        synchronous: 'NORMAL',
        cache_size: -64000,
        temp_store: 'MEMORY'
      }
    }
  },
  mongodb: {
    url: 'mongodb://localhost:27017/pm-dashboard-dev',
    options: {
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000
    }
  }
};

// Production configuration
const prodConfig = {
  sqlite: {
    path: './data/prod/pm-dashboard.sqlite',
    options: {
      enableWAL: true,
      busyTimeout: 30000,
      pragmas: {
        synchronous: 'FULL',
        cache_size: -128000,
        temp_store: 'MEMORY'
      }
    }
  },
  mongodb: {
    url: 'mongodb://localhost:27017/pm-dashboard-prod',
    options: {
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000
    }
  }
};
```

## WebSocket Separation

### Independent WebSocket Servers
```typescript
// PM Dashboard WebSocket Server (separate from OpenClaw)
class PMDashboardWebSocketServer {
  private port: number;
  private server: WebSocketServer;
  
  constructor(port: number) {
    this.port = port;
    this.server = new WebSocketServer({
      port: this.port,
      path: '/ws',
      // Ensure no conflict with OpenClaw's WebSocket
      host: '100.x.x.x' // Tailscale IP only
    });
  }
  
  // Handle PM Dashboard specific messages
  private handleMessage(ws: WebSocket, message: PMDashboardMessage) {
    switch (message.type) {
      case 'project_subscribe':
        this.subscribeToProject(ws, message.projectId);
        break;
      case 'agent_command':
        this.routeToAgent(message);
        break;
      case 'openclaw_bridge':
        this.bridgeToOpenClaw(message);
        break;
    }
  }
  
  // Bridge specific messages to OpenClaw
  private async bridgeToOpenClaw(message: any) {
    const openclawClient = new OpenClawClient();
    await openclawClient.sendMessage(message.data);
  }
}

// Development server: port 3001
const devWebSocketServer = new PMDashboardWebSocketServer(3001);

// Production server: port 4001
const prodWebSocketServer = new PMDashboardWebSocketServer(4001);
```

## OpenClaw Integration Points

### 1. Messaging API Integration
```typescript
class OpenClawIntegration {
  private baseUrl = 'https://hostingervps.barracuda-banfish.ts.net';
  private messagingEndpoint = `${this.baseUrl}/api/messaging`;
  
  // Send project updates to OpenClaw channels
  async sendProjectUpdate(projectId: string, update: ProjectUpdate) {
    const message = {
      channel: 'project-management',
      type: 'project_update',
      data: {
        projectId,
        name: update.name,
        progress: update.progress,
        status: update.status,
        url: `https://hostingervps.barracuda-banfish.ts.net:${this.getPort()}/projects/${projectId}`
      }
    };
    
    return await this.sendToOpenClaw(message);
  }
  
  // Receive commands from OpenClaw
  async receiveOpenClawCommand(command: OpenClawCommand) {
    switch (command.action) {
      case 'create_project':
        return await this.createProjectFromOpenClaw(command.data);
      case 'get_status':
        return await this.getProjectStatus(command.projectId);
      case 'assign_task':
        return await this.assignTask(command.taskId, command.assigneeId);
    }
  }
  
  private getPort(): number {
    return process.env.NODE_ENV === 'production' ? 4000 : 3000;
  }
}
```

### 2. Tool Access Integration
```typescript
class OpenClawToolsIntegration {
  // Access OpenClaw tools from PM Dashboard agents
  async executeOpenClawTool(toolName: string, parameters: any) {
    const toolEndpoint = `${this.baseUrl}/api/tools/${toolName}`;
    
    const response = await fetch(toolEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getOpenClawToken()}`,
        'Content-Type': 'application/json',
        'X-Source': 'pm-dashboard'
      },
      body: JSON.stringify(parameters)
    });
    
    return response.json();
  }
  
  // Available tools from OpenClaw
  async getAvailableTools() {
    return await fetch(`${this.baseUrl}/api/tools`, {
      headers: { 'Authorization': `Bearer ${this.getOpenClawToken()}` }
    }).then(r => r.json());
  }
}
```

### 3. User Session Integration
```typescript
class UserSessionBridge {
  // Sync user context between systems
  async syncUserFromOpenClaw(openclawUserId: string) {
    const openclawUser = await this.fetchOpenClawUser(openclawUserId);
    
    // Create or update PM Dashboard user
    const pmUser = await this.createOrUpdatePMUser({
      openclawId: openclawUser.id,
      email: openclawUser.email,
      username: openclawUser.username,
      preferences: openclawUser.preferences,
      tailscaleInfo: openclawUser.tailscale
    });
    
    return pmUser;
  }
  
  // Share project access with OpenClaw users
  async shareProjectAccess(projectId: string, openclawUserId: string, role: string) {
    const pmUser = await this.syncUserFromOpenClaw(openclawUserId);
    return await this.addProjectMember(projectId, pmUser.id, role);
  }
}
```

## Development Preview System

### Automated Deployment Scripts

#### Development Deploy Script
```bash
#!/bin/bash
# dev-deploy.sh

set -e

echo "🚀 Deploying PM Dashboard - Development Environment"

# Stop existing dev services
pm2 stop pm-dashboard-dev-frontend pm-dashboard-dev-backend || true

# Build frontend
cd frontend
npm run build:dev
cd ..

# Build backend
cd backend
npm run build
cd ..

# Start services on dev ports
pm2 start ecosystem.dev.config.js

# Health check
sleep 5
curl -f https://hostingervps.barracuda-banfish.ts.net:3001/health || exit 1

echo "✅ Development environment deployed successfully!"
echo "🌐 Frontend: https://hostingervps.barracuda-banfish.ts.net:3000"
echo "🔧 Backend: https://hostingervps.barracuda-banfish.ts.net:3001"
```

#### Production Deploy Script
```bash
#!/bin/bash
# prod-deploy.sh

set -e

echo "🚀 Deploying PM Dashboard - Production Environment"

# Backup production database
./scripts/backup-prod-db.sh

# Run tests
npm run test:all

# Zero-downtime deployment
pm2 start ecosystem.prod.config.js --update-env

# Health check
sleep 10
curl -f https://hostingervps.barracuda-banfish.ts.net:4001/health || exit 1

echo "✅ Production environment deployed successfully!"
echo "🌐 Frontend: https://hostingervps.barracuda-banfish.ts.net:4000"
echo "🔧 Backend: https://hostingervps.barracuda-banfish.ts.net:4001"
```

### PM2 Ecosystem Configuration

#### Development Environment
```javascript
// ecosystem.dev.config.js
module.exports = {
  apps: [
    {
      name: 'pm-dashboard-dev-backend',
      script: './backend/dist/index.js',
      cwd: '/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        DATABASE_URL: 'sqlite:./data/dev/pm-dashboard-dev.sqlite',
        MONGODB_URL: 'mongodb://localhost:27017/pm-dashboard-dev',
        OPENCLAW_URL: 'https://hostingervps.barracuda-banfish.ts.net',
        TAILSCALE_HOSTNAME: 'hostingervps.barracuda-banfish.ts.net',
        FRONTEND_URL: 'https://hostingervps.barracuda-banfish.ts.net:3000'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'pm-dashboard-dev-frontend',
      script: 'serve',
      args: '-s frontend/dist -l 3000',
      cwd: '/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard',
      env: {
        NODE_ENV: 'development'
      },
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
```

#### Production Environment
```javascript
// ecosystem.prod.config.js
module.exports = {
  apps: [
    {
      name: 'pm-dashboard-prod-backend',
      script: './backend/dist/index.js',
      cwd: '/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        DATABASE_URL: 'sqlite:./data/prod/pm-dashboard.sqlite',
        MONGODB_URL: 'mongodb://localhost:27017/pm-dashboard-prod',
        OPENCLAW_URL: 'https://hostingervps.barracuda-banfish.ts.net',
        TAILSCALE_HOSTNAME: 'hostingervps.barracuda-banfish.ts.net',
        FRONTEND_URL: 'https://hostingervps.barracuda-banfish.ts.net:4000'
      },
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'pm-dashboard-prod-frontend',
      script: 'serve',
      args: '-s frontend/dist -l 4000',
      cwd: '/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
```

### Environment Switching Script
```bash
#!/bin/bash
# switch-env.sh

ENVIRONMENT=$1

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "Usage: ./switch-env.sh [dev|prod]"
    exit 1
fi

echo "🔄 Switching to $ENVIRONMENT environment..."

if [ "$ENVIRONMENT" = "dev" ]; then
    pm2 stop ecosystem.prod.config.js || true
    pm2 start ecosystem.dev.config.js
    echo "✅ Switched to Development environment"
    echo "🌐 URL: https://hostingervps.barracuda-banfish.ts.net:3000"
elif [ "$ENVIRONMENT" = "prod" ]; then
    pm2 stop ecosystem.dev.config.js || true  
    pm2 start ecosystem.prod.config.js
    echo "✅ Switched to Production environment"
    echo "🌐 URL: https://hostingervps.barracuda-banfish.ts.net:4000"
fi

pm2 list
```

## Security and Access Control

### Network Security
```typescript
// Network binding configuration
const networkConfig = {
  development: {
    frontend: {
      host: '100.x.x.x', // Tailscale IP only
      port: 3000
    },
    backend: {
      host: '100.x.x.x', // Tailscale IP only
      port: 3001,
      cors: {
        origin: 'https://hostingervps.barracuda-banfish.ts.net:3000',
        credentials: true
      }
    }
  },
  production: {
    frontend: {
      host: '100.x.x.x', // Tailscale IP only
      port: 4000
    },
    backend: {
      host: '100.x.x.x', // Tailscale IP only
      port: 4001,
      cors: {
        origin: 'https://hostingervps.barracuda-banfish.ts.net:4000',
        credentials: true
      }
    }
  }
};
```

### OpenClaw Authentication Bridge
```typescript
class OpenClawAuthBridge {
  // Validate user session with OpenClaw
  async validateOpenClawSession(sessionToken: string) {
    const response = await fetch(`${this.openclawUrl}/api/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'X-Source': 'pm-dashboard'
      }
    });
    
    if (response.ok) {
      return response.json();
    }
    
    throw new Error('Invalid OpenClaw session');
  }
  
  // Create PM Dashboard session from OpenClaw session
  async createPMSession(openclawUser: any) {
    const pmSession = {
      userId: openclawUser.id,
      username: openclawUser.username,
      permissions: this.mapOpenClawPermissions(openclawUser.permissions),
      tailscaleInfo: openclawUser.tailscale,
      source: 'openclaw'
    };
    
    return this.generatePMToken(pmSession);
  }
}
```

This integration architecture ensures complete isolation between systems while enabling seamless communication and shared functionality through well-defined APIs and messaging protocols.