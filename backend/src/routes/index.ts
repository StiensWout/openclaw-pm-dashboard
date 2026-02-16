import { Application } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import Database from '../database/init';
import { OpenClawMessagingService } from '../services/openclawMessaging';

// Import route modules
import agentRoutes from './agents';
import projectRoutes from './projects';
import taskRoutes from './tasks';
import communicationRoutes from './communications';
import analyticsRoutes from './analytics';

export function setupRoutes(
  app: Application,
  io: SocketIOServer,
  db: Database,
  messaging: OpenClawMessagingService
): void {
  // API base path
  const apiPrefix = '/api';

  // Mount route modules
  app.use(`${apiPrefix}/agents`, agentRoutes(io, db, messaging));
  app.use(`${apiPrefix}/projects`, projectRoutes(io, db, messaging));
  app.use(`${apiPrefix}/tasks`, taskRoutes(io, db, messaging));
  app.use(`${apiPrefix}/communications`, communicationRoutes(io, db, messaging));
  app.use(`${apiPrefix}/analytics`, analyticsRoutes(io, db, messaging));

  // API status endpoint
  app.get(`${apiPrefix}/status`, (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      endpoints: [
        'GET /api/status',
        'GET /api/agents',
        'POST /api/agents',
        'GET /api/projects',
        'POST /api/projects',
        'GET /api/tasks',
        'POST /api/tasks',
        'GET /api/communications',
        'GET /api/analytics/*'
      ]
    });
  });

  console.log('✅ API routes configured:');
  console.log(`   ${apiPrefix}/status`);
  console.log(`   ${apiPrefix}/agents/*`);
  console.log(`   ${apiPrefix}/projects/*`);
  console.log(`   ${apiPrefix}/tasks/*`);
  console.log(`   ${apiPrefix}/communications/*`);
  console.log(`   ${apiPrefix}/analytics/*`);
}