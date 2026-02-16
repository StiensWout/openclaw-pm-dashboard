import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import Database from '../database/init';
import { OpenClawMessagingService } from './openclawMessaging';
import { websocketRateLimiter } from '../middleware/rateLimiter';
import { Agent, Task, Project, Communication, SocketEvent } from '../types';

interface ConnectedAgent {
  socketId: string;
  agentId: string;
  name: string;
  type: string;
  connectedAt: Date;
  lastActivity: Date;
}

export class SocketService {
  private io: SocketIOServer;
  private db: Database;
  private messaging: OpenClawMessagingService;
  private connectedAgents: Map<string, ConnectedAgent> = new Map();
  private connectedClients: Set<string> = new Set();

  constructor(io: SocketIOServer, db: Database, messaging: OpenClawMessagingService) {
    this.io = io;
    this.db = db;
    this.messaging = messaging;
  }

  public setupHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    // Setup periodic cleanup
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Every minute
  }

  private async handleConnection(socket: Socket): Promise<void> {
    const clientIp = socket.handshake.address;
    console.log(`🔌 Client connected: ${socket.id} from ${clientIp}`);

    this.connectedClients.add(socket.id);

    // Send initial data
    try {
      await this.sendInitialData(socket);
    } catch (error) {
      console.error('Error sending initial data:', error);
    }

    // Set up event handlers
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });
  }

  private async sendInitialData(socket: Socket): Promise<void> {
    try {
      // Get current data from database
      const [agents, projects, tasks] = await Promise.all([
        this.db.all('SELECT * FROM agents ORDER BY created_at DESC'),
        this.db.all('SELECT * FROM projects ORDER BY created_at DESC'),
        this.db.all('SELECT * FROM tasks ORDER BY created_at DESC')
      ]);

      // Send initial data
      socket.emit('initial_data', {
        agents: agents.map(this.transformAgentFromDB),
        projects: projects.map(this.transformProjectFromDB),
        tasks: tasks.map(this.transformTaskFromDB),
        connectedAgents: Array.from(this.connectedAgents.values()),
        timestamp: new Date()
      });

      console.log(`📊 Sent initial data to ${socket.id}: ${agents.length} agents, ${projects.length} projects, ${tasks.length} tasks`);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      socket.emit('error', { message: 'Failed to fetch initial data' });
    }
  }

  private setupEventHandlers(socket: Socket): void {
    // Agent registration
    socket.on('agent_register', async (data) => {
      await this.handleAgentRegistration(socket, data);
    });

    // Agent status updates
    socket.on('agent_status', async (data) => {
      await this.handleAgentStatusUpdate(socket, data);
    });

    // Task updates
    socket.on('task_update', async (data) => {
      await this.handleTaskUpdate(socket, data);
    });

    // Project updates
    socket.on('project_update', async (data) => {
      await this.handleProjectUpdate(socket, data);
    });

    // Inter-agent communication
    socket.on('agent_message', async (data) => {
      await this.handleAgentMessage(socket, data);
    });

    // Request user input
    socket.on('request_user_input', async (data) => {
      await this.handleUserInputRequest(socket, data);
    });

    // Heartbeat/ping
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // Subscribe to specific events
    socket.on('subscribe', (data) => {
      this.handleSubscription(socket, data);
    });

    // Generic event handler with rate limiting
    socket.use(async (packet, next) => {
      const canProceed = await websocketRateLimiter(socket.id, socket.handshake.address);
      if (canProceed) {
        next();
      } else {
        socket.emit('rate_limit_exceeded', {
          message: 'Rate limit exceeded. Please slow down your requests.',
          timestamp: new Date()
        });
      }
    });
  }

  private async handleAgentRegistration(socket: Socket, data: any): Promise<void> {
    try {
      const agentData = {
        id: data.id || uuidv4(),
        name: data.name,
        type: data.type,
        capabilities: JSON.stringify(data.capabilities || []),
        status: 'active',
        socket_id: socket.id,
        last_activity: new Date().toISOString()
      };

      // Insert or update agent in database
      await this.db.run(`
        INSERT OR REPLACE INTO agents (
          id, name, type, capabilities, status, socket_id, last_activity,
          tasks_completed, average_task_time, success_rate, error_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 
          COALESCE((SELECT tasks_completed FROM agents WHERE id = ?), 0),
          COALESCE((SELECT average_task_time FROM agents WHERE id = ?), 0),
          COALESCE((SELECT success_rate FROM agents WHERE id = ?), 100),
          COALESCE((SELECT error_count FROM agents WHERE id = ?), 0),
          COALESCE((SELECT created_at FROM agents WHERE id = ?), datetime('now')),
          datetime('now')
        )
      `, [
        agentData.id, agentData.name, agentData.type, agentData.capabilities,
        agentData.status, agentData.socket_id, agentData.last_activity,
        agentData.id, agentData.id, agentData.id, agentData.id, agentData.id
      ]);

      // Store in connected agents
      this.connectedAgents.set(socket.id, {
        socketId: socket.id,
        agentId: agentData.id,
        name: agentData.name,
        type: agentData.type,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Get the updated agent from database
      const updatedAgent = await this.db.get('SELECT * FROM agents WHERE id = ?', [agentData.id]);

      console.log(`🤖 Agent registered: ${agentData.name} (${agentData.type}) - Socket: ${socket.id}`);

      // Broadcast to all clients
      this.io.emit('agent_update', {
        type: 'registered',
        agent: this.transformAgentFromDB(updatedAgent),
        timestamp: new Date()
      });

      // Notify user
      await this.messaging.notifyAgentStatusChange(agentData.name, 'registered', `Agent connected and ready`);

    } catch (error) {
      console.error('Error registering agent:', error);
      socket.emit('registration_error', { message: 'Failed to register agent' });
    }
  }

  private async handleAgentStatusUpdate(socket: Socket, data: any): Promise<void> {
    try {
      const connectedAgent = this.connectedAgents.get(socket.id);
      if (!connectedAgent) {
        socket.emit('error', { message: 'Agent not registered' });
        return;
      }

      // Update agent status in database
      await this.db.run(`
        UPDATE agents 
        SET status = ?, current_task = ?, last_activity = datetime('now')
        WHERE socket_id = ?
      `, [data.status, data.currentTask, socket.id]);

      // Update connected agents map
      connectedAgent.lastActivity = new Date();

      // Get updated agent
      const updatedAgent = await this.db.get('SELECT * FROM agents WHERE socket_id = ?', [socket.id]);

      // Broadcast update
      this.io.emit('agent_update', {
        type: 'status_updated',
        agent: this.transformAgentFromDB(updatedAgent),
        timestamp: new Date()
      });

      // Notify on important status changes
      if (data.status === 'error') {
        await this.messaging.notifyAgentStatusChange(
          connectedAgent.name,
          data.status,
          data.errorMessage || 'Agent reported an error'
        );
      }

    } catch (error) {
      console.error('Error updating agent status:', error);
      socket.emit('error', { message: 'Failed to update agent status' });
    }
  }

  private async handleTaskUpdate(socket: Socket, data: any): Promise<void> {
    try {
      const { taskId, status, progress, metadata } = data;

      // Update task in database
      await this.db.run(`
        UPDATE tasks 
        SET status = ?, 
            started_at = CASE WHEN status = 'in_progress' AND started_at IS NULL THEN datetime('now') ELSE started_at END,
            completed_at = CASE WHEN status IN ('completed', 'failed') THEN datetime('now') ELSE completed_at END,
            metadata = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `, [status, JSON.stringify(metadata || {}), taskId]);

      // Get updated task
      const updatedTask = await this.db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
      if (!updatedTask) {
        socket.emit('error', { message: 'Task not found' });
        return;
      }

      // Broadcast update
      this.io.emit('task_update', {
        type: 'updated',
        task: this.transformTaskFromDB(updatedTask),
        timestamp: new Date()
      });

      // Update agent performance
      const connectedAgent = this.connectedAgents.get(socket.id);
      if (connectedAgent && (status === 'completed' || status === 'failed')) {
        await this.updateAgentPerformance(connectedAgent.agentId, status === 'completed');
        
        // Notify task completion
        await this.messaging.notifyTaskUpdate(
          updatedTask.title,
          status,
          connectedAgent.name
        );
      }

    } catch (error) {
      console.error('Error updating task:', error);
      socket.emit('error', { message: 'Failed to update task' });
    }
  }

  private async handleProjectUpdate(socket: Socket, data: any): Promise<void> {
    try {
      const { projectId, status, progress, metadata } = data;

      // Update project in database
      await this.db.run(`
        UPDATE projects 
        SET status = ?, progress = ?, metadata = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [status, progress, JSON.stringify(metadata || {}), projectId]);

      // Get updated project
      const updatedProject = await this.db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
      if (!updatedProject) {
        socket.emit('error', { message: 'Project not found' });
        return;
      }

      // Broadcast update
      this.io.emit('project_update', {
        type: 'updated',
        project: this.transformProjectFromDB(updatedProject),
        timestamp: new Date()
      });

      // Notify significant project changes
      if (status === 'completed') {
        await this.messaging.notifyProjectUpdate(updatedProject.name, status, progress);
      }

    } catch (error) {
      console.error('Error updating project:', error);
      socket.emit('error', { message: 'Failed to update project' });
    }
  }

  private async handleAgentMessage(socket: Socket, data: any): Promise<void> {
    try {
      const connectedAgent = this.connectedAgents.get(socket.id);
      if (!connectedAgent) {
        socket.emit('error', { message: 'Agent not registered' });
        return;
      }

      const messageId = uuidv4();
      const message = {
        id: messageId,
        from_agent_id: connectedAgent.agentId,
        to_agent_id: data.toAgentId,
        type: data.type || 'coordination',
        message: data.message,
        metadata: JSON.stringify(data.metadata || {}),
        timestamp: new Date().toISOString(),
        read: 0,
        project_id: data.projectId,
        task_id: data.taskId
      };

      // Store message in database
      await this.db.run(`
        INSERT INTO communications (
          id, from_agent_id, to_agent_id, type, message, metadata,
          timestamp, read, project_id, task_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        message.id, message.from_agent_id, message.to_agent_id, message.type,
        message.message, message.metadata, message.timestamp, message.read,
        message.project_id, message.task_id
      ]);

      // Broadcast to all clients
      this.io.emit('agent_message', {
        type: 'new',
        message: this.transformCommunicationFromDB(message),
        timestamp: new Date()
      });

      // Send directly to target agent if connected
      if (data.toAgentId) {
        const targetSocket = Array.from(this.connectedAgents.entries())
          .find(([_, agent]) => agent.agentId === data.toAgentId)?.[0];
        
        if (targetSocket) {
          this.io.to(targetSocket).emit('direct_message', {
            message: this.transformCommunicationFromDB(message),
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      console.error('Error handling agent message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleUserInputRequest(socket: Socket, data: any): Promise<void> {
    try {
      const connectedAgent = this.connectedAgents.get(socket.id);
      if (!connectedAgent) {
        socket.emit('error', { message: 'Agent not registered' });
        return;
      }

      // Notify user via OpenClaw
      await this.messaging.requestUserInput(
        data.context || 'Agent needs input',
        data.question || 'Please provide guidance',
        connectedAgent.name
      );

      // Broadcast to dashboard clients
      this.io.emit('user_input_request', {
        agentId: connectedAgent.agentId,
        agentName: connectedAgent.name,
        context: data.context,
        question: data.question,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error handling user input request:', error);
      socket.emit('error', { message: 'Failed to request user input' });
    }
  }

  private handleSubscription(socket: Socket, data: any): void {
    const { events } = data;
    if (Array.isArray(events)) {
      events.forEach(event => {
        socket.join(`subscribe:${event}`);
      });
      console.log(`📡 Socket ${socket.id} subscribed to events: ${events.join(', ')}`);
    }
  }

  private handleDisconnection(socket: Socket, reason: string): void {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);

    this.connectedClients.delete(socket.id);

    const connectedAgent = this.connectedAgents.get(socket.id);
    if (connectedAgent) {
      // Mark agent as offline in database
      this.db.run('UPDATE agents SET status = ?, last_activity = datetime(\'now\') WHERE socket_id = ?', 
        ['offline', socket.id])
        .then(() => {
          // Broadcast agent disconnection
          this.io.emit('agent_update', {
            type: 'disconnected',
            agent: { ...connectedAgent, status: 'offline' },
            timestamp: new Date()
          });

          // Notify if agent was working on something important
          this.messaging.notifyAgentStatusChange(
            connectedAgent.name,
            'disconnected',
            `Agent disconnected: ${reason}`
          );
        })
        .catch(console.error);

      this.connectedAgents.delete(socket.id);
    }
  }

  private async updateAgentPerformance(agentId: string, success: boolean): Promise<void> {
    try {
      const agent = await this.db.get('SELECT * FROM agents WHERE id = ?', [agentId]);
      if (!agent) return;

      const tasksCompleted = agent.tasks_completed + 1;
      const successRate = ((agent.success_rate * agent.tasks_completed) + (success ? 100 : 0)) / tasksCompleted;
      const errorCount = success ? agent.error_count : agent.error_count + 1;

      await this.db.run(`
        UPDATE agents 
        SET tasks_completed = ?, success_rate = ?, error_count = ?, 
            last_task_completion_time = datetime('now')
        WHERE id = ?
      `, [tasksCompleted, successRate, errorCount, agentId]);

    } catch (error) {
      console.error('Error updating agent performance:', error);
    }
  }

  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    this.connectedAgents.forEach((agent, socketId) => {
      const timeSinceActivity = now.getTime() - agent.lastActivity.getTime();
      if (timeSinceActivity > staleThreshold) {
        console.log(`🧹 Cleaning up stale connection: ${socketId} (${agent.name})`);
        this.connectedAgents.delete(socketId);
      }
    });
  }

  // Transform database rows to API objects
  private transformAgentFromDB(row: any): Agent {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      capabilities: JSON.parse(row.capabilities || '[]'),
      currentTask: row.current_task,
      socketId: row.socket_id,
      lastActivity: new Date(row.last_activity),
      performance: {
        tasksCompleted: row.tasks_completed,
        averageTaskTime: row.average_task_time,
        successRate: row.success_rate,
        lastTaskCompletionTime: row.last_task_completion_time ? new Date(row.last_task_completion_time) : undefined,
        errorCount: row.error_count
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private transformProjectFromDB(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedAgents: JSON.parse(row.assigned_agents || '[]'),
      tasks: JSON.parse(row.tasks || '[]'),
      progress: row.progress,
      startDate: row.start_date ? new Date(row.start_date) : undefined,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      completedDate: row.completed_date ? new Date(row.completed_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private transformTaskFromDB(row: any): Task {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedAgentId: row.assigned_agent_id,
      dependencies: JSON.parse(row.dependencies || '[]'),
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private transformCommunicationFromDB(row: any): Communication {
    return {
      id: row.id,
      fromAgentId: row.from_agent_id,
      toAgentId: row.to_agent_id,
      type: row.type,
      message: row.message,
      metadata: JSON.parse(row.metadata || '{}'),
      timestamp: new Date(row.timestamp),
      read: !!row.read,
      projectId: row.project_id,
      taskId: row.task_id
    };
  }

  // Public methods for external access
  public getConnectedAgents(): ConnectedAgent[] {
    return Array.from(this.connectedAgents.values());
  }

  public getConnectedClientCount(): number {
    return this.connectedClients.size;
  }

  public async broadcastSystemMessage(message: string, type: string = 'info'): Promise<void> {
    this.io.emit('system_message', {
      type,
      message,
      timestamp: new Date()
    });
  }
}

// Export setup function
export function setupSocketHandlers(
  io: SocketIOServer,
  db: Database,
  messaging: OpenClawMessagingService
): SocketService {
  const socketService = new SocketService(io, db, messaging);
  socketService.setupHandlers();
  return socketService;
}