const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const notificationService = require('./services/notificationService');
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const BIND_HOST = process.env.BIND_HOST || 'localhost'; // Default to localhost for security

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for demo (replace with database in production)
let projects = [];
let agents = [];
let tasks = [];

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    tailscale: process.env.TAILSCALE_HOSTNAME || 'not-configured',
    notifications: notificationService.isEnabled ? 'enabled' : 'disabled'
  });
});

// Test notification endpoint
app.post('/api/notifications/test', async (req, res) => {
  try {
    const result = await notificationService.notifyUser(
      'Test Notification',
      'This is a test notification from the OpenClaw PM Dashboard',
      'low',
      { agent: 'test-endpoint' }
    );
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const project = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
    assignedAgents: [],
    progress: 0
  };
  projects.push(project);
  
  // Broadcast to all connected clients
  io.emit('project_update', { type: 'created', project });
  
  res.status(201).json(project);
});

app.get('/api/agents', (req, res) => {
  res.json(agents);
});

app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const task = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending'
  };
  tasks.push(task);
  
  // Broadcast to all connected clients
  io.emit('task_update', { type: 'created', task });
  
  res.status(201).json(task);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial data to newly connected client
  socket.emit('initial_data', {
    projects,
    agents,
    tasks
  });

  // Handle agent registration
  socket.on('agent_register', (agentData) => {
    const agent = {
      ...agentData,
      socketId: socket.id,
      lastActivity: new Date(),
      status: 'active'
    };
    
    // Remove existing agent with same ID if exists
    agents = agents.filter(a => a.id !== agent.id);
    agents.push(agent);
    
    console.log('Agent registered:', agent.name);
    
    // Broadcast agent update
    io.emit('agent_update', { type: 'registered', agent });
  });

  // Handle agent status updates
  socket.on('agent_status', (statusData) => {
    const agentIndex = agents.findIndex(a => a.socketId === socket.id);
    if (agentIndex !== -1) {
      agents[agentIndex] = { ...agents[agentIndex], ...statusData, lastActivity: new Date() };
      io.emit('agent_update', { type: 'status_updated', agent: agents[agentIndex] });
    }
  });

  // Handle task updates
  socket.on('task_update', (taskUpdate) => {
    const taskIndex = tasks.findIndex(t => t.id === taskUpdate.id);
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...taskUpdate, updatedAt: new Date() };
      io.emit('task_update', { type: 'updated', task: tasks[taskIndex] });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Mark agent as offline if it was an agent connection
    const agentIndex = agents.findIndex(a => a.socketId === socket.id);
    if (agentIndex !== -1) {
      agents[agentIndex].status = 'offline';
      agents[agentIndex].lastActivity = new Date();
      io.emit('agent_update', { type: 'disconnected', agent: agents[agentIndex] });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
server.listen(PORT, BIND_HOST, async () => {
  console.log(`OpenClaw PM Dashboard Backend running on ${BIND_HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`Tailscale Hostname: ${process.env.TAILSCALE_HOSTNAME || 'localhost'}`);
  
  // Log security configuration
  if (BIND_HOST !== 'localhost' && BIND_HOST !== '127.0.0.1') {
    console.log(`🔒 Security: Server bound to specific interface (${BIND_HOST})`);
  } else {
    console.log(`⚠️  Security: Server bound to localhost only`);
  }

  // Notify user that the server is ready
  try {
    await notificationService.notifyMilestone(
      'Backend Server Started',
      'orchestrator-agent',
      {
        host: BIND_HOST,
        port: PORT,
        tailscale_hostname: process.env.TAILSCALE_HOSTNAME,
        environment: process.env.NODE_ENV || 'development'
      }
    );
  } catch (error) {
    console.warn('Failed to send startup notification:', error.message);
  }
});

module.exports = { app, server, io };