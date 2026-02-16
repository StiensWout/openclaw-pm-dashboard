// Shared utility functions for the OpenClaw PM Dashboard

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const calculateProgress = (tasks: any[]): number => {
  if (tasks.length === 0) return 0;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  return Math.round((completedTasks / tasks.length) * 100);
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: '#4caf50',
    idle: '#2196f3', 
    busy: '#ff9800',
    error: '#f44336',
    offline: '#9e9e9e',
    pending: '#757575',
    in_progress: '#2196f3',
    completed: '#4caf50',
    failed: '#f44336'
  };
  return colors[status] || '#9e9e9e';
};

export const priorityWeight = (priority: string): number => {
  const weights: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };
  return weights[priority] || 1;
};