# OpenClaw Multi-Agent Dashboard - Frontend

Modern React 19 frontend for managing and monitoring OpenClaw agents with real-time updates via WebSocket.

## 🚀 Features

- **Real-time Agent Monitoring** - Live status updates and performance metrics
- **Interactive Kanban Board** - Drag & drop task management
- **Agent Communication Panel** - Real-time message streaming
- **Performance Analytics** - CPU, memory, and response time charts  
- **Task Assignment Interface** - Create and assign tasks to agents
- **Dark Theme UI** - OpenClaw aesthetic with modern design
- **Responsive Design** - Works on desktop, tablet, and mobile
- **WebSocket Integration** - Real-time bidirectional communication

## 🛠 Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Socket.IO Client** for WebSocket communication
- **Lucide React** for icons
- **React Router Dom** for navigation

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── Layout.tsx       # Main layout with navigation
│   │   ├── Dashboard.tsx    # Main dashboard orchestrator
│   │   ├── AgentStatusDashboard.tsx  # Agent monitoring
│   │   ├── MessagePanel.tsx # Real-time communications
│   │   ├── KanbanBoard.tsx  # Project management
│   │   ├── TaskAssignment.tsx       # Task creation modal
│   │   └── AgentMetrics.tsx # Performance analytics
│   ├── hooks/
│   │   └── useWebSocket.ts  # WebSocket connection hook
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── config/
│   │   └── api.ts           # API configuration
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   ├── App.tsx              # Main app with routing
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── .env.development         # Development environment
├── .env.production          # Production environment  
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
└── package.json             # Dependencies and scripts
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build (port 4000)
npm run preview
```

## 🌐 Environment Configuration

### Development (Local)
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_NODE_ENV=development
```

### Production (Tailscale Private Network)
```env
VITE_API_URL=https://hostingervps.barracuda-banfish.ts.net:4001
VITE_WS_URL=wss://hostingervps.barracuda-banfish.ts.net:4001
VITE_NODE_ENV=production
```

## 🔌 API Integration

The frontend connects to the backend API and WebSocket server:

### HTTP Endpoints
- `GET /api/agents` - Fetch agent list
- `GET /api/tasks` - Fetch tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `GET /api/messages` - Fetch message history

### WebSocket Events

**Incoming Events:**
- `agent-status` - Agent status updates
- `task-update` - Task status changes
- `message` - New agent communications
- `metrics` - Performance metrics
- `project-update` - Project changes

**Outgoing Events:**
- `subscribe-agent` - Subscribe to agent updates
- `task-assign` - Assign task to agent
- `send-message` - Send message to agent

## 🎨 UI Components

### AgentStatusDashboard
Displays real-time agent monitoring with:
- Agent cards showing status, performance, and capabilities
- Status indicators (online/offline/working/error)
- Performance metrics (tasks completed, uptime, error rate)
- Current task information

### KanbanBoard  
Interactive project management with:
- Drag & drop task movement between columns
- Task cards with priority, assignee, and due dates
- Progress tracking and filtering
- Real-time updates from WebSocket

### MessagePanel
Real-time communication center with:
- Agent-to-agent message streaming
- System notifications and alerts
- Message filtering by type and agent
- Search functionality

### AgentMetrics
Performance analytics featuring:
- Response time charts
- CPU and memory usage graphs  
- Task queue monitoring
- Historical performance data

### TaskAssignment
Task creation and assignment with:
- Form validation and error handling
- Agent selection based on capabilities
- Priority and due date setting
- Tag-based categorization

## 🚀 Deployment

### Development Preview
```bash
npm run dev
# Access at http://localhost:3000
```

### Production Preview
```bash
npm run build
npm run preview  
# Access at http://localhost:4000
```

### Tailscale Network Access
The application is configured for private Tailscale network deployment:
- **Dev URL:** `http://hostingervps.barracuda-banfish.ts.net:3000`
- **Prod URL:** `http://hostingervps.barracuda-banfish.ts.net:4000`

## ⚠️ Port Configuration

**Avoiding OpenClaw Conflicts:**
- OpenClaw dashboard uses port 18789 ❌
- Our dashboard uses ports 3000 (dev) and 4000 (prod) ✅
- API calls go to port 3001 (dev) / 4001 (prod)

## 🔄 Real-time Updates

The dashboard uses WebSocket connections for real-time updates:

1. **Connection Management** - Auto-reconnect with exponential backoff
2. **Event Handling** - Type-safe message processing  
3. **State Synchronization** - Automatic UI updates from server events
4. **Error Recovery** - Graceful handling of connection failures

## 🎯 Key Features

### Agent Monitoring
- Real-time status indicators
- Performance metrics tracking
- Capability-based filtering
- Historical activity logs

### Task Management  
- Kanban-style board interface
- Drag & drop task organization
- Priority and deadline management
- Agent workload balancing

### Communication Hub
- Agent-to-agent message relay
- System notification center
- Message search and filtering
- Real-time delivery status

### Analytics Dashboard
- Performance trend analysis
- Resource usage monitoring
- Task completion metrics
- System health indicators

## 🔧 Customization

### Theme Configuration
Edit `tailwind.config.js` to customize the OpenClaw dark theme:

```javascript
theme: {
  extend: {
    colors: {
      openclaw: {
        primary: '#3b82f6',    // Primary blue
        secondary: '#8b5cf6',  // Purple accent  
        accent: '#06d6a0',     // Green success
      }
    }
  }
}
```

### Component Styling
All components use Tailwind CSS classes with custom design tokens for consistent theming.

## 🐛 Troubleshooting

### WebSocket Connection Issues
- Check backend server is running on correct port
- Verify environment variables are set correctly
- Ensure no firewall blocking WebSocket connections

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility (18+)
- Verify all environment variables are properly set

### Tailscale Access Issues  
- Ensure Tailscale is running and connected
- Check network permissions for Tailscale IPs
- Verify backend is accessible via Tailscale hostname

## 📝 Development Notes

- Uses mock data for demonstration when backend is unavailable
- WebSocket auto-reconnects with exponential backoff
- Responsive design works on mobile devices
- TypeScript strict mode enabled for type safety
- ESLint configured for code quality

---

**Built for OpenClaw Multi-Agent System** 🤖⚡