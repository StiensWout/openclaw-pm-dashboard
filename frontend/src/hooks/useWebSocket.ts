import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { WebSocketMessage } from '../types'

interface UseWebSocketProps {
  url?: string
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
}

export function useWebSocket({
  url = 'ws://localhost:3001',
  onMessage,
  onConnect,
  onDisconnect,
  autoReconnect = true
}: UseWebSocketProps = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    try {
      socketRef.current = io(url, {
        transports: ['websocket'],
        upgrade: false,
        autoConnect: true,
        reconnection: autoReconnect,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socketRef.current.on('connect', () => {
        setIsConnected(true)
        setConnectionError(null)
        onConnect?.()
      })

      socketRef.current.on('disconnect', (reason) => {
        setIsConnected(false)
        onDisconnect?.()
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          socketRef.current?.connect()
        }
      })

      socketRef.current.on('connect_error', (error) => {
        setConnectionError(error.message)
        setIsConnected(false)
      })

      // Listen for all message types
      const messageTypes = [
        'agent-status',
        'task-update', 
        'message',
        'metrics',
        'project-update'
      ]

      messageTypes.forEach(type => {
        socketRef.current?.on(type, (data: any) => {
          const message: WebSocketMessage = {
            type: type as WebSocketMessage['type'],
            data,
            timestamp: Date.now()
          }
          setLastMessage(message)
          onMessage?.(message)
        })
      })

    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed')
    }
  }, [url, onMessage, onConnect, onDisconnect, autoReconnect])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [])

  const sendMessage = useCallback((type: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, data)
    } else {
      console.warn('WebSocket not connected, cannot send message:', { type, data })
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionError,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    socket: socketRef.current
  }
}