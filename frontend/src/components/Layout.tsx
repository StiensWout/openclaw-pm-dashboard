import React, { useState } from 'react'
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Settings,
  Zap,
  Activity
} from 'lucide-react'
import { cn } from '../lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'agents', label: 'Agents', icon: Users, path: '/agents' },
  { id: 'projects', label: 'Projects', icon: BarChart3, path: '/projects' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' },
  { id: 'metrics', label: 'Metrics', icon: Activity, path: '/metrics' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false) // Start closed on mobile
  const [activeNav, setActiveNav] = useState('dashboard')

  return (
    <div className="min-h-screen bg-dark-950 flex relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "bg-dark-900 border-r border-dark-800 transition-all duration-300 flex flex-col z-50",
        // Mobile: fixed overlay sidebar
        "fixed lg:static inset-y-0 left-0",
        sidebarOpen 
          ? "w-64 translate-x-0" 
          : "w-64 -translate-x-full lg:translate-x-0 lg:w-16"
      )}>
        {/* Logo/Header */}
        <div className="p-4 border-b border-dark-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-openclaw-primary to-openclaw-secondary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold text-white">OpenClaw</h1>
                <p className="text-xs text-gray-400">Agent Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeNav === item.id
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveNav(item.id)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left",
                      isActive 
                        ? "bg-openclaw-primary text-white shadow-lg" 
                        : "text-gray-300 hover:bg-dark-800 hover:text-white"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 flex-shrink-0",
                      isActive ? "text-white" : "text-gray-400"
                    )} />
                    {sidebarOpen && (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-dark-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-dark-800 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Bar */}
        <header className="bg-dark-900 border-b border-dark-800 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:bg-dark-800 hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div>
                <h2 className="text-xl font-semibold text-white capitalize">
                  {navItems.find(item => item.id === activeNav)?.label || 'Dashboard'}
                </h2>
                <p className="text-sm text-gray-400 hidden sm:block">
                  Multi-Agent Project Management System
                </p>
              </div>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300 hidden sm:inline">Connected</span>
              </div>
              
              <div className="text-sm text-gray-400 hidden md:block">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}