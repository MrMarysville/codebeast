const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.env.UPLOADS_DIR || './uploads', 'temp');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * @route   POST /api/files/upload
 * @desc    Upload a file
 * @access  Private
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId, destination } = req.body;
    
    // Validate required fields
    if (!projectId) {
      // Clean up the temp file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Create the destination directory in the project folder
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    
    // Check if project directory exists
    if (!fs.existsSync(projectDir)) {
      // Clean up the temp file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Project not found' });
    }

    // Determine the final destination path
    let destPath;
    if (destination) {
      // Create nested directories if needed
      destPath = path.join(projectDir, destination);
      fs.ensureDirSync(destPath);
      destPath = path.join(destPath, path.basename(req.file.originalname));
    } else {
      destPath = path.join(projectDir, path.basename(req.file.originalname));
    }

    // Move the file from temp to the project directory
    await fs.move(req.file.path, destPath, { overwrite: true });

    // Update file count in Supabase
    const { data: project, error: getError } = await req.supabase
      .from('projects')
      .select('file_count')
      .eq('id', projectId)
      .single();

    if (!getError && project) {
      const newCount = (project.file_count || 0) + 1;
      await req.supabase
        .from('projects')
        .update({ file_count: newCount, updated_at: new Date().toISOString() })
        .eq('id', projectId);
    }

    res.status(201).json({
      success: true,
      file: {
        filename: path.basename(destPath),
        path: destination ? path.join(destination, path.basename(destPath)) : path.basename(destPath),
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    // Clean up the temp file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'File upload failed' });
  }
});

/**
 * @route   POST /api/files/create
 * @desc    Create a new file
 * @access  Private
 */
router.post('/create', async (req, res) => {
  try {
    const { projectId, filePath, content = '' } = req.body;
    
    // Validate required fields
    if (!projectId || !filePath) {
      return res.status(400).json({ error: 'Project ID and file path are required' });
    }

    // Check if project directory exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Determine the final file path
    const fullPath = path.join(projectDir, filePath);
    
    // Create directory if needed
    fs.ensureDirSync(path.dirname(fullPath));
    
    // Check if file already exists
    if (fs.existsSync(fullPath)) {
      return res.status(400).json({ error: 'File already exists' });
    }

    // Create the file
    await fs.writeFile(fullPath, content);

    // Update file count in Supabase
    const { data: project, error: getError } = await req.supabase
      .from('projects')
      .select('file_count')
      .eq('id', projectId)
      .single();

    if (!getError && project) {
      const newCount = (project.file_count || 0) + 1;
      await req.supabase
        .from('projects')
        .update({ file_count: newCount, updated_at: new Date().toISOString() })
        .eq('id', projectId);
    }

    res.status(201).json({
      success: true,
      file: {
        path: filePath,
        size: Buffer.byteLength(content),
        created: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('File creation error:', error);
    res.status(500).json({ error: 'File creation failed' });
  }
});

module.exports = router; 