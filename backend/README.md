# OpenClaw PM Dashboard Backend

Express.js + TypeScript + Socket.IO backend for the OpenClaw Multi-Agent Project Management Dashboard.

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

Server will start on port **3001** (development) accessible via:
- Local: http://localhost:3001
- Tailscale: https://hostingervps.barracuda-banfish.ts.net:3001

### Production Preview
```bash
npm run preview
```

Server will start on port **4001** (production) accessible via:
- Tailscale: https://hostingervps.barracuda-banfish.ts.net:4001

## ⚙️ Configuration

### Port Configuration
- **Development**: Port 3001 (frontend dev: 3000)
- **Production**: Port 4001 (frontend: 4000)
- **Avoids OpenClaw Gateway**: Port 18789 (DO NOT USE)

### Environment Variables
Copy `.env.example` to `.env` and configure:
- `TAILSCALE_INTERFACE`: Tailscale hostname
- `OPENCLAW_NOTIFICATIONS`: Enable/disable OpenClaw messaging
- `DB_PATH`: SQLite database file location

## 🔧 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run preview` - Build and start production preview
- `npm run db:init` - Initialize database tables
- `npm run test` - Run tests
- `npm run lint` - Lint TypeScript code

## 🌐 API Endpoints

### Core Resources
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

- `GET /api/tasks` - List tasks
- `PUT /api/tasks/:id` - Update task

### Analytics & Monitoring
- `GET /api/analytics/overview` - Dashboard overview
- `GET /api/analytics/performance` - Performance metrics
- `GET /health` - Health check
- `GET /tailscale/status` - Tailscale status

## 🔌 WebSocket Events

### Client → Server
- `agent_register` - Register new agent
- `agent_status` - Update agent status
- `task_update` - Update task progress
- `project_update` - Update project status
- `agent_message` - Send inter-agent message
- `request_user_input` - Request user input

### Server → Client
- `initial_data` - Initial dashboard data
- `agent_update` - Agent status changed
- `task_update` - Task status changed
- `project_update` - Project status changed
- `agent_message` - New inter-agent message
- `user_input_request` - User input needed

## 🗄️ Database Schema

SQLite database with tables:
- **agents** - Agent registry and performance
- **projects** - Project management
- **tasks** - Task tracking
- **communications** - Inter-agent messaging

## 🔐 Security Features

- **Tailscale-only access** - No public internet exposure
- **Rate limiting** - Per-endpoint request limits
- **CORS protection** - Restricted origins
- **Input validation** - Request validation
- **Error handling** - Comprehensive error management

## 📡 OpenClaw Integration

### Notifications
Automatic notifications sent to Wout via OpenClaw messaging:
- Agent status changes (errors, disconnections)
- Project completions and updates
- Task failures and completions
- System events and errors
- User input requests

### Messaging Channels
- **Primary**: WhatsApp (default)
- **Fallback**: File-based notifications in `memory/`

## 🔄 Development Workflow

1. **Start Backend**: `npm run dev` (port 3001)
2. **Start Frontend**: `cd ../frontend && npm run dev` (port 3000)
3. **Access Dashboard**: http://localhost:3000
4. **View API**: http://localhost:3001/api/status
5. **Monitor Logs**: Watch console output

## 🌍 Tailscale Network

### Access URLs
- **Development**: https://hostingervps.barracuda-banfish.ts.net:3001
- **Production**: https://hostingervps.barracuda-banfish.ts.net:4001

### Network Security
- Server binds to `0.0.0.0` but accessible only via Tailscale
- No public internet access
- Private network isolation

## 📊 Monitoring

### Health Checks
- `GET /health` - Basic server health
- `GET /tailscale/status` - Network status
- Real-time agent connection monitoring

### Performance Metrics
- Agent success rates and task completion
- Project progress tracking
- Task duration analysis
- System resource usage

## 🛠️ Development Notes

- **TypeScript**: Strict mode enabled
- **Database**: SQLite with foreign keys enabled
- **Hot Reload**: TypeScript files watched
- **Error Logging**: Comprehensive error tracking
- **Rate Limiting**: Per-IP and per-endpoint limits

## 🚨 Important: Port Conflicts

**DO NOT USE PORT 18789** - Reserved for OpenClaw Gateway

Use these ports:
- Development backend: **3001**
- Production backend: **4001**
- Development frontend: **3000**
- Production frontend: **4000**

## 📝 Deployment

### Quick Deploy
```bash
npm run deploy:preview
```

### Stop Service
```bash
npm run stop:preview
```

### Manual Deploy
```bash
npm run build:prod
NODE_ENV=production PORT=4001 node dist/server.js
```