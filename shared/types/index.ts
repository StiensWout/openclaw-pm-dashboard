// Shared TypeScript types for the OpenClaw PM Dashboard

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  lastActivity: Date;
  currentTask?: string;
  capabilities: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration?: number; // in minutes
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  tasks: Task[];
  assignedAgents: string[];
  progress: number; // percentage 0-100
}

export interface SocketMessage {
  type: 'agent_update' | 'task_update' | 'project_update' | 'system_message';
  payload: any;
  timestamp: Date;
  source?: string;
}

export interface DashboardConfig {
  refreshInterval: number;
  maxRecentActivities: number;
  enableNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}