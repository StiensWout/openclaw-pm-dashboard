import { Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import Database from '../database/init';
import { OpenClawMessagingService } from '../services/openclawMessaging';
import { asyncHandler, createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { projectRateLimiter } from '../middleware/rateLimiter';
import { Project, Task, ApiResponse } from '../types';

export default function projectRoutes(
  io: SocketIOServer,
  db: Database,
  messaging: OpenClawMessagingService
) {
  const router = Router();

  // Apply rate limiting to all project routes
  router.use(projectRateLimiter);

  /**
   * GET /api/projects
   * Get all projects
   */
  router.get('/', asyncHandler(async (req, res) => {
    const { status, priority, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const projects = await db.all(query, params);

    const response: ApiResponse<Project[]> = {
      success: true,
      data: projects.map(transformProjectFromDB),
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * GET /api/projects/stats
   * Get project statistics
   */
  router.get('/stats', asyncHandler(async (req, res) => {
    const [statusStats, priorityStats, progressStats] = await Promise.all([
      db.all(`
        SELECT status, COUNT(*) as count, AVG(progress) as avg_progress
        FROM projects 
        GROUP BY status
      `),
      db.all(`
        SELECT priority, COUNT(*) as count
        FROM projects 
        GROUP BY priority
      `),
      db.get(`
        SELECT 
          COUNT(*) as total_projects,
          AVG(progress) as avg_progress,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects
        FROM projects
      `)
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        byStatus: statusStats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: stat.count,
            avgProgress: stat.avg_progress
          };
          return acc;
        }, {} as any),
        byPriority: priorityStats.reduce((acc, stat) => {
          acc[stat.priority] = stat.count;
          return acc;
        }, {} as any),
        overall: progressStats
      },
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * GET /api/projects/:id
   * Get specific project with tasks
   */
  router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      throw createNotFoundError('Project');
    }

    // Get project tasks
    const tasks = await db.all('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC', [id]);

    // Get assigned agents info
    const assignedAgentIds = JSON.parse(project.assigned_agents || '[]');
    const agents = assignedAgentIds.length > 0 
      ? await db.all(`SELECT * FROM agents WHERE id IN (${assignedAgentIds.map(() => '?').join(',')})`, assignedAgentIds)
      : [];

    const response: ApiResponse = {
      success: true,
      data: {
        ...transformProjectFromDB(project),
        tasks: tasks.map(transformTaskFromDB),
        agents: agents.map(transformAgentFromDB)
      },
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * POST /api/projects
   * Create new project
   */
  router.post('/', asyncHandler(async (req, res) => {
    const { name, description, priority = 'medium', assignedAgents = [], dueDate, metadata = {} } = req.body;

    // Validation
    if (!name) {
      throw createValidationError('Project name is required');
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      throw createValidationError(`Priority must be one of: ${validPriorities.join(', ')}`);
    }

    const projectId = uuidv4();
    const projectData = {
      id: projectId,
      name,
      description: description || '',
      status: 'planning',
      priority,
      assigned_agents: JSON.stringify(assignedAgents),
      tasks: JSON.stringify([]),
      progress: 0,
      due_date: dueDate || null,
      metadata: JSON.stringify(metadata)
    };

    await db.run(`
      INSERT INTO projects (
        id, name, description, status, priority, 
        assigned_agents, tasks, progress, due_date, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      projectData.id, projectData.name, projectData.description, 
      projectData.status, projectData.priority, projectData.assigned_agents,
      projectData.tasks, projectData.progress, projectData.due_date, projectData.metadata
    ]);

    const newProject = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);

    // Broadcast to all clients
    io.emit('project_update', {
      type: 'created',
      project: transformProjectFromDB(newProject),
      timestamp: new Date()
    });

    // Notify
    await messaging.notifySystemEvent(
      'New Project Created',
      `Project "${name}" has been created with ${assignedAgents.length} assigned agents`,
      'medium'
    );

    const response: ApiResponse<Project> = {
      success: true,
      data: transformProjectFromDB(newProject),
      message: 'Project created successfully',
      timestamp: new Date()
    };

    res.status(201).json(response);
  }));

  /**
   * PUT /api/projects/:id
   * Update project
   */
  router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if project exists
    const existingProject = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!existingProject) {
      throw createNotFoundError('Project');
    }

    // Build update query dynamically
    const allowedFields = ['name', 'description', 'status', 'priority', 'assigned_agents', 'progress', 'due_date', 'metadata'];
    const updateFields = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'assigned_agents' || field === 'metadata') {
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

    // Update completed_date if status is completed
    if (updates.status === 'completed' && existingProject.status !== 'completed') {
      updateFields.push('completed_date = datetime(\'now\')');
    }

    updateFields.push('updated_at = datetime(\'now\')');
    params.push(id);

    await db.run(`UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`, params);

    // Update project tasks in the tasks array if needed
    if (updates.status && ['completed', 'cancelled'].includes(updates.status)) {
      // Update all pending/assigned tasks to cancelled if project is cancelled
      if (updates.status === 'cancelled') {
        await db.run(`
          UPDATE tasks 
          SET status = 'cancelled', updated_at = datetime('now')
          WHERE project_id = ? AND status IN ('pending', 'assigned')
        `, [id]);
      }
    }

    const updatedProject = await db.get('SELECT * FROM projects WHERE id = ?', [id]);

    // Calculate progress based on tasks if not explicitly provided
    if (updates.progress === undefined) {
      const taskStats = await db.get(`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
        FROM tasks WHERE project_id = ?
      `, [id]);

      if (taskStats.total_tasks > 0) {
        const calculatedProgress = (taskStats.completed_tasks / taskStats.total_tasks) * 100;
        await db.run('UPDATE projects SET progress = ? WHERE id = ?', [calculatedProgress, id]);
      }
    }

    // Get final updated project
    const finalProject = await db.get('SELECT * FROM projects WHERE id = ?', [id]);

    // Broadcast to all clients
    io.emit('project_update', {
      type: 'updated',
      project: transformProjectFromDB(finalProject),
      timestamp: new Date()
    });

    // Notify on important status changes
    if (updates.status && updates.status !== existingProject.status) {
      await messaging.notifyProjectUpdate(
        finalProject.name,
        updates.status,
        finalProject.progress
      );
    }

    const response: ApiResponse<Project> = {
      success: true,
      data: transformProjectFromDB(finalProject),
      message: 'Project updated successfully',
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * DELETE /api/projects/:id
   * Delete project and all its tasks
   */
  router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { force = false } = req.query;

    // Check if project exists
    const existingProject = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!existingProject) {
      throw createNotFoundError('Project');
    }

    // Check for active tasks unless force delete
    if (!force) {
      const activeTasks = await db.get(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE project_id = ? AND status IN ('assigned', 'in_progress')
      `, [id]);

      if (activeTasks.count > 0) {
        throw createValidationError('Cannot delete project with active tasks. Use force=true to override.');
      }
    }

    // Delete project (this will cascade delete tasks due to foreign key constraint)
    await db.run('DELETE FROM projects WHERE id = ?', [id]);

    // Broadcast to all clients
    io.emit('project_update', {
      type: 'deleted',
      projectId: id,
      timestamp: new Date()
    });

    // Notify
    await messaging.notifySystemEvent(
      'Project Deleted',
      `Project "${existingProject.name}" has been deleted${force ? ' (force delete)' : ''}`,
      'medium'
    );

    const response: ApiResponse = {
      success: true,
      message: 'Project deleted successfully',
      timestamp: new Date()
    };

    res.json(response);
  }));

  /**
   * POST /api/projects/:id/tasks
   * Create task for project
   */
  router.post('/:id/tasks', asyncHandler(async (req, res) => {
    const { id: projectId } = req.params;
    const { title, description, priority = 'medium', dependencies = [], estimatedDuration, dueDate } = req.body;

    // Check if project exists
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      throw createNotFoundError('Project');
    }

    // Validation
    if (!title) {
      throw createValidationError('Task title is required');
    }

    const taskId = uuidv4();
    const taskData = {
      id: taskId,
      project_id: projectId,
      title,
      description: description || '',
      status: 'pending',
      priority,
      dependencies: JSON.stringify(dependencies),
      estimated_duration: estimatedDuration || null,
      due_date: dueDate || null,
      metadata: JSON.stringify({})
    };

    await db.run(`
      INSERT INTO tasks (
        id, project_id, title, description, status, priority,
        dependencies, estimated_duration, due_date, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      taskData.id, taskData.project_id, taskData.title, taskData.description,
      taskData.status, taskData.priority, taskData.dependencies,
      taskData.estimated_duration, taskData.due_date, taskData.metadata
    ]);

    // Update project tasks array
    const projectTasks = JSON.parse(project.tasks || '[]');
    projectTasks.push(taskId);
    await db.run('UPDATE projects SET tasks = ?, updated_at = datetime(\'now\') WHERE id = ?', 
      [JSON.stringify(projectTasks), projectId]);

    const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);

    // Broadcast to all clients
    io.emit('task_update', {
      type: 'created',
      task: transformTaskFromDB(newTask),
      timestamp: new Date()
    });

    const response: ApiResponse<Task> = {
      success: true,
      data: transformTaskFromDB(newTask),
      message: 'Task created successfully',
      timestamp: new Date()
    };

    res.status(201).json(response);
  }));

  /**
   * GET /api/projects/:id/timeline
   * Get project timeline and milestones
   */
  router.get('/:id/timeline', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      throw createNotFoundError('Project');
    }

    // Get tasks with timing information
    const tasks = await db.all(`
      SELECT *, 
        CASE 
          WHEN started_at IS NOT NULL AND completed_at IS NOT NULL 
          THEN (julianday(completed_at) - julianday(started_at)) * 24 * 60
          ELSE NULL 
        END as actual_duration_minutes
      FROM tasks 
      WHERE project_id = ? 
      ORDER BY created_at ASC
    `, [id]);

    // Create timeline events
    const timeline = [];
    
    // Project start
    timeline.push({
      type: 'project_start',
      timestamp: project.created_at,
      title: 'Project Created',
      description: project.name
    });

    // Task events
    for (const task of tasks) {
      if (task.started_at) {
        timeline.push({
          type: 'task_start',
          timestamp: task.started_at,
          title: `Task Started: ${task.title}`,
          description: `Status: ${task.status}`,
          taskId: task.id
        });
      }

      if (task.completed_at) {
        timeline.push({
          type: 'task_complete',
          timestamp: task.completed_at,
          title: `Task ${task.status === 'completed' ? 'Completed' : 'Ended'}: ${task.title}`,
          description: `Final status: ${task.status}`,
          taskId: task.id
        });
      }
    }

    // Project completion
    if (project.completed_date) {
      timeline.push({
        type: 'project_complete',
        timestamp: project.completed_date,
        title: 'Project Completed',
        description: `Final progress: ${project.progress}%`
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const response: ApiResponse = {
      success: true,
      data: {
        project: transformProjectFromDB(project),
        tasks: tasks.map(transformTaskFromDB),
        timeline
      },
      timestamp: new Date()
    };

    res.json(response);
  }));

  return router;
}

// Helper functions
function transformProjectFromDB(row: any): Project {
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

function transformAgentFromDB(row: any): any {
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