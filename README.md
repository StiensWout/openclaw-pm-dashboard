# OpenClaw Multi-Agent Project Management Dashboard

A real-time project management dashboard designed for multi-agent coordination and collaboration within the OpenClaw ecosystem.

## Overview

This dashboard provides a centralized interface for managing projects, coordinating multiple AI agents, and tracking real-time progress across various tasks and workflows. It leverages OpenClaw's agent infrastructure to enable seamless collaboration between human users and AI agents.

## Architecture

```
openclaw-pm-dashboard/
├── frontend/           # React-based dashboard UI
├── backend/            # Express API server with Socket.io
├── agents/             # Agent implementations and coordinators
├── shared/             # Shared utilities and types
└── docs/              # Project documentation
```

## Features

- **Real-time Updates**: Live project status updates via Socket.io
- **Multi-Agent Coordination**: Seamlessly manage and communicate with multiple AI agents
- **Task Management**: Create, assign, and track tasks across agents and humans
- **Visual Dashboard**: Interactive charts and progress visualization
- **Agent Status Monitoring**: Real-time agent health and activity monitoring
- **Project Analytics**: Insights into project progress and agent performance

## Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **Material-UI** - Component library for consistent design
- **Socket.io Client** - Real-time communication
- **Recharts** - Data visualization
- **React Router** - Navigation and routing

### Backend
- **Express.js** - Web server framework
- **Socket.io** - Real-time bidirectional communication
- **Node.js** - Runtime environment
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logging

### Agents
- **OpenClaw SDK** - Agent framework integration
- **WebSocket Communication** - Real-time agent messaging
- **Task Queue Management** - Distributed task processing

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd openclaw-pm-dashboard
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd ../backend
   npm install
   ```

### Development

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Configuration

Create a `.env` file in the backend directory:
```env
PORT=3001
NODE_ENV=development
OPENCLAW_API_URL=http://localhost:8080
SOCKET_IO_CORS_ORIGIN=http://localhost:3000
```

## Project Structure

### Frontend (`/frontend`)
- `src/components/` - Reusable UI components
- `src/pages/` - Main dashboard pages
- `src/services/` - API and Socket.io services
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React context providers

### Backend (`/backend`)
- `routes/` - Express route handlers
- `services/` - Business logic and external integrations
- `middleware/` - Express middleware
- `sockets/` - Socket.io event handlers
- `models/` - Data models and schemas

### Agents (`/agents`)
- `coordinators/` - High-level agent coordination logic
- `workers/` - Specific task-focused agents
- `utils/` - Agent utility functions
- `types/` - Agent interface definitions

### Shared (`/shared`)
- `types/` - TypeScript type definitions
- `utils/` - Common utility functions
- `constants/` - Shared constants and configuration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please refer to the OpenClaw documentation or create an issue in this repository.