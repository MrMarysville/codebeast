const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../utils/supabase');
const { asyncHandler, ApiError } = require('../middleware/errorMiddleware');

// Create a new project
exports.createProject = asyncHandler(async (req, res) => {
    const { name = 'New Project', description = `Project created on ${new Date().toLocaleDateString()}` } = req.body;
    const projectId = uuidv4();
    
    // Create project in Supabase
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        id: projectId,
        name,
        description,
        status: 'pending',
      created_at: new Date().toISOString(),
      user_id: req.user?.id || '00000000-0000-0000-0000-000000000000' // Default user ID if not authenticated
      }])
      .select()
      .single();

  if (error) {
    throw new ApiError(`Failed to create project in database: ${error.message}`, 500);
  }

    // Create project directory
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    await fs.ensureDir(projectDir);

    res.status(201).json(data);
});

// Get all projects
exports.getAllProjects = asyncHandler(async (req, res) => {
  // Check if we're using local mode (saveLocally is true)
  if (req.query.saveLocally === 'true') {
    try {
      // Read projects from local projects.json
      const uploadsDir = process.env.UPLOADS_DIR || './uploads';
      const projectsFile = path.join(uploadsDir, 'projects.json');
      
      // If projects.json doesn't exist, scan the uploads directory for folders
      if (!fs.existsSync(projectsFile)) {
        console.log('projects.json not found, scanning uploads directory');
        
        // Create projects.json with empty projects array
        fs.writeFileSync(projectsFile, JSON.stringify({ projects: [] }, null, 2));
        
        // Get all directories in uploads folder
        const dirs = fs.readdirSync(uploadsDir).filter(item => {
          const itemPath = path.join(uploadsDir, item);
          return fs.statSync(itemPath).isDirectory() && item !== 'vectors';
        });
        
        // Create project entries for each directory
        const projects = [];
        for (const dir of dirs) {
          const projectId = dir;
          const projectDir = path.join(uploadsDir, dir);
          
          // Check if the directory contains any files
          const files = fs.readdirSync(projectDir);
          if (files.length === 0) continue; // Skip empty directories
          
          // Try to get project info from README.md if it exists
          let name = dir;
          let description = `Project found in directory ${dir}`;
          
          const readmePath = path.join(projectDir, 'README.md');
          if (fs.existsSync(readmePath)) {
            const readmeContent = fs.readFileSync(readmePath, 'utf8');
            const titleMatch = readmeContent.match(/^#\s+(.+)$/m);
            if (titleMatch && titleMatch[1]) {
              name = titleMatch[1].trim();
            }
            
            const descMatch = readmeContent.match(/^#.*\n+([^\n#]+)/m);
            if (descMatch && descMatch[1]) {
              description = descMatch[1].trim();
            }
          }
          
          projects.push({
            id: projectId,
            name: name,
            description: description,
            status: 'ready',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: '00000000-0000-0000-0000-000000000000',
            isLocal: true
          });
        }
        
        // Save projects to projects.json
        fs.writeFileSync(projectsFile, JSON.stringify({ projects }, null, 2));
        
        // Return projects
        return res.json(projects);
      }
      
      // Read projects from projects.json
      const projectsData = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
      return res.json(projectsData.projects || []);
    } catch (error) {
      console.error('Error loading local projects:', error);
      return res.json([]);
    }
  } else {
    // Get projects from Supabase
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new ApiError(`Failed to fetch projects: ${error.message}`, 500);
    }

    res.json(data);
  }
});

// Get project by ID
exports.getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Check if we're using local mode (saveLocally is true)
  if (req.query.saveLocally === 'true') {
    try {
      // Check if project directory exists
      const uploadsDir = process.env.UPLOADS_DIR || './uploads';
      const projectDir = path.join(uploadsDir, projectId);
      
      if (!fs.existsSync(projectDir)) {
        throw new ApiError('Project not found', 404);
      }
      
      // Check if project is in projects.json
      const projectsFile = path.join(uploadsDir, 'projects.json');
      let projectData;
      
      if (fs.existsSync(projectsFile)) {
        const projectsData = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
        projectData = projectsData.projects.find(p => p.id === projectId);
      }
      
      // If project is not in projects.json, create an entry
      if (!projectData) {
        // Get project info from README.md if it exists
        let name = projectId;
        let description = `Project found in directory ${projectId}`;
        
        const readmePath = path.join(projectDir, 'README.md');
        if (fs.existsSync(readmePath)) {
          const readmeContent = fs.readFileSync(readmePath, 'utf8');
          const titleMatch = readmeContent.match(/^#\s+(.+)$/m);
          if (titleMatch && titleMatch[1]) {
            name = titleMatch[1].trim();
          }
          
          const descMatch = readmeContent.match(/^#.*\n+([^\n#]+)/m);
          if (descMatch && descMatch[1]) {
            description = descMatch[1].trim();
          }
        }
        
        projectData = {
          id: projectId,
          name: name,
          description: description,
          status: 'ready',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '00000000-0000-0000-0000-000000000000',
          isLocal: true
        };
        
        // Add project to projects.json
        if (fs.existsSync(projectsFile)) {
          const projectsData = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
          projectsData.projects.push(projectData);
          fs.writeFileSync(projectsFile, JSON.stringify(projectsData, null, 2));
        } else {
          fs.writeFileSync(projectsFile, JSON.stringify({ projects: [projectData] }, null, 2));
        }
      }
      
      // Get files count
      const getFileCount = (dir) => {
        let count = 0;
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          if (item.startsWith('.')) continue;
          
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            count += getFileCount(itemPath);
          } else {
            count++;
          }
        }
        
        return count;
      };
      
      // Add file count to project data
      try {
        projectData.fileCount = getFileCount(projectDir);
      } catch (error) {
        console.error(`Error counting files in project ${projectId}:`, error);
      }
      
      return res.json(projectData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error loading local project:', error);
      throw new ApiError(`Error loading project: ${error.message}`, 500);
    }
  } else {
    // Get project from Supabase
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      throw new ApiError(`Failed to fetch project: ${error.message}`, 500);
    }
    
    if (!data) {
      throw new ApiError('Project not found', 404);
    }

    res.json(data);
  }
});

// Update project
exports.updateProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { name, description } = req.body;

    const { data, error } = await supabase
      .from('projects')
      .update({
        name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

  if (error) {
    throw new ApiError(`Failed to update project: ${error.message}`, 500);
  }
  
    if (!data) {
    throw new ApiError('Project not found', 404);
    }

    res.json(data);
});

// Delete project
exports.deleteProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    // Delete from Supabase
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

  if (error) {
    throw new ApiError(`Failed to delete project from database: ${error.message}`, 500);
  }

    // Delete project directory
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    await fs.remove(projectDir);

    res.status(204).send();
});

// Get project file tree (structured format)
exports.getProjectFileTree = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // Helper function to build file tree recursively
  const buildFileTree = async (dir, basePath = '') => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const result = [];
    
    // Process directories first
    const directories = entries.filter(entry => entry.isDirectory());
    for (const entry of directories) {
      // Skip hidden directories
      if (entry.name.startsWith('.')) continue;
      
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      const stats = await fs.stat(fullPath);
      
      const children = await buildFileTree(fullPath, relativePath);
      
      result.push({
        id: Buffer.from(relativePath).toString('base64'),
        name: entry.name,
        path: relativePath,
        type: 'directory',
        size: 0,
        lastModified: stats.mtime,
        children
      });
    }
    
    // Then process files
    const files = entries.filter(entry => !entry.isDirectory());
    for (const entry of files) {
      // Skip hidden files
      if (entry.name.startsWith('.')) continue;
      
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      const stats = await fs.stat(fullPath);
      
      result.push({
        id: Buffer.from(relativePath).toString('base64'),
        name: entry.name,
        path: relativePath,
        type: 'file',
        size: stats.size,
        lastModified: stats.mtime,
        extension: path.extname(entry.name).toLowerCase()
      });
    }
    
    return result;
  };
  
  const fileTree = await buildFileTree(projectDir);
  
  res.json({
    success: true,
    fileTree
  });
});

// Get project files
exports.getProjectFiles = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // Get all files and directories in the project
  const fileList = [];
  
  // Helper function to recursively get all files
  const getFiles = async (dir, basePath = '') => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        const stats = await fs.stat(fullPath);
        fileList.push({
          type: 'directory',
          name: entry.name,
          path: relativePath,
          size: 0,
          lastModified: stats.mtime
        });
        
        await getFiles(fullPath, relativePath);
      } else {
        const stats = await fs.stat(fullPath);
        fileList.push({
          type: 'file',
          name: entry.name,
          path: relativePath,
          size: stats.size,
          lastModified: stats.mtime,
          extension: path.extname(entry.name).toLowerCase()
        });
      }
    }
  };
  
  await getFiles(projectDir);
  
  res.json({ files: fileList });
});

// Get file content
exports.getFileContent = asyncHandler(async (req, res) => {
  const { projectId, filePath } = req.params;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // Get full file path
  const fullPath = path.join(projectDir, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new ApiError('File not found', 404);
  }
  
  // Check if it's a directory
  const stats = await fs.stat(fullPath);
  if (stats.isDirectory()) {
    throw new ApiError('Not a file', 400);
  }
  
  // Get file content
  const content = await fs.readFile(fullPath, 'utf8');
  
  res.json({
    name: path.basename(filePath),
    path: filePath,
    content,
    size: stats.size,
    lastModified: stats.mtime,
    extension: path.extname(filePath).toLowerCase()
  });
});

// Update file content
exports.updateFileContent = asyncHandler(async (req, res) => {
  const { projectId, filePath } = req.params;
  const { content } = req.body;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // Get full file path
  const fullPath = path.join(projectDir, filePath);
  
  // Create directory if needed
  await fs.ensureDir(path.dirname(fullPath));
  
  // Write file content
  await fs.writeFile(fullPath, content);
  
  // Update project's updated_at timestamp
  const { error: updateError } = await supabase
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId);
    
  if (updateError) {
    console.warn(`Failed to update project timestamp: ${updateError.message}`);
  }
  
  const stats = await fs.stat(fullPath);
  
  res.json({
    name: path.basename(filePath),
    path: filePath,
    size: stats.size,
    lastModified: stats.mtime,
    extension: path.extname(filePath).toLowerCase()
  });
});

// Delete a file
exports.deleteFile = asyncHandler(async (req, res) => {
  const { projectId, filePath } = req.params;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // Get full file path
  const fullPath = path.join(projectDir, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new ApiError('File not found', 404);
  }
  
  // Delete the file
  await fs.remove(fullPath);
  
  // Update project's updated_at timestamp
  const { error: updateError } = await supabase
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId);
    
  if (updateError) {
    console.warn(`Failed to update project timestamp: ${updateError.message}`);
  }
  
  res.status(204).send();
});

// Analyze project
exports.analyzeProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // In a real app, this would trigger a more complex analysis
  // For demo purposes, just return some basic stats
  
  let totalFiles = 0;
  let totalLines = 0;
  let languages = {};
  
  // Helper function to count lines in a file
  const countLines = async (filePath) => {
    const content = await fs.readFile(filePath, 'utf8');
    return content.split('\n').length;
  };
  
  // Helper function to determine language from file extension
  const getLanguage = (fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'css',
      '.json': 'json',
      '.md': 'markdown'
    };
    
    return languageMap[ext] || 'other';
  };
  
  // Helper function to recursively process files
  const processFiles = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processFiles(fullPath);
      } else {
        totalFiles++;
        const language = getLanguage(entry.name);
        
        try {
          const lineCount = await countLines(fullPath);
          totalLines += lineCount;
          
          languages[language] = (languages[language] || 0) + 1;
        } catch (error) {
          console.error(`Error processing file ${fullPath}:`, error);
        }
      }
    }
  };
  
  await processFiles(projectDir);
  
  // Create analysis results
  const analysis = {
    projectId,
    timestamp: new Date().toISOString(),
    stats: {
      totalFiles,
      totalLines,
      languages
    }
  };
  
  // Save analysis to file
  const analysisDir = path.join(projectDir, '.analysis');
  await fs.ensureDir(analysisDir);
  await fs.writeJson(path.join(analysisDir, 'project_analysis.json'), analysis);
  
  res.json(analysis);
});

// Get project analysis
exports.getProjectAnalysis = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // Check if analysis exists
  const analysisPath = path.join(projectDir, '.analysis', 'project_analysis.json');
  if (!fs.existsSync(analysisPath)) {
    // If no analysis exists, create a basic one
    await this.analyzeProject({
      params: { projectId },
      body: {}
    }, {
      json: (data) => {
        res.json(data);
      },
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        }
      })
    });
    return;
  }
  
  // Read and return the analysis
  const analysis = await fs.readJson(analysisPath);
  res.json(analysis);
});

// Start vectorization
exports.startVectorization = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    
    // Update project status
    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update({ status: 'processing' })
      .eq('id', projectId)
      .select()
      .single();

  if (updateError) {
    throw new ApiError(`Failed to update project status: ${updateError.message}`, 500);
  }

    // Create status file
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    const statusFile = path.join(projectDir, '.vectorization_status.json');
    
    await fs.writeJson(statusFile, {
      status: 'processing',
      startTime: new Date().toISOString(),
      progress: 0,
      totalFiles: 0,
      processedFiles: 0
    });

    res.json({ message: 'Vectorization started', status: 'processing' });
});

// Get vectorization status
exports.getVectorizationStatus = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // Check if status file exists
  const statusFile = path.join(projectDir, '.vectorization_status.json');
  if (!fs.existsSync(statusFile)) {
    return res.json({
      status: 'not_started',
      progress: 0
    });
  }
  
  // Read and return the status
  const status = await fs.readJson(statusFile);
  res.json(status);
});

// Get vector data
exports.getVectorData = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // Check if vectors exist
  const vectorDir = path.join(projectDir, 'vectors');
  if (!fs.existsSync(vectorDir)) {
    throw new ApiError('No vector data found', 404);
  }
  
  // For demo purposes, return mock vector data
  const vectorData = {
    nodes: [
      { id: 'n1', label: 'app.js', color: '#4287f5', size: 10 },
      { id: 'n2', label: 'index.js', color: '#4287f5', size: 8 },
      { id: 'n3', label: 'utils.js', color: '#4287f5', size: 6 },
      { id: 'n4', label: 'config.js', color: '#4287f5', size: 4 },
      { id: 'n5', label: 'database.js', color: '#4287f5', size: 7 },
      { id: 'n6', label: 'style.css', color: '#42f5a7', size: 5 },
      { id: 'n7', label: 'index.html', color: '#f5a742', size: 6 }
    ],
    links: [
      { source: 'n1', target: 'n2', value: 1 },
      { source: 'n1', target: 'n3', value: 1 },
      { source: 'n1', target: 'n4', value: 1 },
      { source: 'n2', target: 'n3', value: 1 },
      { source: 'n2', target: 'n5', value: 1 },
      { source: 'n3', target: 'n5', value: 1 },
      { source: 'n1', target: 'n6', value: 1 },
      { source: 'n2', target: 'n7', value: 1 }
    ]
  };
  
  res.json(vectorData);
});

// Get vector languages
exports.getVectorLanguages = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // Check if project exists
  const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
  if (!fs.existsSync(projectDir)) {
    throw new ApiError('Project not found', 404);
  }
  
  // For demo purposes, return mock language data
  const languages = [
    { id: 'javascript', name: 'JavaScript', count: 32, color: '#f0db4f' },
    { id: 'html', name: 'HTML', count: 15, color: '#e34c26' },
    { id: 'css', name: 'CSS', count: 8, color: '#264de4' },
    { id: 'typescript', name: 'TypeScript', count: 20, color: '#007acc' },
    { id: 'json', name: 'JSON', count: 5, color: '#bbb' }
  ];
  
  res.json({ languages });
}); 