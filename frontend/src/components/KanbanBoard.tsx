import React, { useState } from 'react'
import { 
  Plus, 
  Calendar, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  MoreHorizontal,
  Tag
} from 'lucide-react'
import { cn, formatRelativeTime, getTaskPriorityColor } from '../lib/utils'
import type { Task, KanbanColumn, Agent } from '../types'

interface KanbanBoardProps {
  tasks?: Task[]
  agents?: Agent[]
  onTaskUpdate?: (task: Task) => void
  onTaskCreate?: (task: Omit<Task, 'id'>) => void
}

// Mock data for demonstration
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
    title: 'Design dark theme UI components',
    description: 'Create reusable components with OpenClaw dark theme aesthetic',
    status: 'in-progress',
    priority: 'high',
    assignedTo: 'frontend-agent',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 300000,
    dueDate: Date.now() + 86400000,
    estimatedTime: 4,
    tags: ['ui', 'design', 'components']
  },
  {
    id: 'task-3',
    title: 'Implement WebSocket client',
    description: 'Real-time communication between frontend and backend agents',
    status: 'in-progress',
    priority: 'medium',
    assignedTo: 'frontend-agent',
    createdAt: Date.now() - 5400000,
    updatedAt: Date.now() - 900000,
    estimatedTime: 3,
    tags: ['websocket', 'realtime', 'communication']
  },
  {
    id: 'task-4',
    title: 'Configure Tailscale deployment',
    description: 'Set up private network deployment with proper environment configuration',
    status: 'todo',
    priority: 'high',
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 1800000,
    dueDate: Date.now() + 3600000,
    estimatedTime: 2,
    tags: ['deployment', 'tailscale', 'devops']
  },
  {
    id: 'task-5',
    title: 'Create agent performance metrics',
    description: 'Build visualization components for monitoring agent health and performance',
    status: 'todo',
    priority: 'medium',
    createdAt: Date.now() - 1200000,
    updatedAt: Date.now() - 1200000,
    estimatedTime: 3,
    tags: ['metrics', 'monitoring', 'charts']
  },
  {
    id: 'task-6',
    title: 'Add responsive design',
    description: 'Ensure all components work well on mobile and tablet devices',
    status: 'review',
    priority: 'low',
    assignedTo: 'frontend-agent',
    createdAt: Date.now() - 9000000,
    updatedAt: Date.now() - 7200000,
    estimatedTime: 2,
    actualTime: 2.5,
    tags: ['responsive', 'mobile', 'css']
  }
]

const defaultColumns: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', status: 'todo', tasks: [], color: 'border-gray-500' },
  { id: 'in-progress', title: 'In Progress', status: 'in-progress', tasks: [], color: 'border-blue-500' },
  { id: 'review', title: 'Review', status: 'review', tasks: [], color: 'border-yellow-500' },
  { id: 'done', title: 'Done', status: 'done', tasks: [], color: 'border-green-500' }
]

export function KanbanBoard({ 
  tasks = mockTasks, 
  agents = [], 
  onTaskUpdate, 
  onTaskCreate 
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(() => {
    const cols = [...defaultColumns]
    cols.forEach(col => {
      col.tasks = tasks.filter(task => task.status === col.status)
    })
    return cols
  })

  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetStatus: Task['status']) => {
    e.preventDefault()
    if (!draggedTask) return

    const updatedTask = { ...draggedTask, status: targetStatus, updatedAt: Date.now() }
    
    setColumns(prevCols => 
      prevCols.map(col => ({
        ...col,
        tasks: col.status === targetStatus 
          ? [...col.tasks.filter(t => t.id !== draggedTask.id), updatedTask]
          : col.tasks.filter(t => t.id !== draggedTask.id)
      }))
    )

    onTaskUpdate?.(updatedTask)
    setDraggedTask(null)
  }

  const PriorityIcon = ({ priority }: { priority: Task['priority'] }) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      case 'medium':
        return <Clock className="w-3 h-3 text-yellow-500" />
      case 'low':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      default:
        return null
    }
  }

  const TaskCard = ({ task }: { task: Task }) => {
    const agent = agents.find(a => a.id === task.assignedTo)
    
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        className={cn(
          "bg-slate-700 border border-slate-600 rounded-lg p-3 mb-3 cursor-move transition-all duration-200 hover:shadow-lg hover:border-blue-500/50",
          getTaskPriorityColor(task.priority)
        )}
      >
        {/* Task Header */}
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-white text-sm line-clamp-2">
            {task.title}
          </h4>
          <button className="text-gray-400 hover:text-white p-1 -mt-1 -mr-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Task Description */}
        {task.description && (
          <p className="text-xs text-gray-400 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Task Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Task Meta */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <PriorityIcon priority={task.priority} />
            <span className="capitalize">{task.priority}</span>
          </div>

          {task.dueDate && (
            <div className={cn(
              "flex items-center space-x-1",
              task.dueDate < Date.now() ? "text-red-400" : "text-gray-400"
            )}>
              <Calendar className="w-3 h-3" />
              <span>{formatRelativeTime(task.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Assignee & Time */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-600">
          {agent && (
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <User className="w-3 h-3" />
              <span>{agent.name}</span>
            </div>
          )}

          {task.estimatedTime && (
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>
                {task.actualTime ? `${task.actualTime}h` : `~${task.estimatedTime}h`}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Board Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Project Board</h2>
          <p className="text-sm text-gray-400">
            {tasks.length} tasks across {columns.length} columns
          </p>
        </div>
        
        <button
          onClick={() => {
            // TODO: Open create task modal
            console.log('Create new task')
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-500/90 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column Header */}
            <div className={cn(
              "bg-slate-800 border-t-4 rounded-t-lg p-4 border-b border-slate-700",
              column.color
            )}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">{column.title}</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400 bg-slate-700 px-2 py-1 rounded">
                    {column.tasks.length}
                  </span>
                  <button className="text-gray-400 hover:text-white">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 bg-slate-800 rounded-b-lg p-4 min-h-0 overflow-y-auto">
              {column.tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Tag className="w-6 h-6" />
                  </div>
                  <p className="text-sm">No tasks</p>
                </div>
              ) : (
                column.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}