export interface Agent {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'design' | 'testing' | 'deployment' | 'coordination' | 'analysis';
  status: 'active' | 'idle' | 'busy' | 'offline' | 'error';
  capabilities: string[];
  currentTask?: string;
  socketId?: string;
  lastActivity: Date;
  performance: AgentPerformance;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPerformance {
  tasksCompleted: number;
  averageTaskTime: number;
  successRate: number;
  lastTaskCompletionTime?: Date;
  errorCount: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgents: string[];
  tasks: string[];
  progress: number;
  startDate?: Date;
  dueDate?: Date;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgentId?: string;
  dependencies: string[];
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Communication {
  id: string;
  fromAgentId?: string;
  toAgentId?: string;
  type: 'task_assignment' | 'status_update' | 'error_report' | 'coordination' | 'notification' | 'user_message';
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  read: boolean;
  projectId?: string;
  taskId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface SocketEvent {
  event: string;
  data: any;
  timestamp: Date;
  agentId?: string;
}

export interface DatabaseSchema {
  agents: Agent;
  projects: Project;
  tasks: Task;
  communications: Communication;
}

export interface TailscaleConfig {
  interface: string;
  hostname: string;
  port: number;
  enabled: boolean;
}

export interface OpenClawNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  channel?: string;
  target?: string;
  metadata?: Record<string, any>;
}