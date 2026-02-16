import React, { useState, useEffect } from 'react'
import {
  Activity,
  Cpu,
  MemoryStick,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react'
import { cn, formatRelativeTime } from '../lib/utils'
import type { Agent, AgentMetrics } from '../types'

interface AgentMetricsProps {
  agents: Agent[]
  metrics?: AgentMetrics[]
  className?: string
}

// Mock metrics data for demonstration
const generateMockMetrics = (agentId: string): AgentMetrics[] => {
  const now = Date.now()
  const metrics: AgentMetrics[] = []
  
  // Generate last 24 hours of metrics (every 5 minutes)
  for (let i = 0; i < 288; i++) {
    const timestamp = now - (i * 5 * 60 * 1000)
    metrics.push({
      agentId,
      timestamp,
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      responseTime: Math.random() * 5000 + 500,
      taskQueue: Math.floor(Math.random() * 10),
      errors: Math.random() > 0.95 ? Math.floor(Math.random() * 3) : 0
    })
  }
  
  return metrics.reverse()
}

const MetricCard = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  color = 'text-gray-400',
  bgColor = 'bg-dark-800'
}: {
  title: string
  value: string | number
  unit?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'stable'
  color?: string
  bgColor?: string
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null

  return (
    <div className={cn("p-4 rounded-lg border border-dark-700", bgColor)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className={cn("w-4 h-4", color)} />
          <span className="text-sm text-gray-300">{title}</span>
        </div>
        {TrendIcon && (
          <TrendIcon className={cn(
            "w-4 h-4",
            trend === 'up' ? "text-red-400" : "text-green-400"
          )} />
        )}
      </div>
      <div className="flex items-baseline space-x-1">
        <span className="text-xl font-semibold text-white">{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}

const MiniChart = ({ 
  data, 
  color = '#3b82f6',
  height = 40 
}: {
  data: number[]
  color?: string
  height?: number
}) => {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = ((max - value) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="w-full" style={{ height }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          className="drop-shadow-sm"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.1 }} />
          </linearGradient>
        </defs>
        <polygon
          fill="url(#gradient)"
          points={`0,100 ${points} 100,100`}
        />
      </svg>
    </div>
  )
}

export function AgentMetrics({ agents, metrics, className }: AgentMetricsProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('6h')

  const currentAgent = selectedAgent ? agents.find(a => a.id === selectedAgent) : agents[0]
  const agentMetrics = currentAgent ? generateMockMetrics(currentAgent.id) : []
  
  // Filter metrics based on time range
  const now = Date.now()
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  }
  
  const filteredMetrics = agentMetrics.filter(
    m => now - m.timestamp <= timeRanges[timeRange]
  )

  // Calculate current metrics
  const latestMetric = filteredMetrics[filteredMetrics.length - 1]
  const avgResponseTime = filteredMetrics.length > 0 
    ? filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / filteredMetrics.length
    : 0
  const totalErrors = filteredMetrics.reduce((sum, m) => sum + m.errors, 0)
  const currentQueue = latestMetric?.taskQueue || 0

  // Prepare chart data
  const responseTimeData = filteredMetrics.map(m => m.responseTime)
  const cpuData = filteredMetrics.map(m => m.cpuUsage || 0)
  const memoryData = filteredMetrics.map(m => m.memoryUsage || 0)

  useEffect(() => {
    if (!selectedAgent && agents.length > 0) {
      setSelectedAgent(agents[0].id)
    }
  }, [agents, selectedAgent])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Agent Performance</h2>
          <p className="text-sm text-gray-400">
            Real-time metrics and performance monitoring
          </p>
        </div>

        {/* Agent Selector */}
        <div className="flex items-center space-x-4">
          <select
            value={selectedAgent || ''}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:border-openclaw-primary focus:outline-none"
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>

          {/* Time Range */}
          <div className="flex rounded-lg border border-dark-700 overflow-hidden">
            {(['1h', '6h', '24h'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-2 text-sm transition-colors",
                  timeRange === range
                    ? "bg-openclaw-primary text-white"
                    : "text-gray-400 hover:text-white hover:bg-dark-800"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Avg Response Time"
          value={avgResponseTime.toFixed(0)}
          unit="ms"
          icon={Clock}
          color="text-blue-400"
          trend={avgResponseTime > 2000 ? 'up' : 'down'}
        />
        
        <MetricCard
          title="Task Queue"
          value={currentQueue}
          icon={Activity}
          color="text-green-400"
          trend={currentQueue > 5 ? 'up' : 'stable'}
        />
        
        <MetricCard
          title="Errors (Period)"
          value={totalErrors}
          icon={AlertTriangle}
          color="text-red-400"
          bgColor={totalErrors > 0 ? "bg-red-900/10" : "bg-dark-800"}
          trend={totalErrors > 0 ? 'up' : 'stable'}
        />
        
        <MetricCard
          title="Uptime"
          value={currentAgent?.performance.uptime.toFixed(1) || '0'}
          unit="%"
          icon={Zap}
          color="text-yellow-400"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Response Time Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Response Time</h3>
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <MiniChart data={responseTimeData} color="#3b82f6" height={60} />
          <div className="mt-2 text-sm text-gray-400">
            Last {timeRange}: {avgResponseTime.toFixed(0)}ms avg
          </div>
        </div>

        {/* CPU Usage Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">CPU Usage</h3>
            <Cpu className="w-5 h-5 text-orange-400" />
          </div>
          <MiniChart data={cpuData} color="#f97316" height={60} />
          <div className="mt-2 text-sm text-gray-400">
            Current: {(latestMetric?.cpuUsage || 0).toFixed(1)}%
          </div>
        </div>

        {/* Memory Usage Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Memory Usage</h3>
            <MemoryStick className="w-5 h-5 text-purple-400" />
          </div>
          <MiniChart data={memoryData} color="#8b5cf6" height={60} />
          <div className="mt-2 text-sm text-gray-400">
            Current: {(latestMetric?.memoryUsage || 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Agent Details */}
      {currentAgent && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-white mb-4">Agent Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-400">Status</label>
              <div className="flex items-center space-x-2 mt-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  currentAgent.status === 'online' && "bg-green-500",
                  currentAgent.status === 'working' && "bg-blue-500 animate-pulse",
                  currentAgent.status === 'error' && "bg-red-500",
                  currentAgent.status === 'offline' && "bg-gray-500"
                )} />
                <span className="text-white capitalize">{currentAgent.status}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400">Type</label>
              <p className="text-white mt-1 capitalize">{currentAgent.type}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400">Last Active</label>
              <p className="text-white mt-1">{formatRelativeTime(currentAgent.lastActive)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400">Tasks Completed</label>
              <p className="text-white mt-1">{currentAgent.performance.tasksCompleted}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400">Error Rate</label>
              <p className="text-white mt-1">
                {(currentAgent.performance.errorRate * 100).toFixed(2)}%
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400">Current Task</label>
              <p className="text-white mt-1 line-clamp-1">
                {currentAgent.currentTask || 'Idle'}
              </p>
            </div>
          </div>

          {/* Capabilities */}
          <div className="mt-6">
            <label className="text-sm font-medium text-gray-400">Capabilities</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {currentAgent.capabilities.map(capability => (
                <span
                  key={capability}
                  className="px-3 py-1 bg-openclaw-primary/10 text-openclaw-primary rounded-full text-sm"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}