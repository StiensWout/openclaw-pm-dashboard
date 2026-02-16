export interface Agent {
  id: string
  name: string
  type: 'main' | 'subagent' | 'specialist'
  status: 'online' | 'offline' | 'working' | 'error'
  currentTask?: string
  lastActive: number
  performance: {
    tasksCompleted: number
    averageResponseTime: number
    errorRate: number
    uptime: number
  }
  capabilities: string[]
  metadata?: Record<string, any>
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignedTo?: string
  assignedAgent?: Agent
  createdAt: number
  updatedAt: number
  dueDate?: number
  estimatedTime?: number
  actualTime?: number
  tags: string[]
  dependencies?: string[]
}

export interface Project {
  id: string
  name: string
  description: string
  status: 'planning' | 'active' | 'on-hold' | 'completed'
  progress: number
  startDate: number
  endDate?: number
  tasks: Task[]
  agents: Agent[]
  metrics: {
    totalTasks: number
    completedTasks: number
    activeAgents: number
    avgCompletionTime: number
  }
}

export interface Message {
  id: string
  type: 'agent-to-agent' | 'system' | 'user' | 'task-update' | 'error'
  from: string
  to?: string
  content: string
  timestamp: number
  metadata?: {
    taskId?: string
    severity?: 'info' | 'warning' | 'error'
    action?: string
  }
}

export interface AgentMetrics {
  agentId: string
  timestamp: number
  cpuUsage?: number
  memoryUsage?: number
  responseTime: number
  taskQueue: number
  errors: number
}

export interface WebSocketMessage {
  type: 'agent-status' | 'task-update' | 'message' | 'metrics' | 'project-update'
  data: any
  timestamp: number
}

export interface KanbanColumn {
  id: string
  title: string
  status: Task['status']
  tasks: Task[]
  color: string
}

export interface Dashboard {
  projects: Project[]
  agents: Agent[]
  recentMessages: Message[]
  systemMetrics: {
    totalAgents: number
    activeAgents: number
    totalTasks: number
    completedTasksToday: number
    systemUptime: number
    lastUpdate: number
  }
}