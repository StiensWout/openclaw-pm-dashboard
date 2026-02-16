import { Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import Database from '../database/init';
import { OpenClawMessagingService } from '../services/openclawMessaging';
import { asyncHandler, createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { agentRateLimiter } from '../middleware/rateLimiter';
import { Agent, ApiResponse } from '../types';

export default function agentRoutes(
  io: SocketIOServer,
  db: Database,
  messaging: OpenClawMessagingService
) {
  const router = Router();

  // Apply rate limiting to all agent routes
  router.use(agentRateLimiter);

  /**
   * GET /api/agents
   * Get all agents
   */
  router.get('/', asyncHandler(async (req, res) => {
    const { status, type, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM agents WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const agents = await db.all(query, params);

    const response: ApiResponse<Agent[]> = {
      success: true,
      data: agents.map(transformAgentFromDB),
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * GET /api/agents/stats
   * Get agent statistics
   */
  router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await db.all(`
      SELECT 
        status,
        type,
        COUNT(*) as count,
        AVG(success_rate) as avg_success_rate,
        AVG(tasks_completed) as avg_tasks_completed,
        AVG(error_count) as avg_error_count
      FROM agents 
      GROUP BY status, type
    `);

    const totalAgents = await db.get('SELECT COUNT(*) as count FROM agents');
    const activeAgents = await db.get('SELECT COUNT(*) as count FROM agents WHERE status IN (?, ?, ?)', 
      ['active', 'idle', 'busy']);

    const response: ApiResponse = {
      success: true,
      data: {
        total: totalAgents.count,
        active: activeAgents.count,
        byStatus: stats.reduce((acc, stat) => {
          const key = `${stat.status}_${stat.type}`;
          acc[key] = {
            count: stat.count,
            avgSuccessRate: stat.avg_success_rate,
            avgTasksCompleted: stat.avg_tasks_completed,
            avgErrorCount: stat.avg_error_count
          };
          return acc;
        }, {} as any)
      },
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * GET /api/agents/:id
   * Get specific agent
   */
  router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const agent = await db.get('SELECT * FROM agents WHERE id = ?', [id]);
    if (!agent) {
      throw createNotFoundError('Agent');
    }

    // Get agent's recent tasks
    const recentTasks = await db.all(`
      SELECT * FROM tasks 
      WHERE assigned_agent_id = ? 
      ORDER BY updated_at DESC 
      LIMIT 10
    `, [id]);

    const response: ApiResponse = {
      success: true,
      data: {
        ...transformAgentFromDB(agent),
        recentTasks: recentTasks.map(transformTaskFromDB)
      },
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * POST /api/agents
   * Create new agent
   */
  router.post('/', asyncHandler(async (req, res) => {
    const { name, type, capabilities } = req.body;

    // Validation
    if (!name || !type) {
      throw createValidationError('Name and type are required');
    }

    const validTypes = ['frontend', 'backend', 'design', 'testing', 'deployment', 'coordination', 'analysis'];
    if (!validTypes.includes(type)) {
      throw createValidationError(`Type must be one of: ${validTypes.join(', ')}`);
    }

    const agentId = uuidv4();
    const agentData = {
      id: agentId,
      name,
      type,
      capabilities: JSON.stringify(capabilities || []),
      status: 'offline',
      tasks_completed: 0,
      average_task_time: 0,
      success_rate: 100,
      error_count: 0
    };

    await db.run(`
      INSERT INTO agents (
        id, name, type, capabilities, status, 
        tasks_completed, average_task_time, success_rate, error_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      agentData.id, agentData.name, agentData.type, agentData.capabilities,
      agentData.status, agentData.tasks_completed, agentData.average_task_time,
      agentData.success_rate, agentData.error_count
    ]);

    const newAgent = await db.get('SELECT * FROM agents WHERE id = ?', [agentId]);

    // Broadcast to all clients
    io.emit('agent_update', {
      type: 'created',
      agent: transformAgentFromDB(newAgent),
      timestamp: new Date()
    });

    const response: ApiResponse<Agent> = {
      success: true,
      data: transformAgentFromDB(newAgent),
      message: 'Agent created successfully',
      timestamp: new Date()
    };

    res.status(201).json(response);
  }));

  /**
   * PUT /api/agents/:id
   * Update agent
   */
  router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if agent exists
    const existingAgent = await db.get('SELECT * FROM agents WHERE id = ?', [id]);
    if (!existingAgent) {
      throw createNotFoundError('Agent');
    }

    // Build update query dynamically
    const allowedFields = ['name', 'type', 'capabilities', 'status', 'current_task'];
    const updateFields = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'capabilities') {
          updateFields.push(`${field} = ?`);
          params.push(JSON.stringify(updates[field]));
        } else {
          updateFields.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }
    }

    if (updateFields.length === 0) {
      throw createValidationError('No valid fields to update');
    }

    updateFields.push('updated_at = datetime(\'now\')');
    params.push(id);

    await db.run(`UPDATE agents SET ${updateFields.join(', ')} WHERE id = ?`, params);

    const updatedAgent = await db.get('SELECT * FROM agents WHERE id = ?', [id]);

    // Broadcast to all clients
    io.emit('agent_update', {
      type: 'updated',
      agent: transformAgentFromDB(updatedAgent),
      timestamp: new Date()
    });

    const response: ApiResponse<Agent> = {
      success: true,
      data: transformAgentFromDB(updatedAgent),
      message: 'Agent updated successfully',
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * DELETE /api/agents/:id
   * Delete agent
   */
  router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if agent exists
    const existingAgent = await db.get('SELECT * FROM agents WHERE id = ?', [id]);
    if (!existingAgent) {
      throw createNotFoundError('Agent');
    }

    // Check for active tasks
    const activeTasks = await db.get(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE assigned_agent_id = ? AND status IN ('assigned', 'in_progress')
    `, [id]);

    if (activeTasks.count > 0) {
      throw createValidationError('Cannot delete agent with active tasks');
    }

    await db.run('DELETE FROM agents WHERE id = ?', [id]);

    // Broadcast to all clients
    io.emit('agent_update', {
      type: 'deleted',
      agentId: id,
      timestamp: new Date()
    });

    // Notify
    await messaging.notifySystemEvent(
      'Agent Deleted',
      `Agent ${existingAgent.name} has been deleted`,
      'medium'
    );

    const response: ApiResponse = {
      success: true,
      message: 'Agent deleted successfully',
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * POST /api/agents/:id/assign-task
   * Assign task to agent
   */
  router.post('/:id/assign-task', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { taskId } = req.body;

    if (!taskId) {
      throw createValidationError('Task ID is required');
    }

    // Check if agent and task exist
    const [agent, task] = await Promise.all([
      db.get('SELECT * FROM agents WHERE id = ?', [id]),
      db.get('SELECT * FROM tasks WHERE id = ?', [taskId])
    ]);

    if (!agent) {
      throw createNotFoundError('Agent');
    }

    if (!task) {
      throw createNotFoundError('Task');
    }

    if (task.status !== 'pending') {
      throw createValidationError('Task is not available for assignment');
    }

    // Assign task
    await Promise.all([
      db.run('UPDATE tasks SET assigned_agent_id = ?, status = ? WHERE id = ?', [id, 'assigned', taskId]),
      db.run('UPDATE agents SET current_task = ? WHERE id = ?', [taskId, id])
    ]);

    // Get updated data
    const [updatedAgent, updatedTask] = await Promise.all([
      db.get('SELECT * FROM agents WHERE id = ?', [id]),
      db.get('SELECT * FROM tasks WHERE id = ?', [taskId])
    ]);

    // Broadcast updates
    io.emit('agent_update', {
      type: 'task_assigned',
      agent: transformAgentFromDB(updatedAgent),
      timestamp: new Date()
    });

    io.emit('task_update', {
      type: 'assigned',
      task: transformTaskFromDB(updatedTask),
      timestamp: new Date()
    });

    const response: ApiResponse = {
      success: true,
      data: {
        agent: transformAgentFromDB(updatedAgent),
        task: transformTaskFromDB(updatedTask)
      },
      message: 'Task assigned successfully',
      timestamp: new Date()
    };

    res.json(response);
  }));

  return router;
}

// Helper functions
function transformAgentFromDB(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    capabilities: JSON.parse(row.capabilities || '[]'),
    currentTask: row.current_task,
    socketId: row.socket_id,
    lastActivity: new Date(row.last_activity || row.updated_at),
    performance: {
      tasksCompleted: row.tasks_completed || 0,
      averageTaskTime: row.average_task_time || 0,
      successRate: row.success_rate || 100,
      lastTaskCompletionTime: row.last_task_completion_time ? new Date(row.last_task_completion_time) : undefined,
      errorCount: row.error_count || 0
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function transformTaskFromDB(row: any): any {
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