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

// Import custom middleware and utilities
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const getLoggingMiddleware = require('./middleware/loggingMiddleware');
const { apiLimiter, authLimiter, uploadLimiter, vectorizationLimiter } = require('./middleware/rateLimitMiddleware');
const logger = require('./utils/logger'); // Import logger early
const portManager = require('./utils/portManager');

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

// Create a projects.json file in the uploads directory if it doesn't exist
try {
  const projectsFile = path.join(uploadsDir, 'projects.json');
  if (!fs.existsSync(projectsFile)) {
    logger.info('Creating initial projects.json file');
    fs.writeFileSync(projectsFile, JSON.stringify({ projects: [] }, null, 2));
  }
  
  // Create example project folder if no projects exist
  const projectsData = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  if (Array.isArray(projectsData.projects) && projectsData.projects.length === 0) {
    logger.info('No projects found, creating example project');
    
    // Create example project folder
    const exampleProjectId = 'example-project';
    const exampleProjectDir = path.join(uploadsDir, exampleProjectId);
    fs.ensureDirSync(exampleProjectDir);
    
    // Create a sample file
    fs.writeFileSync(
      path.join(exampleProjectDir, 'sample.js'),
      '// Example JavaScript file\nconsole.log("Hello, world!");\n'
    );
    
    // Create a sample index.html file
    fs.writeFileSync(
      path.join(exampleProjectDir, 'index.html'),
      '<!DOCTYPE html>\n<html>\n<head>\n  <title>Example Project</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n'
    );
    
    // Create a README.md file
    fs.writeFileSync(
      path.join(exampleProjectDir, 'README.md'),
      '# Example Project\n\nThis is an automatically generated example project.\n'
    );
    
    // Add the example project to projects.json
    projectsData.projects.push({
      id: exampleProjectId,
      name: 'Example Project',
      description: 'Automatically generated example project',
      createdAt: new Date().toISOString(),
      files: [
        'sample.js',
        'index.html',
        'README.md'
      ]
    });
    
    fs.writeFileSync(projectsFile, JSON.stringify(projectsData, null, 2));
    logger.info('Example project created successfully');
  }
} catch (error) {
  logger.error(`Error initializing uploads directory: ${error.message}`);
}

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
const fileRoutes = require('./routes/fileRoutes');
const featureRoutes = require('./routes/featureRoutes');
const vectorRoutes = require('./routes/vectorRoutes');
const componentRoutes = require('./routes/componentRoutes');
const projectRouter = require('./routes/project.routes');  // Keep only this project routes import
const fileRouter = require('./routes/file.routes');
const vectorizeRouter = require('./routes/vectorize.routes'); // Import vectorization routes
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
app.use('/api/projects', conditionalProtect, projectRouter);
app.use('/api/files', conditionalProtect, fileRouter);
app.use('/api/vectorize', conditionalProtect, vectorizeRouter); // Register vectorization routes

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

// Start the server
let PORT = process.env.PORT || 5001;

// Enhanced server startup function
async function startServer() {
  try {
    // Check if the port is available
    const portStatus = await portManager.ensurePortAvailable(PORT, {
      tryToFree: true,
      forceKill: true, // Force kill any processes using the port
      timeout: 5000, // Wait up to 5 seconds for the port to be freed
      returnAny: true,
      fallbackStartPort: 5500
    });
    
    if (!portStatus.available) {
      logger.error(`Port ${PORT} is still in use. Please restart manually with a different port.`);
      // Take more aggressive action to free the port
      try {
        logger.info(`Attempting to forcefully free port ${PORT}...`);
        // On Windows, we can use netstat and taskkill
        if (process.platform === 'win32') {
          const { execSync } = require('child_process');
          // Find the PID using the port
          const findPidCommand = `netstat -ano | findstr :${PORT}`;
          const result = execSync(findPidCommand).toString();
          // Extract the PID from the result
          const pidMatch = result.match(/LISTENING\s+(\d+)/);
          if (pidMatch && pidMatch[1]) {
            const pid = pidMatch[1];
            logger.info(`Found process ${pid} using port ${PORT}, attempting to kill...`);
            try {
              execSync(`taskkill /F /PID ${pid}`);
              logger.info(`Successfully killed process ${pid}`);
            } catch (killError) {
              logger.error(`Failed to kill process: ${killError.message}`);
            }
          }
        } else {
          // Unix-like systems can use lsof and kill
          const { execSync } = require('child_process');
          const findPidCommand = `lsof -t -i:${PORT}`;
          const pid = execSync(findPidCommand).toString().trim();
          if (pid) {
            logger.info(`Found process ${pid} using port ${PORT}, attempting to kill...`);
            try {
              execSync(`kill -9 ${pid}`);
              logger.info(`Successfully killed process ${pid}`);
            } catch (killError) {
              logger.error(`Failed to kill process: ${killError.message}`);
            }
          }
        }
      } catch (e) {
        logger.error(`Error attempting to forcefully free port: ${e.message}`);
      }
      
      // Try again after forceful kill
      const retryStatus = await portManager.isPortInUse(PORT);
      if (retryStatus) {
        logger.error(`Port ${PORT} is still in use after forceful kill attempt. Using fallback port 5500.`);
        PORT = 5500;
      }
    } else {
      PORT = portStatus.port;
    }
    
    // Use the port from the portStatus (original or fallback)
    const server = httpServer.listen(PORT, () => {
      logger.info(`[${new Date().toISOString()}] Server running on port ${PORT}`);
      
      // Check for Python
      try {
        const pythonVersion = require('./utils/pythonRunner').getPythonVersion();
        if (pythonVersion) {
          logger.info(`Python detected: ${pythonVersion}`);
        } else {
          logger.warn('Python not detected. Using JavaScript fallbacks for vector operations.');
        }
      } catch (err) {
        logger.warn('Error detecting Python. Using JavaScript fallbacks for vector operations.');
        logger.error(err);
      }
      
      logger.info(`Using code executor at: http://localhost:${PORT}`);
    });
    
    // Set up graceful shutdown
    process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
    
    return server;
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Graceful shutdown function
function gracefulShutdown(server, signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed.');
    
    // Close Socket.io connections
    io.close(() => {
      logger.info('Socket.io connections closed.');
      
      // Clean up any remaining resources
      logger.info('All connections closed. Exiting process.');
      process.exit(0);
    });
  });
  
  // Force exit after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Start the server and handle any startup errors
startServer().catch(error => {
  logger.error(`Server failed to start: ${error.message}`);
  process.exit(1);
});

module.exports = app;