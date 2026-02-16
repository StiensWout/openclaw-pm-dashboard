import { Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import Database from '../database/init';
import { OpenClawMessagingService } from '../services/openclawMessaging';
import { asyncHandler } from '../middleware/errorHandler';
import { Communication, ApiResponse } from '../types';

export default function communicationRoutes(
  io: SocketIOServer,
  db: Database,
  messaging: OpenClawMessagingService
) {
  const router = Router();

  // GET /api/communications
  router.get('/', asyncHandler(async (req, res) => {
    const { type, fromAgentId, toAgentId, projectId, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM communications WHERE 1=1';
    const params: any[] = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (fromAgentId) {
      query += ' AND from_agent_id = ?';
      params.push(fromAgentId);
    }

    if (toAgentId) {
      query += ' AND to_agent_id = ?';
      params.push(toAgentId);
    }

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const communications = await db.all(query, params);

    const response: ApiResponse<Communication[]> = {
      success: true,
      data: communications.map(transformCommunicationFromDB),
      timestamp: new Date()
    };

    res.json(response);
  }));

  return router;
}

function transformCommunicationFromDB(row: any): Communication {
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