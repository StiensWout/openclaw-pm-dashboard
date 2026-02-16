import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import Database from './database/init';
import { setupRoutes } from './routes';
import { setupSocketHandlers } from './services/socketService';
import { OpenClawMessagingService } from './services/openclawMessaging';
import { TailscaleService } from './services/tailscaleService';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

class OpenClawPMServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private db: Database;
  private messaging: OpenClawMessagingService;
  private tailscaleService: TailscaleService;
  
  private readonly port: number;
  private readonly host: string;
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.port = this.isProduction ? 
      parseInt(process.env.PROD_PORT || '4001') : 
      parseInt(process.env.PORT || '3001');
    this.host = process.env.BIND_HOST || '0.0.0.0';

    // Initialize services
    this.db = Database.getInstance();
    this.messaging = OpenClawMessagingService.getInstance();
    this.tailscaleService = new TailscaleService();

    // Initialize Express app
    this.app = express();
    this.server = http.createServer(this.app);

    // Initialize Socket.IO with proper CORS configuration
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: this.getCorsOrigins(),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupErrorHandling();
  }

  private getCorsOrigins(): string[] {
    const corsOrigin = process.env.CORS_ORIGIN || '';
    if (corsOrigin) {
      return corsOrigin.split(',').map(origin => origin.trim());
    }
    
    // Default CORS origins based on environment
    return this.isProduction ? [
      'https://hostingervps.barracuda-banfish.ts.net:4000'
    ] : [
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    // Logging
    this.app.use(morgan(this.isProduction ? 'combined' : 'dev'));

    // CORS
    this.app.use(cors({
      origin: this.getCorsOrigins(),
      credentials: true
    }));

    // Rate limiting
    this.app.use('/api', rateLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static file serving in production
    if (this.isProduction) {
      const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
      if (fs.existsSync(frontendBuildPath)) {
        this.app.use(express.static(frontendBuildPath));
        console.log(`Serving static files from: ${frontendBuildPath}`);
      } else {
        console.warn(`Frontend build directory not found: ${frontendBuildPath}`);
      }
    }

    // Health check endpoint (before authentication)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV || 'development',
        port: this.port,
        tailscale: this.tailscaleService.getStatus()
      });
    });

    // Tailscale status endpoint
    this.app.get('/tailscale/status', async (req, res) => {
      try {
        const status = await this.tailscaleService.getDetailedStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get Tailscale status' });
      }
    });
  }

  private setupRoutes(): void {
    setupRoutes(this.app, this.io, this.db, this.messaging);

    // Catch-all handler for production (serve React app)
    if (this.isProduction) {
      this.app.get('*', (req, res) => {
        const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
        const indexPath = path.join(frontendBuildPath, 'index.html');
        
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).json({ error: 'Frontend not built. Run npm run build in frontend directory.' });
        }
      });
    }
  }

  private setupSocketHandlers(): void {
    setupSocketHandlers(this.io, this.db, this.messaging);
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.messaging.notifySystemEvent('Uncaught Exception', error.message, 'high');
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.messaging.notifySystemEvent('Unhandled Promise Rejection', String(reason), 'high');
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.db.initialize();
      console.log('Database initialized successfully');

      // Test Tailscale configuration
      const tailscaleStatus = await this.tailscaleService.getDetailedStatus();
      console.log('Tailscale Status:', tailscaleStatus);

      // Test OpenClaw messaging
      const messagingWorking = await this.messaging.testMessaging();
      if (messagingWorking) {
        console.log('OpenClaw messaging service is working');
      } else {
        console.warn('OpenClaw messaging service may not be working properly');
      }

      // Start the server
      this.server.listen(this.port, this.host, () => {
        const serverUrl = `http://${this.host}:${this.port}`;
        const tailscaleUrl = this.tailscaleService.getTailscaleUrl(this.port);
        
        console.log('🚀 OpenClaw PM Dashboard Backend started successfully!');
        console.log(`📍 Environment: ${this.isProduction ? 'production' : 'development'}`);
        console.log(`🌐 Server URL: ${serverUrl}`);
        console.log(`🔗 Tailscale URL: ${tailscaleUrl}`);
        console.log(`📊 Health check: ${serverUrl}/health`);
        console.log(`🔌 WebSocket: ${serverUrl.replace('http', 'ws')}`);
        console.log(`🎯 CORS Origins: ${this.getCorsOrigins().join(', ')}`);

        // Notify via OpenClaw that the server has started
        this.messaging.notifySystemEvent(
          'PM Dashboard Backend Started',
          `Server running on ${tailscaleUrl} (${this.isProduction ? 'production' : 'development'} mode)`,
          'low'
        );
      });

      // Handle server errors
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${this.port} is already in use. Please check for conflicts with OpenClaw Gateway (port 18789).`);
          this.messaging.notifySystemEvent(
            'Port Conflict',
            `Backend server cannot start on port ${this.port} - port already in use`,
            'high'
          );
        } else {
          console.error('Server error:', error);
          this.messaging.notifySystemEvent('Server Error', error.message, 'high');
        }
        process.exit(1);
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      await this.messaging.notifySystemEvent('Server Startup Failed', String(error), 'high');
      process.exit(1);
    }
  }

  private async shutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    try {
      // Close HTTP server
      await new Promise<void>((resolve, reject) => {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Close Socket.IO server
      this.io.close();

      // Close database connection
      await this.db.close();

      // Notify shutdown
      await this.messaging.notifySystemEvent(
        'PM Dashboard Backend Stopped',
        `Server shut down gracefully (${signal})`,
        'low'
      );

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  // Getters for testing and external access
  public getApp(): express.Application {
    return this.app;
  }

  public getServer(): http.Server {
    return this.server;
  }

  public getSocketIO(): SocketIOServer {
    return this.io;
  }

  public getDatabase(): Database {
    return this.db;
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new OpenClawPMServer();
  server.start().catch(console.error);
}

export default OpenClawPMServer;