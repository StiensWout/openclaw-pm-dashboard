import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { AgentStatusDashboard } from './components/AgentStatusDashboard'
import { KanbanBoard } from './components/KanbanBoard'
import { MessagePanel } from './components/MessagePanel'
import { AgentMetrics } from './components/AgentMetrics'
import { useWebSocket } from './hooks/useWebSocket'
import { API_CONFIG, apiLog } from './config/api'
import type { Agent, Task, Message, WebSocketMessage } from './types'

// Mock data initialization
const initializeMockData = () => {
  const mockAgents: Agent[] = [
    {
      id: 'main-agent',
      name: 'Main Agent',
      type: 'main',
      status: 'online',
      currentTask: 'Monitoring system health',
      lastActive: Date.now() - 30000,
      performance: {
        tasksCompleted: 47,
        averageResponseTime: 1.2,
        errorRate: 0.02,
        uptime: 99.8
      },
      capabilities: ['orchestration', 'communication', 'planning']
    },
    {
      id: 'frontend-agent',
      name: 'Frontend Agent',
      type: 'specialist',
      status: 'working',
      currentTask: 'Building React dashboard components',
      lastActive: Date.now() - 5000,
      performance: {
        tasksCompleted: 23,
        averageResponseTime: 2.1,
        errorRate: 0.05,
        uptime: 98.5
      },
      capabilities: ['react', 'typescript', 'ui/ux', 'frontend']
    },
    {
      id: 'backend-agent',
      name: 'Backend Agent',
      type: 'specialist',
      status: 'online',
      currentTask: 'Setting up WebSocket server',
      lastActive: Date.now() - 120000,
      performance: {
        tasksCompleted: 31,
        averageResponseTime: 0.8,
        errorRate: 0.01,
        uptime: 99.9
      },
      capabilities: ['nodejs', 'api', 'database', 'websockets']
    }
  ]

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Set up React 19 + Vite project',
      description: 'Initialize the frontend project with modern tooling and TypeScript support',
      status: 'done',
      priority: 'high',
      assignedTo: 'frontend-agent',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 1800000,
      estimatedTime: 2,
      actualTime: 1.5,
      tags: ['setup', 'react', 'typescript']
    },
    {
      id: 'task-2',
      title: 'Configure Tailscale deployment',
      description: 'Set up private network deployment with proper environment configuration',
      status: 'in-progress',
      priority: 'high',
      assignedTo: 'frontend-agent',
      createdAt: Date.now() - 1800000,
      updatedAt: Date.now() - 300000,
      dueDate: Date.now() + 3600000,
      estimatedTime: 2,
      tags: ['deployment', 'tailscale', 'devops']
    }
  ]

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      type: 'system',
      from: 'System',
      content: 'OpenClaw Multi-Agent Dashboard initialized successfully',
      timestamp: Date.now() - 30000,
      metadata: { severity: 'info' }
    },
    {
      id: 'msg-2',
      type: 'agent-to-agent',
      from: 'Frontend Agent',
      to: 'Backend Agent',
      content: 'Ready for WebSocket integration testing',
      timestamp: Date.now() - 60000,
      metadata: { severity: 'info' }
    }
  ]

  return { mockAgents, mockTasks, mockMessages }
}

function App() {
  const { mockAgents, mockTasks, mockMessages } = initializeMockData()
  const [agents, setAgents] = useState<Agent[]>(mockAgents)
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [messages, setMessages] = useState<Message[]>(mockMessages)

  // WebSocket connection for real-time updates
  const { isConnected, connectionError } = useWebSocket({
    url: API_CONFIG.wsUrl,
    onConnect: () => {
      apiLog('WebSocket connected successfully')
      // Add connection message
      const connectMsg: Message = {
        id: `msg-connect-${Date.now()}`,
        type: 'system',
        from: 'System',
        content: `Connected to ${API_CONFIG.isDevelopment ? 'development' : 'production'} server`,
        timestamp: Date.now(),
        metadata: { severity: 'info' }
      }
      setMessages(prev => [connectMsg, ...prev])
    },
    onDisconnect: () => {
      apiLog('WebSocket disconnected')
      // Add disconnection message
      const disconnectMsg: Message = {
        id: `msg-disconnect-${Date.now()}`,
        type: 'system',
        from: 'System',
        content: 'Connection lost - attempting to reconnect...',
        timestamp: Date.now(),
        metadata: { severity: 'warning' }
      }
      setMessages(prev => [disconnectMsg, ...prev])
    },
    onMessage: (message: WebSocketMessage) => {
      apiLog('Received WebSocket message', message)
      
      switch (message.type) {
        case 'agent-status':
          if (message.data.agent) {
            setAgents(prev => prev.map(agent => 
              agent.id === message.data.agent.id 
                ? { ...agent, ...message.data.agent, lastActive: Date.now() }
                : agent
            ))
          }
          break
          
        case 'task-update':
          if (message.data.task) {
            setTasks(prev => prev.map(task =>
              task.id === message.data.task.id
                ? { ...task, ...message.data.task, updatedAt: Date.now() }
                : task
            ))
          }
          break
          
        case 'message':
          if (message.data) {
            setMessages(prev => [
              { ...message.data, timestamp: message.timestamp }, 
              ...prev
            ].slice(0, 100)) // Keep only latest 100 messages
          }
          break
      }
    }
  })

  // Simulate periodic agent status updates for demo
  useEffect(() => {
    if (API_CONFIG.isDevelopment) {
      const interval = setInterval(() => {
        setAgents(prev => prev.map(agent => {
          // Randomly update agent activity
          if (Math.random() > 0.8) {
            const updates = {
              lastActive: Date.now(),
              performance: {
                ...agent.performance,
                tasksCompleted: agent.performance.tasksCompleted + (Math.random() > 0.7 ? 1 : 0)
              }
            }
            return { ...agent, ...updates }
          }
          return agent
        }))
      }, 30000) // Update every 30 seconds

      return () => clearInterval(interval)
    }
  }, [])

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={
            <Dashboard 
              activeView="overview"
            />
          } />
          
          <Route path="/agents" element={
            <AgentStatusDashboard 
              agents={agents}
            />
          } />
          
          <Route path="/projects" element={
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Project Management</h2>
              </div>
              <KanbanBoard 
                tasks={tasks}
                agents={agents}
                onTaskUpdate={(task) => {
                  setTasks(prev => prev.map(t => t.id === task.id ? task : t))
                }}
              />
            </div>
          } />
          
          <Route path="/messages" element={
            <MessagePanel 
              messages={messages}
              className="h-[calc(100vh-200px)]"
            />
          } />
          
          <Route path="/metrics" element={
            <AgentMetrics 
              agents={agents}
            />
          } />
          
          <Route path="/settings" element={
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Environment
                  </label>
                  <p className="text-white">
                    {API_CONFIG.isDevelopment ? 'Development' : 'Production'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    API URL
                  </label>
                  <p className="text-white font-mono text-sm">{API_CONFIG.apiUrl}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    WebSocket URL
                  </label>
                  <p className="text-white font-mono text-sm">{API_CONFIG.wsUrl}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Connection Status
                  </label>
                  <p className={isConnected ? 'text-green-400' : 'text-red-400'}>
                    {isConnected ? 'Connected' : `Disconnected${connectionError ? ` (${connectionError})` : ''}`}
                  </p>
                </div>
              </div>
            </div>
          } />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App