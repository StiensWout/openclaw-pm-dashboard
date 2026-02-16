import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Users, 
  AlertTriangle, 
  Info, 
  Clock, 
  Filter,
  Search,
  ChevronDown
} from 'lucide-react'
import { cn, formatTime } from '../lib/utils'
import type { Message } from '../types'

interface MessagePanelProps {
  messages: Message[]
  onMessageSelect?: (message: Message) => void
  className?: string
}

// Mock messages for demonstration
const mockMessages: Message[] = [
  {
    id: 'msg-1',
    type: 'agent-to-agent',
    from: 'Frontend Agent',
    to: 'Backend Agent',
    content: 'WebSocket endpoint configuration needed for real-time updates',
    timestamp: Date.now() - 30000,
    metadata: { severity: 'info' }
  },
  {
    id: 'msg-2',
    type: 'task-update',
    from: 'Main Agent',
    content: 'Task "React Dashboard Setup" completed successfully',
    timestamp: Date.now() - 120000,
    metadata: { taskId: 'task-1', severity: 'info', action: 'completed' }
  },
  {
    id: 'msg-3',
    type: 'system',
    from: 'System',
    content: 'New agent "Analytics Agent" registered and online',
    timestamp: Date.now() - 300000,
    metadata: { severity: 'info' }
  },
  {
    id: 'msg-4',
    type: 'error',
    from: 'Analytics Agent',
    content: 'Failed to process data batch: timeout after 30s',
    timestamp: Date.now() - 450000,
    metadata: { severity: 'error', action: 'retry' }
  },
  {
    id: 'msg-5',
    type: 'agent-to-agent',
    from: 'Backend Agent',
    to: 'Frontend Agent',
    content: 'API endpoints ready, documentation updated',
    timestamp: Date.now() - 600000,
    metadata: { severity: 'info' }
  },
  {
    id: 'msg-6',
    type: 'user',
    from: 'User',
    content: 'Deploy dashboard to Tailscale network with production settings',
    timestamp: Date.now() - 900000,
    metadata: { severity: 'info' }
  }
]

export function MessagePanel({ 
  messages = mockMessages, 
  onMessageSelect, 
  className 
}: MessagePanelProps) {
  const [filteredMessages, setFilteredMessages] = useState(messages)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const messageTypes = [
    'agent-to-agent',
    'system', 
    'user',
    'task-update',
    'error'
  ]

  useEffect(() => {
    let filtered = messages

    // Filter by type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(msg => selectedTypes.includes(msg.type))
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (msg.to && msg.to.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredMessages(filtered.sort((a, b) => b.timestamp - a.timestamp))
  }, [messages, selectedTypes, searchTerm])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredMessages])

  const MessageIcon = ({ type, severity }: { type: string, severity?: string }) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'agent-to-agent':
        return <Users className="w-4 h-4 text-blue-500" />
      case 'system':
        return <Info className="w-4 h-4 text-green-500" />
      case 'task-update':
        return <MessageSquare className="w-4 h-4 text-purple-500" />
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />
    }
  }

  const getMessageStyle = (type: string, severity?: string) => {
    switch (type) {
      case 'error':
        return 'border-l-red-500 bg-red-900/5'
      case 'agent-to-agent':
        return 'border-l-blue-500 bg-blue-900/5'
      case 'system':
        return 'border-l-green-500 bg-green-900/5'
      case 'task-update':
        return 'border-l-purple-500 bg-purple-900/5'
      default:
        return 'border-l-gray-500 bg-gray-900/5'
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700", className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Agent Communications
          </h3>
          <span className="text-sm text-gray-400">
            {filteredMessages.length} messages
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            <ChevronDown className={cn(
              "w-4 h-4 ml-1 transition-transform",
              showFilters && "rotate-180"
            )} />
          </button>

          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {messageTypes.map(type => (
                <button
                  key={type}
                  onClick={() => {
                    if (selectedTypes.includes(type)) {
                      setSelectedTypes(selectedTypes.filter(t => t !== type))
                    } else {
                      setSelectedTypes([...selectedTypes, type])
                    }
                  }}
                  className={cn(
                    "px-2 py-1 text-xs rounded transition-colors",
                    selectedTypes.includes(type)
                      ? "bg-blue-500 text-white"
                      : "bg-slate-600 text-gray-300 hover:bg-slate-500"
                  )}
                >
                  {type.replace('-', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages found</p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <div
              key={message.id}
              onClick={() => onMessageSelect?.(message)}
              className={cn(
                "p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200 hover:bg-slate-700/50",
                getMessageStyle(message.type, message.metadata?.severity)
              )}
            >
              {/* Message Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MessageIcon type={message.type} severity={message.metadata?.severity} />
                  <span className="font-medium text-white text-sm">
                    {message.from}
                  </span>
                  {message.to && (
                    <>
                      <span className="text-gray-500">→</span>
                      <span className="text-gray-300 text-sm">{message.to}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center text-xs text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(message.timestamp)}
                </div>
              </div>

              {/* Message Content */}
              <p className="text-gray-300 text-sm mb-2 line-clamp-3">
                {message.content}
              </p>

              {/* Metadata */}
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "text-xs px-2 py-1 rounded capitalize",
                  message.type === 'error' && "bg-red-900/20 text-red-400",
                  message.type === 'agent-to-agent' && "bg-blue-900/20 text-blue-400",
                  message.type === 'system' && "bg-green-900/20 text-green-400",
                  message.type === 'task-update' && "bg-purple-900/20 text-purple-400",
                  message.type === 'user' && "bg-yellow-900/20 text-yellow-400"
                )}>
                  {message.type.replace('-', ' ')}
                </span>
                
                {message.metadata?.taskId && (
                  <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                    Task: {message.metadata.taskId}
                  </span>
                )}

                {message.metadata?.action && (
                  <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded capitalize">
                    {message.metadata.action}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}