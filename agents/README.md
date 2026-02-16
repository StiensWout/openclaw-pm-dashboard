# Agents Directory

This directory contains the agent implementations for the OpenClaw Multi-Agent Project Management Dashboard.

## Structure

- `coordinators/` - High-level coordination agents that manage workflows and distribute tasks
- `workers/` - Specialized task-execution agents for specific domains
- `utils/` - Shared agent utilities and helper functions
- `types/` - Agent-specific type definitions and interfaces

## Agent Types

### Coordinators
- **ProjectCoordinator**: Manages overall project workflow and task distribution
- **ResourceCoordinator**: Handles resource allocation and agent load balancing
- **CommunicationCoordinator**: Manages inter-agent communication and message routing

### Workers
- **TaskExecutor**: Generic task execution agent for simple operations
- **DataProcessor**: Specialized agent for data analysis and processing tasks
- **FileManager**: Handles file operations and document management
- **NotificationManager**: Manages notifications and alerts to users

## Integration

All agents integrate with the OpenClaw framework and communicate via:
- Socket.io for real-time updates
- REST API for state management
- WebSocket connections for direct agent-to-agent communication

## Development

To create a new agent:
1. Extend the base Agent class
2. Implement required methods (execute, handleMessage, getStatus)
3. Register the agent with the coordination system
4. Add appropriate error handling and logging

See individual agent implementations for specific usage examples.