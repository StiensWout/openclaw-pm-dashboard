import { Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import Database from '../database/init';
import { OpenClawMessagingService } from '../services/openclawMessaging';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

export default function analyticsRoutes(
  io: SocketIOServer,
  db: Database,
  messaging: OpenClawMessagingService
) {
  const router = Router();

  // GET /api/analytics/overview
  router.get('/overview', asyncHandler(async (req, res) => {
    const [agentStats, projectStats, taskStats, recentActivity] = await Promise.all([
      // Agent statistics
      db.all(`
        SELECT 
          status,
          type,
          COUNT(*) as count,
          AVG(success_rate) as avg_success_rate,
          SUM(tasks_completed) as total_tasks_completed
        FROM agents 
        GROUP BY status, type
      `),
      
      // Project statistics
      db.all(`
        SELECT 
          status,
          priority,
          COUNT(*) as count,
          AVG(progress) as avg_progress
        FROM projects 
        GROUP BY status, priority
      `),
      
      // Task statistics
      db.all(`
        SELECT 
          status,
          priority,
          COUNT(*) as count,
          AVG(CASE WHEN actual_duration IS NOT NULL THEN actual_duration ELSE estimated_duration END) as avg_duration
        FROM tasks 
        GROUP BY status, priority
      `),
      
      // Recent activity
      db.all(`
        SELECT 'task' as type, title as name, status, updated_at as timestamp FROM tasks 
        WHERE updated_at > datetime('now', '-24 hours')
        UNION ALL
        SELECT 'project' as type, name, status, updated_at as timestamp FROM projects 
        WHERE updated_at > datetime('now', '-24 hours')
        ORDER BY timestamp DESC LIMIT 20
      `)
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        agents: {
          byStatus: agentStats.reduce((acc, stat) => {
            const key = `${stat.status}_${stat.type}`;
            acc[key] = {
              count: stat.count,
              avgSuccessRate: stat.avg_success_rate,
              totalTasksCompleted: stat.total_tasks_completed
            };
            return acc;
          }, {} as any)
        },
        projects: {
          byStatus: projectStats.reduce((acc, stat) => {
            const key = `${stat.status}_${stat.priority}`;
            acc[key] = {
              count: stat.count,
              avgProgress: stat.avg_progress
            };
            return acc;
          }, {} as any)
        },
        tasks: {
          byStatus: taskStats.reduce((acc, stat) => {
            const key = `${stat.status}_${stat.priority}`;
            acc[key] = {
              count: stat.count,
              avgDuration: stat.avg_duration
            };
            return acc;
          }, {} as any)
        },
        recentActivity
      },
      timestamp: new Date()
    };

    res.json(response);
  }));

  // GET /api/analytics/performance
  router.get('/performance', asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case '1d':
        dateFilter = "datetime('now', '-1 day')";
        break;
      case '7d':
        dateFilter = "datetime('now', '-7 days')";
        break;
      case '30d':
        dateFilter = "datetime('now', '-30 days')";
        break;
      default:
        dateFilter = "datetime('now', '-7 days')";
    }

    const [taskCompletion, agentPerformance, projectProgress] = await Promise.all([
      // Task completion over time
      db.all(`
        SELECT 
          DATE(completed_at) as date,
          status,
          COUNT(*) as count
        FROM tasks 
        WHERE completed_at > ${dateFilter}
        GROUP BY DATE(completed_at), status
        ORDER BY date DESC
      `),
      
      // Agent performance metrics
      db.all(`
        SELECT 
          a.name,
          a.type,
          a.success_rate,
          a.tasks_completed,
          a.error_count,
          COUNT(t.id) as recent_tasks
        FROM agents a
        LEFT JOIN tasks t ON a.id = t.assigned_agent_id AND t.updated_at > ${dateFilter}
        GROUP BY a.id
        ORDER BY a.success_rate DESC
      `),
      
      // Project progress trends
      db.all(`
        SELECT 
          name,
          status,
          progress,
          DATE(updated_at) as last_updated,
          CASE 
            WHEN due_date IS NOT NULL THEN 
              CASE 
                WHEN due_date < datetime('now') AND status != 'completed' THEN 'overdue'
                WHEN due_date < datetime('now', '+7 days') THEN 'due_soon'
                ELSE 'on_track'
              END
            ELSE 'no_due_date'
          END as status_flag
        FROM projects
        WHERE updated_at > ${dateFilter}
        ORDER BY updated_at DESC
      `)
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        period,
        taskCompletion,
        agentPerformance,
        projectProgress
      },
      timestamp: new Date()
    };

    res.json(response);
  }));

  return router;
}