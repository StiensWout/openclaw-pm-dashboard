import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date(timestamp))
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function getAgentStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'online':
    case 'active':
      return 'text-green-400'
    case 'working':
    case 'busy':
      return 'text-blue-400'
    case 'offline':
    case 'inactive':
      return 'text-gray-400'
    case 'error':
    case 'failed':
      return 'text-red-400'
    default:
      return 'text-yellow-400'
  }
}

export function getTaskPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'high':
    case 'urgent':
      return 'border-l-red-500 bg-red-900/10'
    case 'medium':
    case 'normal':
      return 'border-l-yellow-500 bg-yellow-900/10'
    case 'low':
      return 'border-l-green-500 bg-green-900/10'
    default:
      return 'border-l-gray-500 bg-gray-900/10'
  }
}