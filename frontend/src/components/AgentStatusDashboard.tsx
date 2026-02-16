import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Cpu, 
  Activity,
  Zap,
  XCircle
} from 'lucide-react'
import { cn, formatRelativeTime, getAgentStatusColor } from '../lib/utils'
import type { Agent } from '../types'

interface AgentStatusDashboardProps {
  agents: Agent[]
  onAgentSelect?: (agent: Agent) => void
}

// Mock agent data for demonstration
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
  },
  {
    id: 'test-agent-1',
    name: 'Test Agent Alpha',
    type: 'subagent',
    status: 'offline',
    lastActive: Date.now() - 3600000,
    performance: {
      tasksCompleted: 12,
      averageResponseTime: 1.8,
      errorRate: 0.1,
      uptime: 95.2
    },
    capabilities: ['testing', 'validation', 'qa']
  },
  {
    id: 'error-agent',
    name: 'Analytics Agent',
    type: 'specialist',
    status: 'error',
    currentTask: 'Failed: Data processing timeout',
    lastActive: Date.now() - 900000,
    performance: {
      tasksCompleted: 8,
      averageResponseTime: 5.2,
      errorRate: 0.25,
      uptime: 87.1
    },
    capabilities: ['analytics', 'reporting', 'metrics']
  }
]

export function AgentStatusDashboard({ 
  agents = mockAgents, 
  onAgentSelect 
}: AgentStatusDashboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const statusCounts = agents.reduce((acc, agent) => {
    acc[agent.status] = (acc[agent.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const StatusIcon = ({ status }: { status: Agent['status'] }) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'working':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'offline':
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const AgentTypeIcon = ({ type }: { type: Agent['type'] }) => {
    switch (type) {
      case 'main':
        return <Zap className="w-5 h-5 text-yellow-500" />
      case 'specialist':
        return <Cpu className="w-5 h-5 text-purple-500" />
      case 'subagent':
      default:
        return <Users className="w-5 h-5 text-blue-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Agents</p>
              <p className="text-2xl font-bold text-white">{agents.length}</p>
            </div>
            <Users className="w-8 h-8 text-openclaw-primary" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Online</p>
              <p className="text-2xl font-bold text-green-400">
                {(statusCounts.online || 0) + (statusCounts.working || 0)}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Working</p>
              <p className="text-2xl font-bold text-blue-400">{statusCounts.working || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Errors</p>
              <p className="text-2xl font-bold text-red-400">{statusCounts.error || 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={cn(
              "agent-card cursor-pointer transition-all duration-200",
              selectedAgent?.id === agent.id && "ring-2 ring-openclaw-primary"
            )}
            onClick={() => {
              setSelectedAgent(agent)
              onAgentSelect?.(agent)
            }}
          >
            {/* Agent Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <AgentTypeIcon type={agent.type} />
                <div>
                  <h3 className="font-semibold text-white">{agent.name}</h3>
                  <p className="text-sm text-gray-400 capitalize">{agent.type}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <StatusIcon status={agent.status} />
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full capitalize",
                  getAgentStatusColor(agent.status),
                  agent.status === 'online' && "bg-green-900/20",
                  agent.status === 'working' && "bg-blue-900/20",
                  agent.status === 'error' && "bg-red-900/20",
                  agent.status === 'offline' && "bg-gray-900/20"
                )}>
                  {agent.status}
                </span>
              </div>
            </div>

            {/* Current Task */}
            {agent.currentTask && (
              <div className="mb-4">
                <p className="text-sm text-gray-300 line-clamp-2">
                  {agent.currentTask}
                </p>
              </div>
            )}

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400">Tasks Done</p>
                <p className="text-lg font-semibold text-white">
                  {agent.performance.tasksCompleted}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Uptime</p>
                <p className="text-lg font-semibold text-white">
                  {agent.performance.uptime.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Response</p>
                <p className="text-lg font-semibold text-white">
                  {agent.performance.averageResponseTime.toFixed(1)}s
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Error Rate</p>
                <p className="text-lg font-semibold text-white">
                  {(agent.performance.errorRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Capabilities */}
            <div className="flex flex-wrap gap-1 mb-3">
              {agent.capabilities.slice(0, 3).map((capability) => (
                <span
                  key={capability}
                  className="text-xs px-2 py-1 bg-openclaw-primary/10 text-openclaw-primary rounded"
                >
                  {capability}
                </span>
              ))}
              {agent.capabilities.length > 3 && (
                <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                  +{agent.capabilities.length - 3}
                </span>
              )}
            </div>

            {/* Last Active */}
            <div className="flex items-center text-xs text-gray-400">
              <Clock className="w-3 h-3 mr-1" />
              Last active {formatRelativeTime(agent.lastActive)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}