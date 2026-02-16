# 📡 OpenClaw PM Dashboard - API Documentation

## 🔗 Base URL
- **Development**: `https://hostingervps.barracuda-banfish.ts.net:3001`
- **Production**: `https://hostingervps.barracuda-banfish.ts.net:4001`

## 🔍 System Endpoints

### Health Check
```http
GET /health
```

**Response:**
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
```http
GET /api/status
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-16T16:08:34.606Z",
  "version": "0.1.0",
  "environment": "development",
  "uptime": 22.498169497,
  "memory": {
    "rss": 70438912,
    "heapTotal": 13877248,
    "heapUsed": 12061744,
    "external": 2403960,
    "arrayBuffers": 27515
  },
  "endpoints": [
    "GET /api/status",
    "GET /api/agents",
    "POST /api/agents",
    "GET /api/projects",
    "POST /api/projects",
    "GET /api/tasks",
    "POST /api/tasks",
    "GET /api/communications",
    "GET /api/analytics/*"
  ]
}
```

### Tailscale Status
```http
GET /tailscale/status
```

## 🤖 Agent Management

### List Agents
```http
GET /api/agents?status=active&type=backend&limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "agent-123",
      "name": "Backend Developer",
      "type": "backend",
      "status": "active",
      "capabilities": ["typescript", "express", "database"],
      "currentTask": "task-456",
      "socketId": "socket-789",
      "lastActivity": "2026-02-16T16:08:00.000Z",
      "performance": {
        "tasksCompleted": 15,
        "averageTaskTime": 45.5,
        "successRate": 95.2,
        "lastTaskCompletionTime": "2026-02-16T15:30:00.000Z",
        "errorCount": 1
      },
      "createdAt": "2026-02-16T10:00:00.000Z",
      "updatedAt": "2026-02-16T16:05:00.000Z"
    }
  ],
  "timestamp": "2026-02-16T16:08:37.052Z"
}
```

### Get Agent
```http
GET /api/agents/{id}
```

### Create Agent
```http
POST /api/agents
Content-Type: application/json

{
  "name": "Frontend Developer",
  "type": "frontend",
  "capabilities": ["react", "typescript", "ui/ux"]
}
```

### Update Agent
```http
PUT /api/agents/{id}
Content-Type: application/json

{
  "status": "busy",
  "currentTask": "task-789"
}
```

### Delete Agent
```http
DELETE /api/agents/{id}
```

### Agent Statistics
```http
GET /api/agents/stats
```

### Assign Task to Agent
```http
POST /api/agents/{id}/assign-task
Content-Type: application/json

{
  "taskId": "task-456"
}
```

## 📋 Project Management

### List Projects
```http
GET /api/projects?status=active&priority=high&limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "project-123",
      "name": "OpenClaw Dashboard",
      "description": "Multi-agent project management dashboard",
      "status": "active",
      "priority": "high",
      "assignedAgents": ["agent-123", "agent-456"],
      "tasks": ["task-789", "task-101"],
      "progress": 75.5,
      "startDate": "2026-02-16T10:00:00.000Z",
      "dueDate": "2026-02-20T18:00:00.000Z",
      "completedDate": null,
      "createdAt": "2026-02-16T10:00:00.000Z",
      "updatedAt": "2026-02-16T16:00:00.000Z",
      "metadata": {
        "repository": "openclaw-pm-dashboard",
        "technology": "react-express"
      }
    }
  ],
  "timestamp": "2026-02-16T16:08:37.052Z"
}
```

### Get Project
```http
GET /api/projects/{id}
```

### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "name": "New Feature Development",
  "description": "Implementing analytics dashboard",
  "priority": "medium",
  "assignedAgents": ["agent-123"],
  "dueDate": "2026-02-25T18:00:00.000Z",
  "metadata": {
    "repository": "feature-branch",
    "estimatedHours": 40
  }
}
```

### Update Project
```http
PUT /api/projects/{id}
Content-Type: application/json

{
  "status": "completed",
  "progress": 100
}
```

### Delete Project
```http
DELETE /api/projects/{id}?force=true
```

### Project Statistics
```http
GET /api/projects/stats
```

### Create Task for Project
```http
POST /api/projects/{id}/tasks
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "priority": "high",
  "dependencies": ["task-database-setup"],
  "estimatedDuration": 120,
  "dueDate": "2026-02-18T18:00:00.000Z"
}
```

### Project Timeline
```http
GET /api/projects/{id}/timeline
```

## ✅ Task Management

### List Tasks
```http
GET /api/tasks?status=pending&projectId=project-123&assignedAgentId=agent-456&priority=high&limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-123",
      "projectId": "project-456",
      "title": "Setup Database Schema",
      "description": "Create SQLite tables for agents, projects, tasks",
      "status": "completed",
      "priority": "high",
      "assignedAgentId": "agent-789",
      "dependencies": [],
      "estimatedDuration": 60,
      "actualDuration": 45,
      "startedAt": "2026-02-16T14:00:00.000Z",
      "completedAt": "2026-02-16T14:45:00.000Z",
      "dueDate": "2026-02-16T16:00:00.000Z",
      "createdAt": "2026-02-16T10:00:00.000Z",
      "updatedAt": "2026-02-16T14:45:00.000Z",
      "metadata": {
        "difficulty": "medium",
        "technologies": ["sqlite", "sql"]
      }
    }
  ],
  "timestamp": "2026-02-16T16:08:37.052Z"
}
```

### Update Task
```http
PUT /api/tasks/{id}
Content-Type: application/json

{
  "status": "in_progress",
  "assignedAgentId": "agent-123",
  "metadata": {
    "startedBy": "auto-assignment",
    "notes": "Task automatically started"
  }
}
```

## 💬 Communications

### List Messages
```http
GET /api/communications?type=coordination&fromAgentId=agent-123&toAgentId=agent-456&projectId=project-789&limit=100&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "comm-123",
      "fromAgentId": "agent-456",
      "toAgentId": "agent-789",
      "type": "task_assignment",
      "message": "Task assigned: Setup Database Schema",
      "metadata": {
        "taskId": "task-123",
        "priority": "high"
      },
      "timestamp": "2026-02-16T14:00:00.000Z",
      "read": true,
      "projectId": "project-456",
      "taskId": "task-123"
    }
  ],
  "timestamp": "2026-02-16T16:08:37.052Z"
}
```

## 📊 Analytics & Reports

### Dashboard Overview
```http
GET /api/analytics/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": {
      "byStatus": {
        "active_backend": {
          "count": 2,
          "avgSuccessRate": 95.5,
          "totalTasksCompleted": 45
        },
        "busy_frontend": {
          "count": 1,
          "avgSuccessRate": 92.0,
          "totalTasksCompleted": 12
        }
      }
    },
    "projects": {
      "byStatus": {
        "active_high": {
          "count": 3,
          "avgProgress": 75.2
        },
        "completed_medium": {
          "count": 8,
          "avgProgress": 100
        }
      }
    },
    "tasks": {
      "byStatus": {
        "completed_high": {
          "count": 25,
          "avgDuration": 45.5
        },
        "in_progress_medium": {
          "count": 8,
          "avgDuration": 30.0
        }
      }
    },
    "recentActivity": [
      {
        "type": "task",
        "name": "Implement WebSocket",
        "status": "completed",
        "timestamp": "2026-02-16T15:45:00.000Z"
      },
      {
        "type": "project",
        "name": "Backend Development",
        "status": "active",
        "timestamp": "2026-02-16T15:30:00.000Z"
      }
    ]
  },
  "timestamp": "2026-02-16T16:08:37.052Z"
}
```

### Performance Metrics
```http
GET /api/analytics/performance?period=7d
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "taskCompletion": [
      {
        "date": "2026-02-16",
        "status": "completed",
        "count": 12
      },
      {
        "date": "2026-02-16",
        "status": "failed",
        "count": 1
      }
    ],
    "agentPerformance": [
      {
        "name": "Backend Developer",
        "type": "backend",
        "success_rate": 95.5,
        "tasks_completed": 25,
        "error_count": 1,
        "recent_tasks": 8
      }
    ],
    "projectProgress": [
      {
        "name": "OpenClaw Dashboard",
        "status": "active",
        "progress": 85.0,
        "last_updated": "2026-02-16",
        "status_flag": "on_track"
      }
    ]
  },
  "timestamp": "2026-02-16T16:08:37.052Z"
}
```

## 🔌 WebSocket Events

### Connection URL
```
wss://hostingervps.barracuda-banfish.ts.net:3001
```

### Client → Server Events

#### Agent Registration
```javascript
socket.emit('agent_register', {
  id: 'agent-123',
  name: 'Backend Developer', 
  type: 'backend',
  capabilities: ['typescript', 'express', 'database']
});
```

#### Agent Status Update
```javascript
socket.emit('agent_status', {
  status: 'busy',
  currentTask: 'task-456',
  progress: 75
});
```

#### Task Update
```javascript
socket.emit('task_update', {
  taskId: 'task-123',
  status: 'completed',
  progress: 100,
  metadata: { duration: 45 }
});
```

#### Inter-Agent Message
```javascript
socket.emit('agent_message', {
  toAgentId: 'agent-456',
  type: 'coordination',
  message: 'Task dependencies resolved',
  projectId: 'project-123',
  taskId: 'task-789'
});
```

#### Request User Input
```javascript
socket.emit('request_user_input', {
  context: 'Database schema design',
  question: 'Should we use UUID or auto-increment IDs?'
});
```

### Server → Client Events

#### Initial Data
```javascript
socket.on('initial_data', (data) => {
  console.log('Agents:', data.agents);
  console.log('Projects:', data.projects);
  console.log('Tasks:', data.tasks);
});
```

#### Agent Updates
```javascript
socket.on('agent_update', (update) => {
  console.log('Agent update:', update.type, update.agent);
});
```

#### Task Updates
```javascript
socket.on('task_update', (update) => {
  console.log('Task update:', update.type, update.task);
});
```

#### Project Updates
```javascript
socket.on('project_update', (update) => {
  console.log('Project update:', update.type, update.project);
});
```

## 🔐 Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Resource not found",
  "timestamp": "2026-02-16T16:08:37.052Z"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## 🔄 Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 attempts | 15 minutes |
| Project Operations | 10 operations | 5 minutes |
| Task Operations | 50 operations | 5 minutes |
| Agent Operations | 100 updates | 1 minute |
| WebSocket Events | 1000 events | 1 minute |

## 🧪 Testing Examples

### cURL Examples
```bash
# Health check
curl https://hostingervps.barracuda-banfish.ts.net:3001/health

# List agents
curl https://hostingervps.barracuda-banfish.ts.net:3001/api/agents

# Create project
curl -X POST https://hostingervps.barracuda-banfish.ts.net:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Testing API"}'

# Update task
curl -X PUT https://hostingervps.barracuda-banfish.ts.net:3001/api/tasks/task-123 \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

### JavaScript Client Example
```javascript
// REST API
const response = await fetch('https://hostingervps.barracuda-banfish.ts.net:3001/api/agents');
const data = await response.json();

// WebSocket
const socket = io('https://hostingervps.barracuda-banfish.ts.net:3001');
socket.on('connect', () => {
  socket.emit('agent_register', {
    name: 'Test Agent',
    type: 'testing',
    capabilities: ['automation']
  });
});
```

---

📚 **Complete API documentation for OpenClaw PM Dashboard Backend**

For more details, see:
- [Backend README](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Database Schema](./src/database/init.ts)