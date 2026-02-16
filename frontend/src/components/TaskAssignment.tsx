import React, { useState } from 'react'
import { 
  Plus, 
  User, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  X,
  Save,
  Users
} from 'lucide-react'
import { cn } from '../lib/utils'
import type { Task, Agent } from '../types'

interface TaskAssignmentProps {
  agents: Agent[]
  onTaskAssign?: (task: Omit<Task, 'id'>, agentId: string) => void
  isOpen: boolean
  onClose: () => void
}

const priorityOptions: Task['priority'][] = ['low', 'medium', 'high', 'urgent']

const priorityColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
}

// Mock agents for demonstration
const mockAgents: Agent[] = [
  {
    id: 'main-agent',
    name: 'Main Agent',
    type: 'main',
    status: 'online',
    lastActive: Date.now(),
    performance: { tasksCompleted: 47, averageResponseTime: 1.2, errorRate: 0.02, uptime: 99.8 },
    capabilities: ['orchestration', 'communication', 'planning']
  },
  {
    id: 'frontend-agent',
    name: 'Frontend Agent',
    type: 'specialist',
    status: 'working',
    currentTask: 'Building React components',
    lastActive: Date.now(),
    performance: { tasksCompleted: 23, averageResponseTime: 2.1, errorRate: 0.05, uptime: 98.5 },
    capabilities: ['react', 'typescript', 'ui/ux', 'frontend']
  },
  {
    id: 'backend-agent',
    name: 'Backend Agent',
    type: 'specialist',
    status: 'online',
    lastActive: Date.now(),
    performance: { tasksCompleted: 31, averageResponseTime: 0.8, errorRate: 0.01, uptime: 99.9 },
    capabilities: ['nodejs', 'api', 'database', 'websockets']
  }
]

export function TaskAssignment({ 
  agents = mockAgents, 
  onTaskAssign, 
  isOpen, 
  onClose 
}: TaskAssignmentProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    estimatedTime: '',
    dueDate: '',
    tags: '',
    assignedTo: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.assignedTo) newErrors.assignedTo = 'Agent assignment is required'
    if (formData.estimatedTime && isNaN(Number(formData.estimatedTime))) {
      newErrors.estimatedTime = 'Must be a valid number'
    }

    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      const task: Omit<Task, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: 'todo',
        priority: formData.priority,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        ...(formData.estimatedTime && { estimatedTime: Number(formData.estimatedTime) }),
        ...(formData.dueDate && { dueDate: new Date(formData.dueDate).getTime() })
      }

      onTaskAssign?.(task, formData.assignedTo)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        estimatedTime: '',
        dueDate: '',
        tags: '',
        assignedTo: ''
      })
      
      onClose()
    }
  }

  const availableAgents = agents.filter(agent => 
    agent.status === 'online' || agent.status === 'working'
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Create & Assign Task</h2>
            <p className="text-sm text-gray-400">Define a new task and assign it to an agent</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={cn(
                "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none",
                errors.title && "border-red-500"
              )}
              placeholder="Enter task title..."
            />
            {errors.title && (
              <p className="text-red-400 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Describe the task requirements and context..."
            />
          </div>

          {/* Priority & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  priority: e.target.value as Task['priority']
                }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                {priorityOptions.map(priority => (
                  <option key={priority} value={priority} className="bg-slate-700">
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={formData.estimatedTime}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                className={cn(
                  "w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none",
                  errors.estimatedTime && "border-red-500"
                )}
                placeholder="2.5"
              />
              {errors.estimatedTime && (
                <p className="text-red-400 text-sm mt-1">{errors.estimatedTime}</p>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="frontend, react, ui (comma-separated)"
            />
          </div>

          {/* Agent Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assign to Agent *
            </label>
            {availableAgents.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No agents available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableAgents.map(agent => (
                  <label
                    key={agent.id}
                    className={cn(
                      "flex items-center p-3 rounded-lg border border-slate-600 cursor-pointer transition-all duration-200 hover:border-blue-500/50",
                      formData.assignedTo === agent.id && "border-blue-500 bg-blue-500/10"
                    )}
                  >
                    <input
                      type="radio"
                      name="assignedTo"
                      value={agent.id}
                      checked={formData.assignedTo === agent.id}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        assignedTo: e.target.value 
                      }))}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <User className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">{agent.name}</span>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full capitalize",
                            agent.status === 'online' && "bg-green-900/20 text-green-400",
                            agent.status === 'working' && "bg-blue-900/20 text-blue-400"
                          )}>
                            {agent.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {agent.capabilities.slice(0, 3).join(', ')}
                          {agent.capabilities.length > 3 && ` +${agent.capabilities.length - 3}`}
                        </p>
                        {agent.currentTask && (
                          <p className="text-xs text-gray-500 italic">
                            Current: {agent.currentTask}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        <div>Tasks: {agent.performance.tasksCompleted}</div>
                        <div>Uptime: {agent.performance.uptime.toFixed(1)}%</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {errors.assignedTo && (
              <p className="text-red-400 text-sm mt-1">{errors.assignedTo}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableAgents.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-500/90 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Create & Assign</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}