const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs-extra');
const morgan = require('morgan');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const supabase = require('./utils/supabase');
const { protect, conditionalProtect } = require('./middleware/authMiddleware');

// Import custom middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const getLoggingMiddleware = require('./middleware/loggingMiddleware');
const { apiLimiter, authLimiter, uploadLimiter, vectorizationLimiter } = require('./middleware/rateLimitMiddleware');

// Load environment variables with explicit path
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Initialize express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3001', 'http://localhost:3003'],
    methods: ['GET', 'POST']
  }
});

// Set trust proxy to handle rate limiting correctly behind a proxy
app.set('trust proxy', 1);

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOADS_DIR || './uploads';
fs.ensureDirSync(uploadsDir);

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
fs.ensureDirSync(logsDir);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false // Allow embedding in iframes
}));

app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true
}));

// Apply logging middleware
const loggingMiddleware = getLoggingMiddleware();
app.use(loggingMiddleware);

// Apply rate limiting middleware
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/files/upload', uploadLimiter);
app.use('/api/projects/:projectId/vectorize', vectorizationLimiter);

// Body parsing middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Make supabase client available in requests
app.use((req, res, next) => {
  req.supabase = supabaseClient;
  next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');  // Keep legacy projectRoutes for now
const fileRoutes = require('./routes/fileRoutes');
const featureRoutes = require('./routes/featureRoutes');
const vectorRoutes = require('./routes/vectorRoutes');
const componentRoutes = require('./routes/componentRoutes');
const projectRouter = require('./routes/project.routes');  // Use new project.routes.js
const fileRouter = require('./routes/file.routes');  // Use new file.routes.js
const projectController = require('./controllers/project.controller');

// ====== SYSTEM ROUTES ======
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// System status endpoint 
app.get('/api/system/status', (req, res) => {
  // Always report Python as available since we're using JavaScript mocks
  res.status(200).json({
    server: 'running',
    pythonAvailable: true,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    nodesVersion: process.version
  });
});

// Register the new project and file routes
app.use('/api/v2/project', projectRouter);
app.use('/api/v2/file', fileRouter);

// ====== DIRECT PROJECT ACCESS ROUTES (NO /api PREFIX) ======
// These routes allow for direct access to projects without authentication
// Used for local project access in the frontend

// Route for direct project access
app.get('/projects/:projectId', conditionalProtect, (req, res, next) => {
  // Redirect to project info
  const projectId = req.params.projectId;
  console.log(`Direct project access: ${projectId}`);
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    return next(new Error('Project not found'));
  }
  
  // For now, redirect to the project info endpoint
  projectController.getProjectById(req, res, next);
});

// Route for project info
app.get('/projects/:projectId/info', conditionalProtect, (req, res, next) => {
  const projectId = req.params.projectId;
  console.log(`Direct project info access: ${projectId}`);
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    return next(new Error('Project not found'));
  }
  
  req.query.saveLocally = 'true'; // Force local access
  projectController.getProjectById(req, res, next);
});

// Route for project file tree
app.get('/projects/:projectId/filetree', conditionalProtect, (req, res, next) => {
  console.log(`Direct filetree access: ${req.params.projectId}`);
  req.query.saveLocally = 'true'; // Force local access
  projectController.getProjectFileTree(req, res, next);
});

// Route for project file content
app.get('/projects/:projectId/file/:filePath(*)', conditionalProtect, (req, res, next) => {
  console.log(`Direct file access: ${req.params.projectId}/${req.params.filePath}`);
  req.query.saveLocally = 'true'; // Force local access
  projectController.getFileContent(req, res, next);
});

// Route for vectorization status (to fix 404 error)
app.get('/projects/:projectId/vectorization-status', conditionalProtect, (req, res, next) => {
  console.log(`Vectorization status access: ${req.params.projectId}`);
  req.query.saveLocally = 'true'; // Force local access
  
  // Get the project directory
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', req.params.projectId);
  
  // Check if the status file exists
  const statusFilePath = path.join(projectDir, '.vectorization_status.json');
  
  if (fs.existsSync(statusFilePath)) {
    try {
      const status = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
      return res.status(200).json({
        success: true,
        status: status.status || 'unknown',
        details: status
      });
    } catch (err) {
      console.error('Error reading vectorization status:', err);
      return next(err);
    }
  } else {
    // If status file doesn't exist, assume not started
    return res.status(200).json({
      success: true,
      status: 'not_started'
    });
  }
});

// Route for project/projects/:projectId/info (alternate path the frontend tries)
app.get('/project/projects/:projectId/info', (req, res, next) => {
  console.log(`Alternative project info access: ${req.params.projectId}`);
  req.params.projectId = req.params.projectId; // Keep the same
  req.query.saveLocally = 'true'; // Force local access
  projectController.getProjectById(req, res, next);
});

// Route for project/filetree/:projectId (alternate path the frontend tries)
app.get('/project/filetree/:projectId', (req, res, next) => {
  console.log(`Alternative filetree access: ${req.params.projectId}`);
  req.query.saveLocally = 'true'; // Force local access
  projectController.getProjectFileTree(req, res, next);
});

// ====== NON-AUTHENTICATED API ACCESS ======
// Direct API access for projects without authentication
app.get('/api/projects/:projectId', conditionalProtect, (req, res, next) => {
  console.log(`Direct API project access: ${req.params.projectId}`);
  
  // Check if this is a local project
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', req.params.projectId);
  if (fs.existsSync(projectDir)) {
    req.query.saveLocally = 'true';
    return projectController.getProjectById(req, res, next);
  }
  
  // If not local and no auth, return 401
  if (!req.user && !req.query.saveLocally) {
    return next(new Error('Authentication required'));
  }
  
  // Otherwise, standard behavior
  projectController.getProjectById(req, res, next);
});

// Direct API access for project file list
app.get('/api/projects/:projectId/files', conditionalProtect, (req, res, next) => {
  console.log(`Direct API files list access: ${req.params.projectId}`);
  req.query.saveLocally = 'true'; 
  projectController.getProjectFiles(req, res, next);
});

// Direct API access for file content
app.get('/api/projects/:projectId/file/:filePath(*)', conditionalProtect, (req, res, next) => {
  console.log(`API file content access: ${req.params.projectId}/${req.params.filePath}`);
  req.query.saveLocally = 'true';
  projectController.getFileContent(req, res, next);
});

// Direct API access for all projects (for development)
app.get('/api/projects', conditionalProtect, (req, res, next) => {
  console.log(`Direct API all projects access`);
  req.query.saveLocally = 'true';
  projectController.getAllProjects(req, res, next);
});

// ====== VECTOR API ROUTES WITH CONDITIONAL AUTHENTICATION ======

// Register specific vector routes with conditional authentication
app.get('/api/projects/:projectId/vectors/status', conditionalProtect, (req, res, next) => {
  // Add saveLocally=true query param to bypass auth
  req.query.saveLocally = 'true';
  projectController.getVectorizationStatus(req, res, next);
});

app.get('/api/projects/:projectId/vectors/data', conditionalProtect, (req, res, next) => {
  // Add saveLocally=true query param to bypass auth
  req.query.saveLocally = 'true';
  projectController.getVectorData(req, res, next);
});

app.get('/api/projects/:projectId/vectors/languages', conditionalProtect, (req, res, next) => {
  // Add saveLocally=true query param to bypass auth
  req.query.saveLocally = 'true';
  projectController.getVectorLanguages(req, res, next);
});

// Direct endpoint without /api prefix
app.get('/projects/:projectId/vectors/languages', conditionalProtect, (req, res, next) => {
  console.log(`Direct vector languages access: ${req.params.projectId}`);
  req.query.saveLocally = 'true';
  projectController.getVectorLanguages(req, res, next);
});

app.post('/api/projects/:projectId/vectorize', conditionalProtect, (req, res, next) => {
  // Add saveLocally=true to body to bypass auth if not already present
  if (!req.body.saveLocally) {
    req.body.saveLocally = 'true';
  }
  projectController.startVectorization(req, res, next);
});

// Register routes with authentication
app.use('/api/auth', authRoutes);
app.use('/api/projects', protect, projectRoutes);
app.use('/api/files', protect, fileRoutes);
app.use('/api/features', protect, featureRoutes);
app.use('/api/vectors', protect, vectorRoutes);
app.use('/api/projects/:projectId/components', protect, componentRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
  
  // Join project room for real-time updates
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`User ${socket.id} joined project ${projectId}`);
  });
  
  // Leave project room
  socket.on('leave-project', (projectId) => {
    socket.leave(`project-${projectId}`);
    console.log(`User ${socket.id} left project ${projectId}`);
  });
});

// Executor service connection
const EXECUTOR_URL = process.env.EXECUTOR_URL || 'http://localhost:5001';
console.log(`Using code executor at: ${EXECUTOR_URL}`);

// Apply 404 and error handling middleware
app.use(notFound);
app.use(errorHandler);

// Configure global console logging
const originalConsoleLog = console.log;
console.log = function() {
  const timestamp = new Date().toISOString();
  originalConsoleLog.apply(console, [`[${timestamp}]`, ...arguments]);
};

// Import the improved Python checker
const { checkPython, isPythonAvailable } = require('./utils/pythonChecker');

// Start the server with error handling
const PORT = process.env.PORT || 5001;

// Function to check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = require('net').createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is not available
        resolve(false);
      } else {
        reject(err);
      }
    });
    
    server.once('listening', () => {
      // Port is available, close the server
      server.close(() => {
        resolve(true);
      });
    });
    
    server.listen(port);
  });
}

// Try to start the server 
(async function startServer() {
  try {
    // Check if the port is available
    const portAvailable = await isPortAvailable(PORT);
    
    if (!portAvailable) {
      console.log(`Port ${PORT} is already in use. Attempting to close existing connections...`);
      
      // Try to kill the process using the port
      try {
        const { execSync } = require('child_process');
        if (process.platform === 'win32') {
          execSync(`npx kill-port ${PORT}`);
        } else {
          execSync(`lsof -ti:${PORT} | xargs kill -9`);
        }
        
        console.log(`Successfully freed port ${PORT}`);
      } catch (killError) {
        console.error(`Failed to free port ${PORT}:`, killError.message);
        console.log(`Please manually close the application using port ${PORT} and try again.`);
        process.exit(1);
      }
    }
    
    // Start the server
    httpServer.listen(PORT, async () => {
      console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
      
      // Check for Python availability
      await checkPython();
      
      // Log code executor URL
      console.log(`Using code executor at: http://localhost:${PORT}`);
    });
    
    // Handle server errors
    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is still in use. Please restart manually with a different port.`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });
    
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
})();

module.exports = app;