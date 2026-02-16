const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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
    version: '0.1.0'
  });
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
server.listen(PORT, () => {
  console.log(`OpenClaw PM Dashboard Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

module.exports = { app, server, io };