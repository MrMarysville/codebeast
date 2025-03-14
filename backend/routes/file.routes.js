const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const unzipper = require('unzipper');
const { validateRequest } = require('../middleware/validationMiddleware');
const fileValidation = require('../validations/file.validation');
const { asyncHandler, ApiError } = require('../middleware/errorMiddleware');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { projectId } = req.params;
    
    if (!projectId) {
      return cb(new Error('Project ID is required'), null);
    }
    
    const uploadDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    fs.ensureDir(uploadDir)
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err, null));
  },
  filename: (req, file, cb) => {
    const { filePath } = req.query;
    
    if (filePath) {
      // If a specific filePath is provided, use it
      cb(null, path.basename(filePath));
    } else {
      // Otherwise, generate a unique filename
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }
});

// Create multer upload instance
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

// Upload a file to a project
router.post(
  '/upload/:projectId', 
  validateRequest(fileValidation.uploadFile),
  upload.single('file'), 
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError('No file uploaded', 400);
    }
    
    const { projectId } = req.params;
    const { filePath } = req.query;
    const destinationPath = filePath || req.file.filename;
    
    // Return file details
    res.json({
      name: path.basename(destinationPath),
      path: destinationPath,
      size: req.file.size,
      lastModified: new Date(),
      extension: path.extname(destinationPath).toLowerCase()
    });
  })
);

// Upload and extract a ZIP file
router.post(
  '/upload-zip/:projectId', 
  validateRequest(fileValidation.uploadZip),
  upload.single('file'), 
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError('No file uploaded', 400);
    }
    
    const { projectId } = req.params;
    const { extractPath = '' } = req.query;
    
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    const extractDir = path.join(projectDir, extractPath);
    
    // Make sure the extraction directory exists
    await fs.ensureDir(extractDir);
    
    // Extract the ZIP file
    const zipFilePath = req.file.path;
    
    try {
      // Read the ZIP file and extract its contents
      await fs.createReadStream(zipFilePath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .promise();
      
      // Collect file information after extraction
      const results = {
        success: true,
        originalFile: {
          name: req.file.originalname,
          size: req.file.size
        },
        extractionPath: extractPath || '/',
        message: 'ZIP file extracted successfully'
      };
      
      // Clean up the ZIP file after extraction
      await fs.unlink(zipFilePath);
      
      res.json(results);
    } catch (extractError) {
      // Clean up the ZIP file on extraction error
      try {
        await fs.unlink(zipFilePath);
      } catch (unlinkError) {
        console.error('Error deleting ZIP file after extraction failure:', unlinkError);
      }
      
      throw new ApiError('Failed to extract ZIP file. It may be corrupt or not a valid ZIP archive.', 400);
    }
  })
);

// Download a file
router.get(
  '/download/:projectId/:filePath(*)', 
  validateRequest(fileValidation.downloadFile),
  asyncHandler(async (req, res) => {
    const { projectId, filePath } = req.params;
    
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    const fullPath = path.join(projectDir, filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      throw new ApiError('File not found', 404);
    }
    
    // Check if it's a directory
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      throw new ApiError('Cannot download a directory', 400);
    }
    
    // Set the appropriate content type if possible
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypeMap = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf'
    };
    
    // Set the content type header if we know it
    if (contentTypeMap[ext]) {
      res.setHeader('Content-Type', contentTypeMap[ext]);
    }
    
    // Set the content disposition header for downloading
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  })
);

// Create a directory
router.post(
  '/mkdir/:projectId', 
  validateRequest(fileValidation.createDirectory),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { dirPath } = req.body;
    
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    const fullPath = path.join(projectDir, dirPath);
    
    // Create the directory
    await fs.ensureDir(fullPath);
    
    res.json({
      success: true,
      path: dirPath,
      type: 'directory',
      message: 'Directory created successfully'
    });
  })
);

module.exports = router; 