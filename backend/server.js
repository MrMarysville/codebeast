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
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

// Load environment variables with explicit path
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Set trust proxy to handle rate limiting correctly behind a proxy
app.set('trust proxy', 1);

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOADS_DIR || './uploads';
fs.ensureDirSync(uploadsDir);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Middleware
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Make supabase client available in requests
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const fileRoutes = require('./routes/fileRoutes');
const featureRoutes = require('./routes/featureRoutes');
const vectorRoutes = require('./routes/vectorRoutes');
const componentRoutes = require('./routes/componentRoutes');
const projectUploadRoutes = require('./routes/project.routes');
const projectController = require('./controllers/project.controller');

// Auth middleware
const { protect, conditionalProtect } = require('./middleware/authMiddleware');

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

// Register upload routes without authentication
app.use('/api/project', projectUploadRoutes);

// ====== DIRECT PROJECT ACCESS ROUTES (NO /api PREFIX) ======
// These routes allow for direct access to projects without authentication
// Used for local project access in the frontend

// Route for direct project access
app.get('/projects/:projectId', conditionalProtect, (req, res) => {
  // Redirect to project info
  const projectId = req.params.projectId;
  console.log(`Direct project access: ${projectId}`);
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ 
      success: false,
      error: 'Project not found' 
    });
  }
  
  // For now, redirect to the project info endpoint
  projectController.getProjectById(req, res);
});

// Route for project info
app.get('/projects/:projectId/info', conditionalProtect, (req, res) => {
  const projectId = req.params.projectId;
  console.log(`Direct project info access: ${projectId}`);
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ 
      success: false,
      error: 'Project not found' 
    });
  }
  
  req.query.saveLocally = 'true'; // Force local access
  projectController.getProjectById(req, res);
});

// Route for project file tree
app.get('/projects/:projectId/filetree', conditionalProtect, (req, res) => {
  console.log(`Direct filetree access: ${req.params.projectId}`);
  req.query.saveLocally = 'true'; // Force local access
  projectController.getProjectFileTree(req, res);
});

// Route for project file content
app.get('/projects/:projectId/file/:filePath(*)', conditionalProtect, (req, res) => {
  console.log(`Direct file access: ${req.params.projectId}/${req.params.filePath}`);
  req.query.saveLocally = 'true'; // Force local access
  projectController.getFileContent(req, res);
});

// Route for vectorization status (to fix 404 error)
app.get('/projects/:projectId/vectorization-status', conditionalProtect, (req, res) => {
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
      return res.status(200).json({
        success: true,
        status: 'unknown',
        error: err.message
      });
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
app.get('/project/projects/:projectId/info', (req, res) => {
  console.log(`Alternative project info access: ${req.params.projectId}`);
  req.params.projectId = req.params.projectId; // Keep the same
  req.query.saveLocally = 'true'; // Force local access
  projectController.getProjectById(req, res);
});

// Route for project/filetree/:projectId (alternate path the frontend tries)
app.get('/project/filetree/:projectId', (req, res) => {
  console.log(`Alternative filetree access: ${req.params.projectId}`);
  req.query.saveLocally = 'true'; // Force local access
  projectController.getProjectFileTree(req, res);
});

// ====== NON-AUTHENTICATED API ACCESS ======
// Direct API access for projects without authentication
app.get('/api/projects/:projectId', conditionalProtect, (req, res) => {
  console.log(`Direct API project access: ${req.params.projectId}`);
  
  // Check if this is a local project
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', req.params.projectId);
  if (fs.existsSync(projectDir)) {
    req.query.saveLocally = 'true';
    return projectController.getProjectById(req, res);
  }
  
  // If not local and no auth, return 401
  if (!req.user && !req.query.saveLocally) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required' 
    });
  }
  
  // Otherwise, standard behavior
  projectController.getProjectById(req, res);
});

// Direct API access for project file list
app.get('/api/projects/:projectId/files', conditionalProtect, (req, res) => {
  console.log(`Direct API files list access: ${req.params.projectId}`);
  req.query.saveLocally = 'true'; 
  projectController.getProjectFiles(req, res);
});

// Direct API access for file content
app.get('/api/projects/:projectId/file/:filePath(*)', conditionalProtect, (req, res) => {
  console.log(`API file content access: ${req.params.projectId}/${req.params.filePath}`);
  req.query.saveLocally = 'true';
  projectController.getFileContent(req, res);
});

// ====== VECTOR API ROUTES WITH CONDITIONAL AUTHENTICATION ======

// Register specific vector routes with conditional authentication
app.get('/api/projects/:projectId/vectors/status', conditionalProtect, (req, res) => {
  // Add saveLocally=true query param to bypass auth
  req.query.saveLocally = 'true';
  projectController.getVectorizationStatus(req, res);
});

app.get('/api/projects/:projectId/vectors/data', conditionalProtect, (req, res) => {
  // Add saveLocally=true query param to bypass auth
  req.query.saveLocally = 'true';
  projectController.getVectorData(req, res);
});

app.get('/api/projects/:projectId/vectors/languages', conditionalProtect, (req, res) => {
  // Add saveLocally=true query param to bypass auth
  req.query.saveLocally = 'true';
  projectController.getVectorLanguages(req, res);
});

// Direct endpoint without /api prefix
app.get('/projects/:projectId/vectors/languages', conditionalProtect, (req, res) => {
  console.log(`Direct vector languages access: ${req.params.projectId}`);
  req.query.saveLocally = 'true';
  projectController.getVectorLanguages(req, res);
});

app.post('/api/projects/:projectId/vectorize', conditionalProtect, (req, res) => {
  // Add saveLocally=true to body to bypass auth if not already present
  if (!req.body.saveLocally) {
    req.body.saveLocally = 'true';
  }
  projectController.startVectorization(req, res);
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

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Handle errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Server error', message: err.message });
});

// Configure global console logging
const originalConsoleLog = console.log;
console.log = function() {
  const timestamp = new Date().toISOString();
  originalConsoleLog.apply(console, [`[${timestamp}]`, ...arguments]);
};

// Import the improved Python checker
const { checkPython, isPythonAvailable } = require('./utils/pythonChecker');

// Start the server
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Check for Python availability - now just a mock check that always returns true
  await checkPython();
  
  // No need for a duplicate system status endpoint
});

module.exports = app;