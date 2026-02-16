import { Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import Database from '../database/init';
import { OpenClawMessagingService } from '../services/openclawMessaging';
import { asyncHandler, createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { taskRateLimiter } from '../middleware/rateLimiter';
import { Task, ApiResponse } from '../types';

export default function taskRoutes(
  io: SocketIOServer,
  db: Database,
  messaging: OpenClawMessagingService
) {
  const router = Router();

  router.use(taskRateLimiter);

  // GET /api/tasks
  router.get('/', asyncHandler(async (req, res) => {
    const { status, projectId, assignedAgentId, priority, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    if (assignedAgentId) {
      query += ' AND assigned_agent_id = ?';
      params.push(assignedAgentId);
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const tasks = await db.all(query, params);

    const response: ApiResponse<Task[]> = {
      success: true,
      data: tasks.map(transformTaskFromDB),
      timestamp: new Date()
    };

    res.json(response);
  }));

  // PUT /api/tasks/:id
  router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const existingTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!existingTask) {
      throw createNotFoundError('Task');
    }

    const allowedFields = ['title', 'description', 'status', 'priority', 'assigned_agent_id', 'dependencies', 'estimated_duration', 'due_date', 'metadata'];
    const updateFields = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'dependencies' || field === 'metadata') {
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

    await db.run(`UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`, params);

    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);

    io.emit('task_update', {
      type: 'updated',
      task: transformTaskFromDB(updatedTask),
      timestamp: new Date()
    });

    const response: ApiResponse<Task> = {
      success: true,
      data: transformTaskFromDB(updatedTask),
      message: 'Task updated successfully',
      timestamp: new Date()
    };

    res.json(response);
  }));

  return router;
}

function transformTaskFromDB(row: any): Task {
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