import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Log environment information
console.log('OpenClaw Multi-Agent Dashboard')
console.log('Environment:', import.meta.env.MODE)
console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:3001')
console.log('WebSocket URL:', import.meta.env.VITE_WS_URL || 'ws://localhost:3001')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)