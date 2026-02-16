# WebSocket Communication Protocol

## Overview

The OpenClaw Project Management Dashboard uses WebSocket connections for real-time communication between agents, frontend clients, and external systems. The protocol is designed for high performance, reliability, and extensibility.

## Protocol Specification

### Connection Management

#### Client Connection Flow
```
1. Client initiates WebSocket connection to /ws endpoint
2. Server validates authentication token
3. Server sends CONNECTION_ACK with session info
4. Client subscribes to relevant channels
5. Bidirectional message exchange begins
```

#### Authentication
```json
{
  "type": "AUTH",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "clientType": "frontend|agent|external",
  "version": "1.0.0"
}
```

#### Connection Acknowledgment
```json
{
  "type": "CONNECTION_ACK",
  "sessionId": "sess_abc123",
  "clientId": "client_xyz789",
  "serverTime": "2024-01-15T10:30:00Z",
  "permissions": ["read", "write", "admin"]
}
```

## Message Structure

### Base Message Format
```typescript
interface WebSocketMessage {
  id: string;                    // Unique message ID
  type: MessageType;             // Message type enum
  timestamp: string;             // ISO timestamp
  source: string;                // Source agent/client ID
  target?: string | string[];    // Target agent/client ID(s)
  channel?: string;              // Channel for broadcast messages
  correlationId?: string;        // For request/response correlation
  priority: MessagePriority;     // Message priority
  ttl?: number;                  // Time to live in seconds
  payload: any;                  // Message-specific data
  metadata?: Record<string, any>; // Optional metadata
}

enum MessageType {
  // Connection Management
  AUTH = 'auth',
  CONNECTION_ACK = 'connection_ack',
  PING = 'ping',
  PONG = 'pong',
  DISCONNECT = 'disconnect',
  
  // Agent Management
  AGENT_SPAWN = 'agent_spawn',
  AGENT_TERMINATE = 'agent_terminate',
  AGENT_STATUS = 'agent_status',
  AGENT_HEARTBEAT = 'agent_heartbeat',
  
  // Task Management
  TASK_CREATE = 'task_create',
  TASK_UPDATE = 'task_update',
  TASK_DELETE = 'task_delete',
  TASK_ASSIGN = 'task_assign',
  TASK_STATUS_CHANGE = 'task_status_change',
  
  // Project Management
  PROJECT_CREATE = 'project_create',
  PROJECT_UPDATE = 'project_update',
  PROJECT_STATUS_CHANGE = 'project_status_change',
  
  // Real-time Updates
  PROGRESS_UPDATE = 'progress_update',
  NOTIFICATION = 'notification',
  SYSTEM_ALERT = 'system_alert',
  
  // Communication
  AGENT_MESSAGE = 'agent_message',
  BROADCAST = 'broadcast',
  REQUEST = 'request',
  RESPONSE = 'response',
  
  // Subscription Management
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  CHANNEL_JOIN = 'channel_join',
  CHANNEL_LEAVE = 'channel_leave',
  
  // Error Handling
  ERROR = 'error',
  RETRY = 'retry'
}

enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}
```

## Communication Patterns

### 1. Request-Response Pattern

#### Request
```json
{
  "id": "req_abc123",
  "type": "request",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "frontend_client_1",
  "target": "orchestrator_agent",
  "correlationId": "corr_xyz789",
  "priority": 1,
  "ttl": 30,
  "payload": {
    "action": "create_project",
    "data": {
      "name": "New Project",
      "description": "Project description",
      "deadline": "2024-02-15T00:00:00Z"
    }
  }
}
```

#### Response
```json
{
  "id": "resp_def456",
  "type": "response",
  "timestamp": "2024-01-15T10:30:02Z",
  "source": "orchestrator_agent",
  "target": "frontend_client_1",
  "correlationId": "corr_xyz789",
  "priority": 1,
  "payload": {
    "status": "success",
    "data": {
      "projectId": "proj_123",
      "created": true
    }
  }
}
```

### 2. Publish-Subscribe Pattern

#### Subscribe to Channel
```json
{
  "id": "sub_abc123",
  "type": "subscribe",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "frontend_client_1",
  "priority": 1,
  "payload": {
    "channels": ["project.proj_123", "task.updates", "system.alerts"],
    "filters": {
      "project.proj_123": {
        "events": ["status_change", "progress_update"]
      }
    }
  }
}
```

#### Channel Broadcast
```json
{
  "id": "broadcast_def456",
  "type": "broadcast",
  "timestamp": "2024-01-15T10:30:05Z",
  "source": "progress_agent",
  "channel": "project.proj_123",
  "priority": 1,
  "payload": {
    "event": "progress_update",
    "data": {
      "projectId": "proj_123",
      "progress": 45.5,
      "completedTasks": 23,
      "totalTasks": 51,
      "estimatedCompletion": "2024-02-10T00:00:00Z"
    }
  }
}
```

### 3. Agent-to-Agent Communication

#### Direct Agent Message
```json
{
  "id": "agent_msg_123",
  "type": "agent_message",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "planning_agent",
  "target": "task_agent",
  "priority": 2,
  "payload": {
    "action": "create_task_breakdown",
    "data": {
      "projectId": "proj_123",
      "requirements": {
        "phases": ["design", "development", "testing", "deployment"],
        "constraints": ["budget", "timeline"]
      }
    }
  }
}
```

## Channel Management

### Channel Naming Convention
```
<domain>.<identifier>[.<event_type>]

Examples:
- project.proj_123              // All project events
- project.proj_123.status       // Project status changes only
- task.user_456                 // All tasks for user
- agent.orchestrator            // Agent-specific channel
- system.alerts                 // System-wide alerts
- team.team_789                 // Team-specific updates
```

### Subscription Management
```typescript
interface ChannelSubscription {
  clientId: string;
  channels: string[];
  filters: Record<string, ChannelFilter>;
  createdAt: Date;
  lastActivity: Date;
}

interface ChannelFilter {
  events?: string[];            // Specific event types
  priority?: MessagePriority;   // Minimum priority
  source?: string[];            // Specific sources
  metadata?: Record<string, any>; // Metadata filters
}
```

## Error Handling

### Error Message Format
```json
{
  "id": "error_abc123",
  "type": "error",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "websocket_gateway",
  "target": "frontend_client_1",
  "correlationId": "corr_xyz789",
  "priority": 2,
  "payload": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: projectId",
    "details": {
      "field": "projectId",
      "expectedType": "string",
      "received": null
    },
    "recoverable": true,
    "retryAfter": 1000
  }
}
```

### Error Codes
```typescript
enum ErrorCode {
  // Authentication Errors
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Message Errors
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_TARGET = 'INVALID_TARGET',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',
  
  // Channel Errors
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  SUBSCRIPTION_FAILED = 'SUBSCRIPTION_FAILED',
  CHANNEL_FULL = 'CHANNEL_FULL',
  
  // Agent Errors
  AGENT_UNAVAILABLE = 'AGENT_UNAVAILABLE',
  AGENT_OVERLOADED = 'AGENT_OVERLOADED',
  TASK_EXECUTION_FAILED = 'TASK_EXECUTION_FAILED',
  
  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}
```

## Quality of Service (QoS)

### Message Priority Handling
- **CRITICAL (3)**: Immediate delivery, bypass queues
- **HIGH (2)**: Priority queue, < 100ms target
- **NORMAL (1)**: Standard queue, < 1s target
- **LOW (0)**: Background queue, best effort

### Message Persistence
```typescript
interface MessagePersistence {
  enabled: boolean;
  durability: 'memory' | 'disk' | 'database';
  retentionPeriod: number;      // Days
  compressionEnabled: boolean;
}
```

### Delivery Guarantees
- **At-least-once**: Message delivered one or more times
- **At-most-once**: Message delivered zero or one time
- **Exactly-once**: Message delivered exactly once (for critical messages)

## Rate Limiting

### Rate Limit Configuration
```typescript
interface RateLimitConfig {
  messagesPerMinute: number;
  burstSize: number;
  windowSize: number;           // Seconds
  penaltyDuration: number;      // Seconds for temporary ban
}

// Default Limits by Client Type
const DEFAULT_RATE_LIMITS = {
  frontend: {
    messagesPerMinute: 120,
    burstSize: 10,
    windowSize: 60,
    penaltyDuration: 300
  },
  agent: {
    messagesPerMinute: 600,
    burstSize: 50,
    windowSize: 60,
    penaltyDuration: 60
  },
  external: {
    messagesPerMinute: 60,
    burstSize: 5,
    windowSize: 60,
    penaltyDuration: 600
  }
};
```

## Security Features

### Message Encryption
- **TLS 1.3**: All WebSocket connections encrypted in transit
- **End-to-End**: Sensitive payloads encrypted with client keys
- **Message Signing**: Critical messages signed with agent keys

### Access Control
```typescript
interface AccessControl {
  clientId: string;
  permissions: Permission[];
  channelAccess: ChannelAccess[];
  rateLimits: RateLimitConfig;
  ipWhitelist?: string[];
  expiresAt?: Date;
}

enum Permission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  AGENT_CONTROL = 'agent_control',
  SYSTEM_MONITOR = 'system_monitor'
}
```

## Monitoring & Metrics

### Connection Metrics
```typescript
interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  connectionsPerSecond: number;
  averageConnectionDuration: number;
  disconnectionReasons: Record<string, number>;
}
```

### Message Metrics
```typescript
interface MessageMetrics {
  messagesPerSecond: number;
  averageMessageSize: number;
  messageLatency: LatencyMetrics;
  errorRate: number;
  deliveryRate: number;
  messagesByType: Record<MessageType, number>;
}

interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}
```

## Implementation Examples

### WebSocket Gateway Server (Node.js)
```typescript
class WebSocketGateway {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection>;
  private channels: Map<string, Set<string>>;
  private messageQueue: PriorityQueue<WebSocketMessage>;
  
  constructor(config: GatewayConfig) {
    this.wss = new WebSocketServer({
      port: config.port,
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.setupEventHandlers();
    this.startMessageProcessor();
  }
  
  private async handleMessage(
    client: ClientConnection, 
    message: WebSocketMessage
  ): Promise<void> {
    // Rate limiting
    if (!this.checkRateLimit(client.id)) {
      await this.sendError(client.id, 'RATE_LIMIT_EXCEEDED');
      return;
    }
    
    // Message validation
    if (!this.validateMessage(message)) {
      await this.sendError(client.id, 'INVALID_MESSAGE_FORMAT');
      return;
    }
    
    // Route message based on type
    switch (message.type) {
      case MessageType.REQUEST:
        await this.routeToAgent(message);
        break;
      case MessageType.SUBSCRIBE:
        await this.handleSubscription(client.id, message);
        break;
      case MessageType.BROADCAST:
        await this.handleBroadcast(message);
        break;
      // ... other message types
    }
  }
  
  private async routeToAgent(message: WebSocketMessage): Promise<void> {
    const targetAgent = await this.findAgent(message.target);
    if (!targetAgent) {
      await this.sendError(message.source, 'AGENT_UNAVAILABLE');
      return;
    }
    
    await targetAgent.sendMessage(message);
  }
}
```

### Frontend WebSocket Client (TypeScript)
```typescript
class ProjectDashboardClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<MessageType, MessageHandler[]>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  async connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`wss://api.example.com/ws`);
      
      this.ws.onopen = () => {
        this.authenticate(token);
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.handleMessage(message);
      };
      
      this.ws.onclose = () => {
        this.scheduleReconnect();
      };
    });
  }
  
  async subscribeToProject(projectId: string): Promise<void> {
    const message: WebSocketMessage = {
      id: generateId(),
      type: MessageType.SUBSCRIBE,
      timestamp: new Date().toISOString(),
      source: this.clientId,
      priority: MessagePriority.NORMAL,
      payload: {
        channels: [`project.${projectId}`]
      }
    };
    
    this.send(message);
  }
}
```

This communication protocol provides a robust, scalable foundation for real-time multi-agent communication with comprehensive error handling, security, and monitoring capabilities.