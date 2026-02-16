import React, { useState, useEffect } from 'react'
import {
  Activity,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Settings
} from 'lucide-react'
import { AgentStatusDashboard } from './AgentStatusDashboard'
import { MessagePanel } from './MessagePanel'
import { KanbanBoard } from './KanbanBoard'
import { AgentMetrics } from './AgentMetrics'
import { TaskAssignment } from './TaskAssignment'
import { useWebSocket } from '../hooks/useWebSocket'
import { cn } from '../lib/utils'
import type { Agent, Task, Message, WebSocketMessage } from '../types'

interface DashboardProps {
  activeView?: 'overview' | 'agents' | 'projects' | 'messages' | 'metrics'
}

// Mock data for demonstration
const mockSystemMetrics = {
  totalAgents: 5,
  activeAgents: 4,
  totalTasks: 23,
  completedTasksToday: 7,
  systemUptime: 99.2,
  lastUpdate: Date.now()
}

export function Dashboard({ activeView = 'overview' }: DashboardProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showTaskAssignment, setShowTaskAssignment] = useState(false)

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      console.log('Received WebSocket message:', message)
      
      switch (message.type) {
        case 'agent-status':
          // Update agent status
          if (message.data.agent) {
            setAgents(prev => prev.map(agent => 
              agent.id === message.data.agent.id 
                ? { ...agent, ...message.data.agent }
                : agent
            ))
          }
          break
          
        case 'task-update':
          // Update task status
          if (message.data.task) {
            setTasks(prev => prev.map(task =>
              task.id === message.data.task.id
                ? { ...task, ...message.data.task }
                : task
            ))
          }
          break
          
        case 'message':
          // Add new message
          if (message.data) {
            setMessages(prev => [message.data, ...prev].slice(0, 100))
          }
          break
      }
    }
  })

  // System status derived from agents
  const systemStatus = {
    onlineAgents: agents.filter(a => a.status === 'online' || a.status === 'working').length,
    workingAgents: agents.filter(a => a.status === 'working').length,
    totalTasks: tasks.length,
    activeTasks: tasks.filter(t => t.status === 'in-progress').length,
    completedTasks: tasks.filter(t => t.status === 'done').length,
    recentMessages: messages.slice(0, 5)
  }

  const OverviewDashboard = () => (
    <div className="space-y-6">
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Agents</p>
              <p className="text-2xl font-bold text-white">
                {systemStatus.onlineAgents}/{agents.length}
              </p>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-8 h-8 text-blue-500" />
              {systemStatus.workingAgents > 0 && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {systemStatus.workingAgents} currently working
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Tasks</p>
              <p className="text-2xl font-bold text-white">{systemStatus.activeTasks}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {systemStatus.totalTasks} total tasks
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Completed Today</p>
              <p className="text-2xl font-bold text-white">{mockSystemMetrics.completedTasksToday}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {systemStatus.completedTasks} total completed
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">System Health</p>
              <p className="text-2xl font-bold text-white">{mockSystemMetrics.systemUptime}%</p>
            </div>
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500" />
              {isConnected && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-1" />
              )}
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Agent Status */}
        <div className="lg:col-span-2">
          <AgentStatusDashboard 
            agents={agents}
            onAgentSelect={setSelectedAgent}
          />
        </div>

        {/* Messages Panel */}
        <div className="lg:col-span-1">
          <MessagePanel 
            messages={messages}
            className="h-full"
          />
        </div>
      </div>
    </div>
  )

  const renderActiveView = () => {
    switch (activeView) {
      case 'agents':
        return (
          <AgentStatusDashboard 
            agents={agents}
            onAgentSelect={setSelectedAgent}
          />
        )
      
      case 'projects':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Project Management</h2>
              <button
                onClick={() => setShowTaskAssignment(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-500/90 text-white rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Assign Task</span>
              </button>
            </div>
            <KanbanBoard 
              tasks={tasks}
              agents={agents}
              onTaskUpdate={(task) => {
                setTasks(prev => prev.map(t => t.id === task.id ? task : t))
              }}
            />
          </div>
        )
      
      case 'messages':
        return (
          <MessagePanel 
            messages={messages}
            className="h-[calc(100vh-200px)]"
          />
        )
      
      case 'metrics':
        return (
          <AgentMetrics 
            agents={agents}
          />
        )
      
      default:
        return <OverviewDashboard />
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Bar */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2 rounded-lg text-sm",
        isConnected 
          ? "bg-green-900/20 text-green-400 border border-green-800" 
          : "bg-red-900/20 text-red-400 border border-red-800"
      )}>
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          <span>
            {isConnected ? 'Real-time connection active' : 'Connection lost - attempting to reconnect...'}
          </span>
        </div>
        <div className="text-xs opacity-75">
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Main Content */}
      {renderActiveView()}

      {/* Task Assignment Modal */}
      <TaskAssignment
        agents={agents}
        isOpen={showTaskAssignment}
        onClose={() => setShowTaskAssignment(false)}
        onTaskAssign={(task, agentId) => {
          const newTask: Task = {
            ...task,
            id: `task-${Date.now()}`,
            assignedTo: agentId
          }
          setTasks(prev => [...prev, newTask])
          
          // Simulate agent assignment message
          const assignmentMessage: Message = {
            id: `msg-${Date.now()}`,
            type: 'task-update',
            from: 'System',
            content: `Task "${task.title}" assigned to ${agents.find(a => a.id === agentId)?.name}`,
            timestamp: Date.now(),
            metadata: {
              taskId: newTask.id,
              severity: 'info',
              action: 'assigned'
            }
          }
          setMessages(prev => [assignmentMessage, ...prev])
        }}
      />
    </div>
  )
}