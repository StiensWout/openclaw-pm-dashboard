# Database Schema Design

## Overview

The OpenClaw Project Management Dashboard uses a hybrid database approach with SQLite for relational data and MongoDB for document storage and agent state management. This ensures complete isolation from OpenClaw's database while maintaining high performance and simplicity. All databases are accessible only via Tailscale network for enhanced security.

## Database Isolation Strategy

### File Structure
```
/home/wout/.openclaw/workspace/dev/openclaw-pm-dashboard/
├── data/
│   ├── dev/
│   │   ├── pm-dashboard-dev.sqlite         # Development SQLite database
│   │   ├── pm-dashboard-dev-mongo/         # Development MongoDB data
│   │   └── backups/                        # Development backups
│   └── prod/
│       ├── pm-dashboard.sqlite             # Production SQLite database
│       ├── pm-dashboard-mongo/             # Production MongoDB data
│       └── backups/                        # Production backups
```

## SQLite Schema (Relational Data)

### Core Tables

#### projects
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    owner_id TEXT NOT NULL REFERENCES users(id),
    team_id TEXT REFERENCES teams(id),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    actual_cost DECIMAL(12,2) DEFAULT 0,
    progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    gsd_compliant INTEGER DEFAULT 0,
    tailscale_accessible INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL
);

-- Indexes for performance
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
```

#### tasks
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id TEXT REFERENCES tasks(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'cancelled', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assignee_id TEXT REFERENCES users(id),
    creator_id TEXT NOT NULL REFERENCES users(id),
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2) DEFAULT 0,
    deadline DATETIME,
    completed_at DATETIME,
    progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL
);

-- Indexes for performance
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
```

#### users
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    tailscale_user TEXT, -- Tailscale user identifier
    tailscale_node_key TEXT, -- Associated Tailscale node
    preferences TEXT DEFAULT '{}', -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    deleted_at DATETIME NULL
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_tailscale_user ON users(tailscale_user);
CREATE INDEX idx_users_role ON users(role);
```

#### teams
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_lead_id UUID REFERENCES users(id),
    tailscale_acl_tags TEXT[], -- Tailscale ACL tags for team access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role team_member_role_enum NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

CREATE TYPE team_member_role_enum AS ENUM ('lead', 'member', 'contributor');
```

#### task_dependencies
```sql
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type dependency_type_enum NOT NULL DEFAULT 'finish_to_start',
    lag_hours DECIMAL(6,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, depends_on_id),
    CHECK (task_id != depends_on_id) -- Prevent self-dependency
);

CREATE TYPE dependency_type_enum AS ENUM (
    'finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'
);
```

#### comments
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commentable_type VARCHAR(50) NOT NULL, -- 'project', 'task', etc.
    commentable_id UUID NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    mentions UUID[], -- Array of mentioned user IDs
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_comments_commentable ON comments(commentable_type, commentable_id);
CREATE INDEX idx_comments_author ON comments(author_id);
```

#### attachments
```sql
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachable_type VARCHAR(50) NOT NULL,
    attachable_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    file_path TEXT NOT NULL, -- Tailscale-accessible path
    uploaded_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_attachments_attachable ON attachments(attachable_type, attachable_id);
```

### Agent Management Tables

#### agents
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type agent_type_enum NOT NULL,
    status agent_status_enum NOT NULL DEFAULT 'inactive',
    version VARCHAR(50) NOT NULL,
    config JSONB DEFAULT '{}',
    capabilities TEXT[] DEFAULT '{}',
    tailscale_node VARCHAR(255), -- Tailscale node for agent communication
    tailscale_ip INET, -- Tailscale IP address
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE agent_type_enum AS ENUM (
    'orchestrator', 'planning', 'task', 'progress', 'communication', 'resource'
);

CREATE TYPE agent_status_enum AS ENUM (
    'inactive', 'initializing', 'active', 'busy', 'paused', 'error', 'terminating'
);
```

#### agent_tasks
```sql
CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    status agent_task_status_enum NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    payload JSONB NOT NULL,
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TYPE agent_task_status_enum AS ENUM (
    'pending', 'running', 'completed', 'failed', 'cancelled', 'expired'
);

CREATE INDEX idx_agent_tasks_agent_status ON agent_tasks(agent_id, status);
CREATE INDEX idx_agent_tasks_expires ON agent_tasks(expires_at) WHERE expires_at IS NOT NULL;
```

### Event Sourcing Tables

#### events
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    version INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_id UUID REFERENCES users(id),
    created_by_agent_id UUID REFERENCES agents(id)
);

CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id, version);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
```

#### event_snapshots
```sql
CREATE TABLE event_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    version INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(aggregate_type, aggregate_id, version)
);
```

## MongoDB Collections (Document Storage)

### Agent State Collection
```javascript
// agents_state
{
  _id: ObjectId,
  agentId: String, // UUID from PostgreSQL
  agentType: String, // orchestrator, planning, task, etc.
  state: {
    status: String,
    currentTasks: Array,
    configuration: Object,
    performance: {
      tasksCompleted: Number,
      averageResponseTime: Number,
      errorRate: Number,
      uptime: Number
    },
    tailscale: {
      nodeKey: String,
      ipAddress: String,
      lastSeen: Date,
      connectivity: String // "connected", "disconnected", "degraded"
    }
  },
  metadata: Object,
  lastUpdated: Date,
  version: Number
}

// Indexes
db.agents_state.createIndex({ "agentId": 1 }, { unique: true });
db.agents_state.createIndex({ "agentType": 1, "state.status": 1 });
db.agents_state.createIndex({ "lastUpdated": 1 });
db.agents_state.createIndex({ "state.tailscale.nodeKey": 1 });
```

### Project Documents Collection
```javascript
// project_documents
{
  _id: ObjectId,
  projectId: String, // UUID from PostgreSQL
  documentType: String, // "plan", "requirements", "notes", "gsd_framework"
  title: String,
  content: Object, // Flexible document structure
  version: Number,
  tags: Array,
  tailscaleAccess: {
    allowedNodes: Array, // Tailscale node keys
    accessLevel: String // "read", "write", "admin"
  },
  createdBy: String, // User UUID
  createdAt: Date,
  updatedAt: Date,
  isDeleted: Boolean
}

// Indexes
db.project_documents.createIndex({ "projectId": 1, "documentType": 1 });
db.project_documents.createIndex({ "projectId": 1, "createdAt": -1 });
db.project_documents.createIndex({ "tags": 1 });
db.project_documents.createIndex({ "tailscaleAccess.allowedNodes": 1 });
```

### Message Queue Collection
```javascript
// message_queue
{
  _id: ObjectId,
  messageId: String, // Unique message ID
  type: String, // Message type from protocol
  source: String, // Source agent/client ID
  target: String, // Target agent/client ID
  channel: String, // Channel for broadcast messages
  priority: Number, // 0-3
  payload: Object,
  status: String, // "pending", "processing", "completed", "failed"
  tailscaleRoute: {
    sourceNode: String,
    targetNode: String,
    encrypted: Boolean
  },
  attempts: Number,
  maxAttempts: Number,
  scheduledAt: Date,
  processedAt: Date,
  expiresAt: Date,
  error: String
}

// Indexes
db.message_queue.createIndex({ "status": 1, "priority": -1, "scheduledAt": 1 });
db.message_queue.createIndex({ "target": 1, "status": 1 });
db.message_queue.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
db.message_queue.createIndex({ "tailscaleRoute.targetNode": 1 });
```

### Session Store Collection
```javascript
// sessions
{
  _id: ObjectId,
  sessionId: String,
  userId: String, // UUID from PostgreSQL
  agentId: String, // If agent session
  connectionInfo: {
    tailscaleIP: String,
    nodeKey: String,
    userAgent: String,
    connectedAt: Date,
    lastActivity: Date
  },
  permissions: Array,
  subscribedChannels: Array,
  sessionData: Object,
  expiresAt: Date,
  isActive: Boolean
}

// Indexes
db.sessions.createIndex({ "sessionId": 1 }, { unique: true });
db.sessions.createIndex({ "userId": 1, "isActive": 1 });
db.sessions.createIndex({ "connectionInfo.tailscaleIP": 1 });
db.sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
```

## Database Configuration for Tailscale

### SQLite Configuration
```typescript
// Development database configuration
const devDatabaseConfig = {
  sqlite: {
    filename: './data/dev/pm-dashboard-dev.sqlite',
    options: {
      // Enable WAL mode for better concurrency
      pragma: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        cache_size: -64000, // 64MB cache
        temp_store: 'MEMORY',
        mmap_size: 268435456, // 256MB mmap
        foreign_keys: 'ON',
        auto_vacuum: 'INCREMENTAL'
      },
      // Connection pool settings
      pool: {
        min: 1,
        max: 5,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 300000
      }
    }
  }
};

// Production database configuration  
const prodDatabaseConfig = {
  sqlite: {
    filename: './data/prod/pm-dashboard.sqlite',
    options: {
      pragma: {
        journal_mode: 'WAL',
        synchronous: 'FULL', // More durability in production
        cache_size: -128000, // 128MB cache
        temp_store: 'MEMORY',
        mmap_size: 536870912, // 512MB mmap
        foreign_keys: 'ON',
        auto_vacuum: 'INCREMENTAL'
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 300000
      }
    }
  }
};
```

### MongoDB Configuration (mongod.conf)
```yaml
net:
  bindIp: 100.x.x.x  # Tailscale IP only
  port: 27017
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/tailscale.pem
    CAFile: /etc/ssl/mongodb/ca.pem

security:
  authorization: enabled
  clusterAuthMode: x509

replication:
  replSetName: "pm-dashboard-rs"

storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1
    collectionConfig:
      blockCompressor: snappy
```

## Backup and Disaster Recovery

### PostgreSQL Backup Strategy
```bash
#!/bin/bash
# Backup script with Tailscale network awareness

# Create backup with connection via Tailscale
pg_dump -h 100.x.x.x -U backup_user -d pm_dashboard \
  --verbose --format=custom \
  --file="/backups/pm_dashboard_$(date +%Y%m%d_%H%M%S).backup"

# Replicate to Tailscale-accessible backup server
rsync -av /backups/ backup-server.tailnet:~/backups/pm-dashboard/
```

### MongoDB Backup Strategy
```bash
#!/bin/bash
# MongoDB backup via Tailscale network

mongodump --host 100.x.x.x:27017 \
  --ssl --sslCAFile /etc/ssl/mongodb/ca.pem \
  --out "/backups/mongodb_$(date +%Y%m%d_%H%M%S)"

# Compress and transfer
tar -czf "/backups/mongodb_$(date +%Y%m%d_%H%M%S).tar.gz" \
  "/backups/mongodb_$(date +%Y%m%d_%H%M%S)"
```

## Performance Optimization

### PostgreSQL Optimization
```sql
-- Partitioning for large tables
CREATE TABLE events_2024 PARTITION OF events
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Materialized views for dashboard queries
CREATE MATERIALIZED VIEW project_dashboard_stats AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.progress,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    AVG(t.progress) as avg_task_progress,
    p.updated_at
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.status, p.progress, p.updated_at;

-- Refresh schedule
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY project_dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every 5 minutes
SELECT cron.schedule('refresh-dashboard-stats', '*/5 * * * *', 'SELECT refresh_dashboard_stats();');
```

### MongoDB Optimization
```javascript
// Compound indexes for common queries
db.agents_state.createIndex({
  "agentType": 1,
  "state.status": 1,
  "lastUpdated": -1
});

// Text search index for documents
db.project_documents.createIndex({
  "title": "text",
  "content": "text",
  "tags": "text"
});

// TTL index for temporary data
db.message_queue.createIndex(
  { "expiresAt": 1 },
  { expireAfterSeconds: 0 }
);
```

This database schema provides a robust foundation for the multi-agent project management system with proper Tailscale network integration and security considerations.