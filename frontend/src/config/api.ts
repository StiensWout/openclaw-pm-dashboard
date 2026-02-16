// API Configuration for different environments
export const API_CONFIG = {
  // Base URLs from environment variables
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
  
  // Environment detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // API endpoints
  endpoints: {
    agents: '/api/agents',
    tasks: '/api/tasks',
    projects: '/api/projects',
    messages: '/api/messages',
    metrics: '/api/metrics',
    health: '/api/health'
  },
  
  // WebSocket events
  wsEvents: {
    agentStatus: 'agent-status',
    taskUpdate: 'task-update',
    message: 'message',
    metrics: 'metrics',
    projectUpdate: 'project-update',
    connect: 'connect',
    disconnect: 'disconnect'
  }
}

// Helper function to build full API URLs
export function buildApiUrl(endpoint: string): string {
  return `${API_CONFIG.apiUrl}${endpoint}`
}

// Helper function to get WebSocket URL
export function getWebSocketUrl(): string {
  return API_CONFIG.wsUrl
}

// Environment-specific logging
export function apiLog(message: string, data?: any): void {
  if (API_CONFIG.isDevelopment) {
    console.log(`[API] ${message}`, data || '')
  }
}