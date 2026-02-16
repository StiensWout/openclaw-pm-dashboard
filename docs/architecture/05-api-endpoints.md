# API Endpoints Design

## Overview

The OpenClaw Project Management Dashboard API provides RESTful endpoints for frontend clients and webhook integrations, with WebSocket connections for real-time communication. All endpoints are accessible only via Tailscale network for enhanced security.

## Base Configuration

### Development Environment
```
Base URL: https://hostingervps.barracuda-banfish.ts.net:3001/api/v1
WebSocket: wss://hostingervps.barracuda-banfish.ts.net:3001/ws
Frontend: https://hostingervps.barracuda-banfish.ts.net:3000
```

### Production Environment  
```
Base URL: https://hostingervps.barracuda-banfish.ts.net:4001/api/v1
WebSocket: wss://hostingervps.barracuda-banfish.ts.net:4001/ws
Frontend: https://hostingervps.barracuda-banfish.ts.net:4000
```

### OpenClaw Integration
```
OpenClaw Gateway: https://hostingervps.barracuda-banfish.ts.net (port :18789)
Messaging API: https://hostingervps.barracuda-banfish.ts.net/api/messaging
```

### Authentication
- **JWT Bearer Tokens**: All requests require valid JWT tokens
- **Tailscale Node Authentication**: Additional verification using Tailscale node keys
- **Rate Limiting**: Per-client rate limiting based on Tailscale identity

## Core API Endpoints

### Authentication & Users

#### POST /auth/login
```json
{
  "email": "user@example.com",
  "password": "password123",
  "tailscaleNode": "node-key-xyz"  // Optional Tailscale node verification
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "member",
    "tailscaleUser": "user@tailnet.example.com"
  },
  "expiresAt": "2024-01-15T18:30:00Z"
}
```

#### POST /auth/refresh
```json
{
  "refreshToken": "refresh_token_here"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2024-01-15T18:30:00Z"
}
```

#### GET /auth/me
```json
Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "fullName": "John Doe",
  "role": "member",
  "tailscaleInfo": {
    "user": "user@tailnet.example.com",
    "nodeKey": "node-key-xyz",
    "ipAddress": "100.x.x.x"
  },
  "permissions": ["read", "write"]
}
```

### Projects

#### GET /projects
Query Parameters:
- `status`: Filter by status (planning, active, completed, etc.)
- `owner`: Filter by owner ID
- `team`: Filter by team ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (name, created_at, updated_at, progress)
- `order`: Sort order (asc, desc)

```json
Response:
{
  "projects": [
    {
      "id": "uuid",
      "name": "Project Alpha",
      "description": "Project description",
      "status": "active",
      "priority": "high",
      "progress": 65.5,
      "owner": {
        "id": "uuid",
        "username": "john_doe",
        "fullName": "John Doe"
      },
      "team": {
        "id": "uuid",
        "name": "Development Team"
      },
      "startDate": "2024-01-01",
      "endDate": "2024-03-31",
      "budget": 50000.00,
      "actualCost": 32500.00,
      "gsdCompliant": true,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-15T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### POST /projects
```json
{
  "name": "New Project",
  "description": "Project description",
  "priority": "medium",
  "teamId": "team-uuid",
  "startDate": "2024-02-01",
  "endDate": "2024-05-31",
  "budget": 75000.00,
  "gsdFramework": {
    "enabled": true,
    "phases": ["planning", "design", "development", "testing", "deployment"]
  },
  "tailscaleAccess": {
    "restrictedToNodes": ["node1", "node2"]  // Optional node restriction
  }
}

Response:
{
  "id": "new-project-uuid",
  "name": "New Project",
  "status": "planning",
  "createdAt": "2024-01-15T15:00:00Z",
  "agentAssignments": {
    "planningAgent": "planning-agent-uuid",
    "orchestratorAgent": "orchestrator-agent-uuid"
  }
}
```

#### GET /projects/:id
```json
Response:
{
  "id": "uuid",
  "name": "Project Alpha",
  "description": "Detailed project description",
  "status": "active",
  "priority": "high",
  "progress": 65.5,
  "owner": {...},
  "team": {...},
  "timeline": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "milestones": [
      {
        "id": "milestone-uuid",
        "name": "Phase 1 Complete",
        "date": "2024-01-31",
        "status": "completed"
      }
    ]
  },
  "budget": {
    "allocated": 50000.00,
    "spent": 32500.00,
    "remaining": 17500.00,
    "burnRate": 2500.00
  },
  "statistics": {
    "totalTasks": 45,
    "completedTasks": 28,
    "inProgressTasks": 12,
    "blockedTasks": 2,
    "velocity": 8.5,
    "estimatedCompletion": "2024-03-25T00:00:00Z"
  },
  "gsdFramework": {
    "enabled": true,
    "currentPhase": "development",
    "phases": [...],
    "compliance": 95.2
  }
}
```

#### PUT /projects/:id
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "active",
  "priority": "high",
  "endDate": "2024-04-15"
}

Response:
{
  "id": "uuid",
  "updatedFields": ["name", "description", "status", "priority", "endDate"],
  "updatedAt": "2024-01-15T15:30:00Z"
}
```

#### DELETE /projects/:id
```json
Response:
{
  "id": "uuid",
  "deleted": true,
  "deletedAt": "2024-01-15T15:45:00Z"
}
```

### Tasks

#### GET /projects/:projectId/tasks
Query Parameters:
- `status`: Filter by status
- `assignee`: Filter by assignee ID
- `priority`: Filter by priority
- `page`, `limit`, `sort`, `order`: Pagination and sorting

```json
Response:
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Implement user authentication",
      "description": "Task description",
      "status": "in_progress",
      "priority": "high",
      "progress": 75,
      "assignee": {
        "id": "uuid",
        "username": "jane_doe",
        "fullName": "Jane Doe"
      },
      "estimatedHours": 16,
      "actualHours": 12,
      "deadline": "2024-01-20T23:59:59Z",
      "dependencies": ["task-uuid-1", "task-uuid-2"],
      "tags": ["backend", "security", "auth"],
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-15T14:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### POST /projects/:projectId/tasks
```json
{
  "title": "New Task",
  "description": "Task description",
  "priority": "medium",
  "assigneeId": "user-uuid",
  "estimatedHours": 8,
  "deadline": "2024-01-25T23:59:59Z",
  "tags": ["frontend", "ui"],
  "dependencies": ["parent-task-uuid"]
}

Response:
{
  "id": "new-task-uuid",
  "title": "New Task",
  "status": "not_started",
  "createdAt": "2024-01-15T16:00:00Z",
  "agentNotifications": {
    "taskAgent": "notified",
    "assigneeNotified": true
  }
}
```

#### PUT /tasks/:id
```json
{
  "status": "completed",
  "actualHours": 10,
  "progress": 100
}

Response:
{
  "id": "uuid",
  "status": "completed",
  "completedAt": "2024-01-15T16:30:00Z",
  "triggeredEvents": ["task_completed", "project_progress_updated"]
}
```

### Agent Management

#### GET /agents
```json
Response:
{
  "agents": [
    {
      "id": "uuid",
      "name": "Planning Agent",
      "type": "planning",
      "status": "active",
      "version": "1.0.0",
      "capabilities": ["planning", "analysis", "scheduling"],
      "tailscaleInfo": {
        "nodeKey": "agent-node-key",
        "ipAddress": "100.x.x.x",
        "connectivity": "connected",
        "lastSeen": "2024-01-15T16:25:00Z"
      },
      "performance": {
        "uptime": 99.8,
        "tasksCompleted": 1250,
        "averageResponseTime": 0.35,
        "errorRate": 0.02
      },
      "currentLoad": {
        "activeTasks": 3,
        "queuedTasks": 7,
        "utilizationPercent": 65
      },
      "lastHeartbeat": "2024-01-15T16:25:00Z"
    }
  ]
}
```

#### POST /agents/spawn
```json
{
  "type": "task",
  "name": "Task Agent 2",
  "config": {
    "maxConcurrentTasks": 10,
    "specializations": ["backend", "database"]
  },
  "tailscaleConfig": {
    "preferredNode": "compute-node-1",
    "accessTags": ["agent", "task-management"]
  }
}

Response:
{
  "id": "new-agent-uuid",
  "status": "initializing",
  "estimatedReadyTime": "2024-01-15T16:35:00Z",
  "tailscaleAssignment": {
    "nodeKey": "new-agent-node-key",
    "ipAddress": "100.x.x.y"
  }
}
```

#### POST /agents/:id/tasks
```json
{
  "taskType": "analyze_project",
  "priority": 2,
  "payload": {
    "projectId": "project-uuid",
    "analysisType": "risk_assessment",
    "parameters": {
      "includeTimeline": true,
      "includeResources": true
    }
  },
  "maxRetries": 3,
  "timeoutSeconds": 300
}

Response:
{
  "taskId": "agent-task-uuid",
  "status": "queued",
  "estimatedStartTime": "2024-01-15T16:32:00Z"
}
```

#### GET /agents/:id/tasks/:taskId
```json
Response:
{
  "id": "agent-task-uuid",
  "status": "completed",
  "progress": 100,
  "result": {
    "riskLevel": "medium",
    "identifiedRisks": [
      {
        "category": "timeline",
        "description": "Dependency on external API",
        "impact": "medium",
        "probability": "high",
        "mitigation": "Implement fallback solution"
      }
    ],
    "recommendations": [...]
  },
  "executionTime": 45.2,
  "completedAt": "2024-01-15T16:37:00Z"
}
```

### Real-time Updates & WebSocket

#### WebSocket Connection
```javascript
// Development environment WebSocket connection
const isDev = process.env.NODE_ENV === 'development';
const wsPort = isDev ? '3001' : '4001';
const wsUrl = `wss://hostingervps.barracuda-banfish.ts.net:${wsPort}/ws`;

const ws = new WebSocket(wsUrl, [], {
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'X-Tailscale-Node': nodeKey
  }
});

// Subscribe to project updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['project.uuid', 'task.updates', 'agent.status']
}));

// Production WebSocket client example
class PMDashboardWebSocketClient {
  constructor(environment = 'development') {
    this.wsPort = environment === 'production' ? '4001' : '3001';
    this.wsUrl = `wss://hostingervps.barracuda-banfish.ts.net:${this.wsPort}/ws`;
  }
  
  connect(token) {
    this.ws = new WebSocket(this.wsUrl, [], {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-PM-Dashboard-Client': 'frontend'
      }
    });
    
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
    });
  }
}
```

#### Real-time Event Types
```json
// Task status change
{
  "type": "task_status_change",
  "channel": "project.uuid",
  "data": {
    "taskId": "task-uuid",
    "oldStatus": "in_progress",
    "newStatus": "completed",
    "assignee": "user-uuid",
    "completedAt": "2024-01-15T17:00:00Z"
  }
}

// Project progress update
{
  "type": "project_progress_update",
  "channel": "project.uuid",
  "data": {
    "projectId": "project-uuid",
    "progress": 68.5,
    "completedTasks": 31,
    "totalTasks": 45,
    "velocity": 9.2,
    "estimatedCompletion": "2024-03-20T00:00:00Z"
  }
}

// Agent status change
{
  "type": "agent_status_change",
  "channel": "agent.status",
  "data": {
    "agentId": "agent-uuid",
    "oldStatus": "busy",
    "newStatus": "active",
    "currentLoad": 45,
    "tailscaleConnectivity": "connected"
  }
}
```

### Reports & Analytics

#### GET /projects/:id/reports/progress
Query Parameters:
- `period`: Time period (day, week, month, quarter)
- `startDate`, `endDate`: Custom date range

```json
Response:
{
  "projectId": "uuid",
  "period": "month",
  "data": {
    "overall": {
      "progress": 65.5,
      "velocity": 8.5,
      "burndownRate": 2.3,
      "efficiencyScore": 87.2
    },
    "timeline": [
      {
        "date": "2024-01-01",
        "progress": 0,
        "tasksCompleted": 0,
        "hoursSpent": 0
      },
      {
        "date": "2024-01-15",
        "progress": 65.5,
        "tasksCompleted": 28,
        "hoursSpent": 420
      }
    ],
    "milestones": [
      {
        "name": "Phase 1",
        "scheduledDate": "2024-01-31",
        "actualDate": "2024-01-29",
        "status": "completed",
        "variance": -2
      }
    ]
  },
  "generatedAt": "2024-01-15T17:15:00Z",
  "generatedBy": "progress-agent-uuid"
}
```

#### GET /reports/dashboard
```json
Response:
{
  "summary": {
    "totalProjects": 25,
    "activeProjects": 18,
    "completedProjects": 6,
    "overdueTasks": 12,
    "criticalIssues": 3
  },
  "metrics": {
    "averageProjectProgress": 72.3,
    "teamVelocity": 156.8,
    "budgetUtilization": 67.4,
    "resourceUtilization": 83.2
  },
  "recentActivity": [
    {
      "type": "project_completed",
      "projectName": "Website Redesign",
      "timestamp": "2024-01-15T16:45:00Z"
    }
  ],
  "upcomingDeadlines": [
    {
      "type": "task",
      "title": "Database Migration",
      "deadline": "2024-01-18T23:59:59Z",
      "project": "Infrastructure Upgrade"
    }
  ]
}
```

### OpenClaw Integration

#### POST /integrations/openclaw/message
```json
{
  "channel": "project-updates",
  "message": "Project Alpha has reached 75% completion! 🎉",
  "messageType": "announcement",
  "metadata": {
    "projectId": "project-uuid",
    "milestone": "Phase 2 Complete"
  }
}

Response:
{
  "messageId": "openclaw-msg-uuid",
  "delivered": true,
  "deliveredAt": "2024-01-15T17:30:00Z"
}
```

#### GET /integrations/openclaw/status
```json
Response:
{
  "connected": true,
  "lastSync": "2024-01-15T17:25:00Z",
  "messageQueue": 3,
  "configuration": {
    "channels": ["project-updates", "alerts", "notifications"],
    "autoNotifications": true,
    "dailyDigest": true
  },
  "tailscaleRoute": {
    "openclawNode": "openclaw-main",
    "latency": 12.5,
    "connectivity": "optimal"
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "deadline",
      "reason": "Date must be in the future"
    },
    "requestId": "req-uuid",
    "timestamp": "2024-01-15T17:45:00Z"
  }
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate resource)
- **429**: Rate Limited
- **500**: Internal Server Error
- **503**: Service Unavailable (agent offline)

## Security Headers

All responses include security headers for Tailscale environment:
```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Tailscale-Node: verified
X-Rate-Limit-Remaining: 995
X-Rate-Limit-Reset: 1642269600
```

## Rate Limiting

### Rate Limits by Endpoint Type
```javascript
{
  "read": {
    "requests": 1000,
    "window": "15m",
    "burst": 20
  },
  "write": {
    "requests": 200,
    "window": "15m", 
    "burst": 5
  },
  "agent": {
    "requests": 5000,
    "window": "15m",
    "burst": 100
  }
}
```

This API design provides comprehensive functionality for the multi-agent project management system with proper security, rate limiting, and Tailscale integration.