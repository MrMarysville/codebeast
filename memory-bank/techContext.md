# Technical Context: Hybrid Encoding System

## Technology Stack

### Frontend
- **Framework**: React.js 19.0.0
- **State Management**: React Context API
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **WebSockets**: Socket.io Client
- **UI Components**: Custom components with CSS modules
- **Code Highlighting**: react-syntax-highlighter
- **File Icons**: react-icons
- **Visualization**: react-force-graph-2d/3d
- **Authentication**: Supabase Auth

### Backend
- **Server**: Node.js with Express
- **Database**: MongoDB with Mongoose
- **File Storage**: Local filesystem
- **Authentication**: JWT with Supabase integration
- **WebSockets**: Socket.io
- **Code Parsing**: tree-sitter
- **Vector Generation**: OpenAI Embeddings API
- **Dimensionality Reduction**: ml-pca
- **Process Management**: child_process

### Development Tools
- **Package Manager**: npm
- **Bundler**: Webpack (via Create React App)
- **Testing**: Jest with React Testing Library
- **Linting**: ESLint
- **Formatting**: Prettier
- **Version Control**: Git
- **CI/CD**: GitHub Actions

## Key Implementation Details

### File Browsing System

#### Backend Implementation

1. **File Tree API Endpoint**
   ```javascript
   // Route definition
   router.get('/filetree/:projectId', projectController.getProjectFileTree);
   
   // Controller implementation
   exports.getProjectFileTree = async (req, res) => {
     try {
       const { projectId } = req.params;
       const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
       
       // Function to build file tree recursively
       const buildFileTree = async (dir, relativePath = '') => {
         const items = await fs.readdir(dir);
         const result = [];
         
         for (const item of items) {
           // Skip hidden files
           if (item.startsWith('.')) continue;
           
           const itemPath = path.join(dir, item);
           const relPath = path.join(relativePath, item).replace(/\\/g, '/');
           const stats = await fs.stat(itemPath);
           
           if (stats.isDirectory()) {
             const children = await buildFileTree(itemPath, relPath);
             result.push({
               name: item,
               path: relPath,
               type: 'directory',
               children
             });
           } else {
             result.push({
               name: item,
               path: relPath,
               type: 'file',
               size: stats.size,
               lastModified: stats.mtime.toISOString()
             });
           }
         }
         
         // Sort: directories first, then files alphabetically
         return result.sort((a, b) => {
           if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
           return a.name.localeCompare(b.name);
         });
       };
       
       const fileTree = await buildFileTree(projectDir);
       return res.status(200).json({ success: true, fileTree });
     } catch (err) {
       return res.status(500).json({
         success: false,
         error: 'Error getting project file tree',
         message: err.message
       });
     }
   };
   ```

2. **File Content API Endpoint**
   ```javascript
   // Route definition
   router.get('/file/:projectId/:filePath(*)', projectController.getFileContent);
   
   // Controller implementation
   exports.getFileContent = async (req, res) => {
     try {
       const { projectId, filePath } = req.params;
       const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
       
       // Normalize and sanitize path to prevent directory traversal
       const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
       const fullPath = path.join(projectDir, normalizedPath);
       
       // Security check
       if (!await fs.pathExists(fullPath) || !fullPath.startsWith(projectDir)) {
         return res.status(404).json({ 
           success: false,
           error: 'File not found or access denied' 
         });
       }
       
       // Check if it's a directory
       const stats = await fs.stat(fullPath);
       if (stats.isDirectory()) {
         return res.status(400).json({
           success: false,
           error: 'Path is a directory, not a file'
         });
       }
       
       // Read file content
       const content = await fs.readFile(fullPath, 'utf8');
       const fileExtension = path.extname(fullPath).toLowerCase().substring(1);
       
       return res.status(200).json({
         success: true,
         file: {
           name: path.basename(fullPath),
           path: normalizedPath,
           type: fileExtension,
           size: stats.size,
           lastModified: stats.mtime.toISOString(),
           content
         }
       });
     } catch (err) {
       return res.status(500).json({
         success: false,
         error: 'Error getting file content',
         message: err.message
       });
     }
   };
   ```

#### Frontend Implementation

1. **FileTree Component**
   ```javascript
   const FileTree = ({ projectId, onFileSelect, selectedFile }) => {
     const [fileTree, setFileTree] = useState(null);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);
     
     useEffect(() => {
       if (projectId) {
         fetchFileTree();
       }
     }, [projectId]);
     
     const fetchFileTree = async () => {
       try {
         setLoading(true);
         setError(null);
         
         const response = await axios.get(`${BACKEND_URL}/project/filetree/${projectId}`);
         
         if (response.data.success) {
           setFileTree(response.data.fileTree);
         } else {
           setError('Failed to load file structure');
         }
       } catch (err) {
         setError(`Error loading file structure: ${err.message}`);
       } finally {
         setLoading(false);
       }
     };
     
     // Render tree nodes recursively
     // Handle loading and error states
     // ...
   };
   ```

2. **FileViewer Component**
   ```javascript
   const FileViewer = ({ selectedFile, projectId }) => {
     const [fileContent, setFileContent] = useState('');
     const [fileInfo, setFileInfo] = useState(null);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState(null);
     
     useEffect(() => {
       if (selectedFile && projectId) {
         fetchFileContent();
       } else {
         setFileContent('');
         setFileInfo(null);
       }
     }, [selectedFile, projectId]);
     
     const fetchFileContent = async () => {
       setLoading(true);
       setError(null);
       
       try {
         const response = await axios.get(`${BACKEND_URL}/project/file/${projectId}/${selectedFile}`);
         
         if (response.data.success) {
           setFileContent(response.data.file.content);
           setFileInfo(response.data.file);
         } else {
           setError('Failed to load file content');
         }
       } catch (err) {
         setError(`Failed to load file content: ${err.message}`);
       } finally {
         setLoading(false);
       }
     };
     
     // Determine language for syntax highlighting
     // Render file content with syntax highlighting
     // Handle loading and error states
     // ...
   };
   ```

### Vectorization System

#### Vector Generation Process

1. **Function Extraction**
   - Uses tree-sitter to parse code files
   - Extracts functions, methods, classes, and components
   - Supports JavaScript, TypeScript, Python, Java, and C++

2. **Vector Embedding**
   - Uses OpenAI API to generate embeddings
   - Each function is converted to a high-dimensional vector
   - Vectors capture semantic meaning of code

3. **Dimensionality Reduction**
   - Uses PCA to reduce vector dimensions
   - Improves visualization and search performance
   - Preserves semantic relationships between functions

#### Vector Visualization

1. **Graph Visualization**
   - Uses react-force-graph for interactive visualization
   - Nodes represent functions/components
   - Edges represent relationships (calls, imports, etc.)
   - Supports 2D and 3D visualization modes

2. **Similarity Search**
   - Finds semantically similar code based on vector proximity
   - Uses cosine similarity for comparison
   - Results ranked by similarity score

### Feature Processing System

1. **Natural Language Processing**
   - Parses feature requests using NLP techniques
   - Extracts key requirements and constraints
   - Maps requests to code implementation strategies

2. **Code Generation**
   - Uses context from existing codebase
   - Generates implementation based on feature request
   - Follows project coding patterns and conventions

3. **Integration**
   - Suggests file locations for new code
   - Handles imports and dependencies
   - Provides preview before applying changes

## Security Considerations

### Authentication

1. **JWT-based Authentication**
   - Tokens issued upon successful login
   - Tokens include user ID and permissions
   - Tokens verified on protected routes

2. **Conditional Authentication**
   - Local operations can bypass authentication for development
   - Production environment enforces authentication for all routes

### File Access Security

1. **Path Normalization**
   - All file paths are normalized to prevent directory traversal
   - Paths are checked to ensure they remain within project directory
   - Hidden files (starting with `.`) are filtered from file listings

2. **Error Handling**
   - Errors are caught and handled gracefully
   - Error messages are informative but don't expose system details
   - Failed operations return appropriate HTTP status codes

## Performance Optimizations

### Backend Optimizations

1. **Efficient File Traversal**
   - Asynchronous file operations
   - Skipping hidden files and directories
   - Caching file structure when appropriate

2. **Vector Processing**
   - Batch processing for large repositories
   - PCA for dimensionality reduction
   - Caching vector data to avoid recomputation

### Frontend Optimizations

1. **Lazy Loading**
   - Components loaded only when needed
   - File content fetched only when selected
   - Visualization rendered on demand

2. **Virtualization**
   - Large lists use virtualization for performance
   - Only visible items are rendered
   - Improves performance with large file trees

3. **Efficient Rendering**
   - WebGL acceleration for graph visualization
   - Canvas-based rendering for complex visualizations
   - Conditional detail levels based on zoom level

## Development Workflow

1. **Local Development**
   - Frontend and backend run on separate ports
   - Proxy configuration for API requests
   - Hot reloading for rapid iteration

2. **Testing**
   - Unit tests for core functionality
   - Integration tests for API endpoints
   - Component tests for UI elements

3. **Deployment**
   - Build process for frontend assets
   - Environment-specific configuration
   - Containerization for consistent deployment

## Vector Utilization & Technical Requirements

### Vector Creation
- **Script Requirements**:
  - Python 3.6+ installed and available in PATH
  - Basic Python libraries (no external dependencies for simple_vector.py)
  - NumPy and Tree-sitter for advanced vectorization (optional)

- **Storage Requirements**:
  - Sufficient disk space for code files and vector data
  - Write permissions in upload directory
  - JSON file storage for local vector data

### Vector Data Utilization
After vectors are created, they're used in several ways:

1. **Search & Retrieval**:
   - Vectors enable semantic search based on code meaning
   - Similar code sections can be identified using vector similarity metrics
   - Search queries are converted to vectors for comparison

2. **Visualization**:
   - Vectors are visualized in 2D/3D space using dimension reduction
   - Code relationships are displayed as graphs based on vector similarity
   - Components are mapped according to their vector representations

3. **Feature Addition**:
   - Vectors help identify relevant code sections for feature implementation
   - Similar vectors suggest patterns that can be extended
   - Vector-based context helps with code generation

4. **Code Understanding**:
   - Vector representations surface code patterns and relationships
   - Function similarity is measured via vector distance
   - Code complexity metrics derived from vector components

### Technical Requirements for Utilization

#### Backend Requirements
- **Memory**: Sufficient RAM for loading vector data (min 1GB)
- **Storage**: Space for vector data (typically 5-10% of codebase size)
- **Processing**: CPU for basic vector operations
- **Networking**: Bandwidth for transferring vector data

#### Frontend Requirements
- **Browser**: Modern browser with ES6+ support
- **Memory**: Sufficient for displaying vector visualizations (min 4GB recommended)
- **Graphics**: Basic GPU acceleration for vector visualization
- **Network**: Bandwidth for vector data transfer

#### Database Requirements
- **Schema**: Tables for projects, vectors, and relationships
- **Capacity**: Storage for vector data (typically 20-30KB per file)
- **Indexing**: Index on vector fields for efficient queries
- **Backup**: Regular backups to prevent data loss

## Development Environment

### Required Tools
- Node.js 14+
- Python 3.6+
- Git
- Code editor with JavaScript/Python support

### Local Development Setup
```bash
# Backend setup
cd backend
npm install
npm run dev

# Frontend setup
cd frontend
npm install
npm start
```

### Environment Variables
```
# Backend (.env)
PORT=5001
FRONTEND_URL=http://localhost:3000
PYTHON_SCRIPTS_PATH=../python-scripts
UPLOADS_DIR=./uploads
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# Frontend (.env)
REACT_APP_BACKEND_URL=http://localhost:5001/api
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-key
```

## Deployment Considerations

### Production Deployment
- Use production builds for frontend
- Configure proper CORS settings
- Set up proper monitoring and logging
- Enable server-side caching for vector data

### Scaling Considerations
- Implement database sharding for large vector datasets
- Use load balancing for multiple backend instances
- Consider worker threads for parallel vector processing
- Implement caching for frequent vector operations 