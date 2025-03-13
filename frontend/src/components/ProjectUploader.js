import React, { useState, useEffect, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import FileInput from './ui/FileInput';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';
import { FiUpload, FiFolder, FiFile, FiDownload, FiCheck } from 'react-icons/fi';
import '../styles/ProjectUploader.css';


// Enhanced component metadata for React 19
export const metadata = {
  componentName: "ProjectUploader",
  description: "Upload and process code projects for vectorization",
  features: [
    "File and folder upload",
    "Progressive upload tracking",
    "Vectorization monitoring",
    "Automatic file filtering"
  ]
};

// Document metadata for React 19
export function generateMetadata() {
  return {
    title: "Upload Project - Code Beast",
    description: "Upload your code project for analysis and vectorization",
    keywords: ["code upload", "project analysis", "vectorization"]
  };
}

// Update to match the actual backend server port (5001)
const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Directories to exclude from upload
const EXCLUDED_DIRECTORIES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  '.cache',
  '.idea',
  '.vscode',
  '__pycache__',
  'venv',
  'env',
  '.env',
  'public/build',
  '.svelte-kit',
  'target',
  'bin',
  'obj',
  'Debug',
  'Release',
  'packages',
  'vendor',
  'bower_components',
  '.nuxt',
  '.output',
  'elm-stuff',
  '.yarn',
  'compiled',
  'artifacts',
  'deployments',
  'runtime'
];

// Binary and generated file extensions to exclude
const EXCLUDED_EXTENSIONS = [
  '.zip', '.tar', '.gz', '.rar', '.7z', '.jar', '.war', '.ear', '.class',
  '.exe', '.dll', '.so', '.dylib', '.obj', '.o', '.a', '.lib',
  '.pyc', '.pyo', '.pyd',
  '.db', '.sqlite', '.sqlite3',
  '.min.js', '.min.css',
  '.log', '.tmp', '.temp',
  '.tsbuildinfo',
  '.map'
];

// Form submit button with status feedback
function SubmitButton({ children, pending }) {
  const { pending: formPending } = useFormStatus();
  
  // Use either prop pending or form pending state
  const isLoading = pending || formPending;
  
  return (
    <Button 
      type="submit" 
      disabled={isLoading}
      loading={isLoading}
      variant="primary"
      size="medium"
      fullWidth
      icon={<FiCheck />}
    >
      {isLoading ? 'Processing...' : children}
    </Button>
  );
}

function ProjectUploader({ onUpload }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Project info, 2: File upload
  const [uploadType, setUploadType] = useState('files'); // 'files' or 'folder'
  const [uploadProgress, setUploadProgress] = useState(0); // Progress for file upload
  const [projectId, setProjectId] = useState(null); // Store project ID after creation
  const [vectorizing, setVectorizing] = useState(false); // Vectorization in progress
  const [vectorProgress, setVectorProgress] = useState({
    status: 'idle', // 'idle', 'processing', 'completed', 'failed'
    processedFiles: 0,
    totalFiles: 0,
    functionsProcessed: 0,
    fileTypes: {},
    metrics: null
  });
  const { session } = useAuth(); // Get the auth session
  
  // State for excluded files statistics
  const [excludedStats, setExcludedStats] = useState({
    total: 0,
    byDirectory: {},
    byExtension: 0
  });
  
  // Flag to control whether exclusions are enabled
  const [enableExclusions, setEnableExclusions] = useState(true);
  
  // Flag to control whether to save locally or to Supabase
  const [saveLocally, setSaveLocally] = useState(true);
  
  // State for download link
  const [downloadLink, setDownloadLink] = useState(null);

  // Function to fetch vector data for download - defined before it's used in useEffect
  const fetchVectorData = useCallback(async (projectId) => {
    try {
      const headers = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await axios.get(
        `${BACKEND_URL}/projects/${projectId}/vectors/data?saveLocally=true`,
        { headers }
      );
      
      return response.data;
    } catch (err) {
      console.error('Error fetching vector data:', err);
      setError('Failed to fetch vector data for download');
      return null;
    }
  }, [session]);
  
  // Define fetchVectorizationStatus with useCallback before using it
  const fetchVectorizationStatus = useCallback(async (projectId) => {
    const headers = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    try {
      const response = await axios.get(
        `${BACKEND_URL}/projects/${projectId}/vectors/status?saveLocally=true`,
        { headers }
      );
      
      return response.data;
    } catch (err) {
      console.error(`Error fetching vectorization status for project ${projectId}:`, err);
      // Return a default status on error
      return {
        status: 'failed',
        processedFiles: 0,
        totalFiles: 0,
        functionsProcessed: 0,
        error: err.message
      };
    }
  }, [session]);
  
  // Poll for vectorization status updates
  useEffect(() => {
    let intervalId;
    
    if (vectorizing && projectId) {
      console.log(`Starting vectorization polling for project ${projectId}`);
      
      intervalId = setInterval(async () => {
        try {
          console.log(`Checking vectorization status for project ${projectId}`);
          const response = await fetchVectorizationStatus(projectId);
          console.log(`Vectorization status:`, response);
          
          setVectorProgress(response);
          
          // Stop polling if vectorization is complete or failed
          if (response.status === 'completed' || response.status === 'failed') {
            console.log(`Vectorization ${response.status}, stopping polling`);
            setVectorizing(false);
            clearInterval(intervalId);
            
            // If vectorization completed and we're saving locally, fetch the vector data
            if (response.status === 'completed' && saveLocally) {
              try {
                console.log(`Fetching vector data for download`);
                const vectorData = await fetchVectorData(projectId);
                if (vectorData) {
                  // Create a download link for the vector data
                  const blob = new Blob([JSON.stringify(vectorData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  setDownloadLink({
                    url,
                    filename: `${name.replace(/\s+/g, '_')}_vectors.json`
                  });
                  
                  // Notify parent component that project is ready
                  console.log(`Notifying parent that project ${projectId} is ready`);
                  onUpload({
                    projectId,
                    name,
                    description,
                    file_count: files.length,
                    vectorStatus: 'completed',
                    saveLocally,
                    vectorDataReady: true
                  });
                }
              } catch (vectorErr) {
                console.error('Error fetching vector data:', vectorErr);
                // Still notify parent even if vector data fetch fails
                onUpload({
                  projectId,
                  name,
                  description,
                  file_count: files.length,
                  vectorStatus: 'completed',
                  saveLocally,
                  vectorDataReady: false
                });
              }
            } else {
              // Pass vector status to parent component for any final actions
              console.log(`Notifying parent of vectorization ${response.status}`);
              onUpload({
                projectId,
                name,
                description,
                file_count: files.length,
                vectorStatus: response.status,
                saveLocally,
                vectorDataReady: response.status === 'completed'
              });
            }
          }
        } catch (err) {
          console.error('Error fetching vectorization status:', err);
          // If we can't fetch status after several attempts, stop polling
          if (err.response && err.response.status === 404) {
            console.log('Project not found, stopping polling');
            setVectorizing(false);
            clearInterval(intervalId);
          }
        }
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (intervalId) {
        console.log('Clearing vectorization polling interval');
        clearInterval(intervalId);
      }
    };
  }, [vectorizing, projectId, name, description, files.length, onUpload, fetchVectorizationStatus, saveLocally, fetchVectorData]);
  
  // Handle file selection with automatic filtering
  const handleFileChange = (files) => {
    setFiles(Array.from(files || []));
    setError(null);
  };
  
  // Handle step 1 form submission
  const handleNextStep = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    setError(null);
    setStep(2);
  };
  
  // Toggle upload type between files and folder
  const toggleUploadType = (type) => {
    setUploadType(type);
    setFiles([]);
    setUploadProgress(0); // Reset progress when upload type changes
  };
  
  // Start vectorization process for the uploaded project
  const startVectorization = async (projectId) => {
    try {
      setVectorizing(true);
      setVectorProgress({
        status: 'processing',
        processedFiles: 0,
        totalFiles: files.length,
        functionsProcessed: 0,
        fileTypes: {},
        metrics: null
      });
      
      // First, check if the Python vectorization was already run during upload
      try {
        const statusResponse = await fetchVectorizationStatus(projectId);
        
        // If vectorization is already in progress or completed from the upload process
        if (statusResponse.status === 'processing' || statusResponse.status === 'completed') {
          console.log('Vectorization already started by Python script during upload');
          setVectorProgress(statusResponse);
          return statusResponse;
        }
      } catch (statusErr) {
        // If we can't get the status, we'll proceed with manually starting vectorization
        console.log('No existing vectorization found, starting manually');
      }
      
      // Get the auth token
      const headers = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      // Add saveLocally parameter to the request
      const payload = {
        saveLocally: true
      };
      
      // Call vectorization endpoint to start the process
      try {
        const response = await axios.post(
          `${BACKEND_URL}/projects/${projectId}/vectorize`,
          payload,
          { headers }
        );
        
        console.log('Vectorization started:', response.data);
        return response.data;
      } catch (err) {
        // Handle authentication errors specifically
        if (err.response && err.response.status === 401) {
          console.error('Authentication error during vectorization:', err);
          setError('Authentication error: Please make sure saveLocally is set to true for local development. The server requires authentication for cloud storage.');
          
          // Try again with saveLocally explicitly set
          try {
            console.log('Retrying with explicit saveLocally parameter...');
            const retryResponse = await axios.post(
              `${BACKEND_URL}/projects/${projectId}/vectorize`,
              { ...payload, saveLocally: true },
              { headers }
            );
            console.log('Retry successful:', retryResponse.data);
            return retryResponse.data;
          } catch (retryErr) {
            throw new Error(`Retry failed: ${retryErr.message}`);
          }
        } else {
          throw err; // Re-throw other errors to be caught by the outer catch block
        }
      }
    } catch (err) {
      console.error('Error starting vectorization:', err);
      setVectorizing(false);
      setVectorProgress(prev => ({
        ...prev,
        status: 'failed'
      }));
      
      // Enhanced error message with troubleshooting suggestions
      let errorMessage = `Failed to start code vectorization: ${err.message}`;
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage += "\n\nAuthentication error: The server requires authentication. For local development, make sure 'saveLocally' is set to true.";
        } else if (err.response.status === 404) {
          errorMessage += "\n\nEndpoint not found: Check if the backend server is running and the API route is correct.";
        } else if (err.response.status >= 500) {
          errorMessage += "\n\nServer error: There might be an issue with the backend server or Python scripts.";
        }
      } else if (err.message.includes('Network Error')) {
        errorMessage += "\n\nNetwork error: Check if the backend server is running at the correct address and port.";
      }
      
      setError(errorMessage);
    }
  };
  
  // Handle project upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError(`Please select ${uploadType === 'files' ? 'at least one file' : 'a folder'}`);
      return;
    }
    
    setUploading(true);
    setError(null);
    setUploadProgress(0); // Reset progress when upload starts
    
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('uploadType', uploadType);
      formData.append('saveLocally', saveLocally.toString());
      
      // Append each file to the formData
      files.forEach(file => {
        // Use webkitRelativePath for folder uploads
        const relativePath = file.webkitRelativePath || file.name;
        console.log(`Adding file to FormData: ${relativePath}`);
        formData.append('project_files', file, relativePath);
      });
      
      console.log(`Uploading to ${BACKEND_URL}/project/upload`);
      console.log(`Total files: ${files.length}, Upload type: ${uploadType}`);
      
      // Get the auth token and add it to the request if available
      const headers = {
        'Content-Type': 'multipart/form-data'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('Added auth token to request');
      } else {
        console.log('No auth token available');
      }
      
      // Check if the server is reachable before attempting the upload
      try {
        await axios.get(`${BACKEND_URL.split('/api')[0]}/health`);
      } catch (healthErr) {
        console.error('Server health check failed:', healthErr);
        setError(`Server is not responding. Please check if the backend server is running on ${BACKEND_URL.split('/api')[0]}.`);
        setUploading(false);
        return;
      }
      
      const response = await axios.post(
        `${BACKEND_URL}/project/upload`, 
        formData, 
        { 
          headers,
          // Add upload progress event handler
          onUploadProgress: (progressEvent) => {
            // Calculate the progress percentage
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload progress: ${percentCompleted}%`);
            setUploadProgress(percentCompleted);
          }
        }
      );
      
      console.log('Upload response:', response.data);
      
      if (response.data.success) {
        console.log('Upload successful:', response.data);
        const newProjectId = response.data.projectId;
        setProjectId(newProjectId);
        
        // Start vectorization process
        await startVectorization(newProjectId);
        
        // Update parent component with initial status
        onUpload({
          projectId: newProjectId,
          name,
          description,
          file_count: files.length,
          vectorizing: true,
          saveLocally
        });
      } else {
        console.error('Upload failed with server error:', response.data);
        setError(response.data.message || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error uploading project:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError(`Network error: ${err.message}. Please check if the backend server is running.`);
    } finally {
      setUploading(false);
    }
  };
  
  // Handle back to previous step
  const handleBack = () => {
    setStep(1);
  };
  
  // Helper to format vectorization progress message
  const getVectorizationProgressMessage = () => {
    const { status, processedFiles, totalFiles, functionsProcessed, fileTypes, metrics } = vectorProgress;
    
    if (status === 'processing') {
      let message = `Processing codebase (${processedFiles}/${totalFiles} files`;
      if (functionsProcessed) {
        message += `, ${functionsProcessed} functions vectorized`;
      }
      message += ')';
      return message;
    } else if (status === 'completed') {
      let message = `Vectorization complete! `;
      
      if (functionsProcessed) {
        message += `${functionsProcessed} functions processed`;
      } else {
        message += `${processedFiles || totalFiles} files processed`;
      }
      
      // If we have code metrics, display them
      if (metrics) {
        if (metrics.avgComplexity) {
          message += ` | Avg. complexity: ${metrics.avgComplexity.toFixed(1)}`;
        }
        if (metrics.totalLines) {
          message += ` | ${metrics.totalLines.toLocaleString()} total lines`;
        }
      }
      
      // If we have file type information, show the file type breakdown
      if (fileTypes && Object.keys(fileTypes).length > 0) {
        const fileTypeStr = Object.entries(fileTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([ext, count]) => `${count} ${ext}`)
          .join(', ');
        
        message += ` | Types: ${fileTypeStr}`;
      }
      
      return message;
    } else if (status === 'failed') {
      return 'Vectorization failed. You can still use the project, but code search may be limited.';
    } else {
      return 'Starting vectorization using Python scripts...';
    }
  };
  
  // Calculate progress percentage for vectorization
  const getVectorProgressPercentage = () => {
    const { status, processedFiles, totalFiles } = vectorProgress;
    if (status === 'completed') return 100;
    if (status === 'failed') return 100;
    if (totalFiles === 0) return 0;
    return Math.min(Math.round((processedFiles / totalFiles) * 100), 99); // Max 99% until completed
  };
  
  // Handle download of vector data
  const handleDownload = () => {
    if (downloadLink) {
      const a = document.createElement('a');
      a.href = downloadLink.url;
      a.download = downloadLink.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  // Define the form submission action
  async function handleProjectSubmit(formData) {
    try {
      // Create project data
      const projectData = {
        name: formData.get('name'),
        description: formData.get('description'),
        user_id: session?.user?.id || 'anonymous',
        save_locally: formData.get('storage') === 'local'
      };
      
      const response = await axios.post(`${BACKEND_URL}/projects`, projectData);
      return { success: true, projectId: response.data.id };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to create project'
      };
    }
  }

  // Define form handlers
  const handleSubmitInfo = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      setUploading(true);
      
      // Create project
      const response = await axios.post(`${BACKEND_URL}/projects`, {
        name,
        description,
        user_id: session?.user?.id || 'anonymous',
        save_locally: saveLocally
      });
      
      setProjectId(response.data.id);
      setStep(2); // Move to file upload step
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create project');
    } finally {
      setUploading(false);
    }
  }, [name, description, session?.user?.id, saveLocally]);

  // Render file select UI based on upload type
  const renderFileSelector = () => {
    // Determine allowed file extensions
    const allowedExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'rb', 'php', 
      'go', 'c', 'cpp', 'h', 'cs', 'html', 'css', 'scss', 
      'rs', 'swift', 'kt', 'md', 'json', 'yaml', 'yml'
    ];

    return (
      <div className="file-selector-container">
        <div className="upload-type-toggle">
          <Button 
            variant={uploadType === 'files' ? 'primary' : 'secondary'}
            size="medium"
            onClick={() => toggleUploadType('files')}
            icon={<FiFile />}
          >
            Select Files
          </Button>
          <Button 
            variant={uploadType === 'folder' ? 'primary' : 'secondary'}
            size="medium"
            onClick={() => toggleUploadType('folder')}
            icon={<FiFolder />}
          >
            Select Folder
          </Button>
        </div>

        <FileInput
          id="file-upload"
          label="Choose files to upload"
          multiple={uploadType === 'files'}
          directory={uploadType === 'folder'}
          onChange={handleFileChange}
          placeholder={uploadType === 'files' ? 'Select files to upload' : 'Select a folder to upload'}
          maxSize={50} // 50MB max file size
          allowedExtensions={allowedExtensions}
          error={error}
          required
          showFileList={true}
        />
      </div>
    );
  };

  // Render project form
  const renderProjectForm = () => {
    return (
      <div className="project-form">
        <h2>Create a New Project</h2>
        
        <form onSubmit={handleSubmitInfo} action={handleProjectSubmit}>
          <div className="form-group">
            <label htmlFor="project-name">Project Name</label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="project-description">Description</label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project"
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label>Storage Options</label>
            <div className="storage-options">
              <div className="storage-option">
                <input
                  type="radio"
                  id="storage-local"
                  name="storage"
                  value="local"
                  defaultChecked
                />
                <label htmlFor="storage-local">
                  <strong>Local Storage</strong>
                  <p>Files are processed locally and not stored on external servers</p>
                </label>
              </div>
              <div className="storage-option disabled">
                <input
                  type="radio"
                  id="storage-cloud"
                  name="storage"
                  value="cloud"
                  disabled
                />
                <label htmlFor="storage-cloud">
                  <strong>Cloud Storage</strong>
                  <p>Store in cloud for collaboration (coming soon)</p>
                </label>
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <Button 
              type="button" 
              variant="secondary"
              onClick={handleBack}
              disabled={step === 1}
            >
              Back
            </Button>
            <SubmitButton>Create Project</SubmitButton>
          </div>
        </form>
      </div>
    );
  };

  // Render upload progress
  const renderUploadProgress = () => {
    return (
      <div className="upload-progress-container">
        <h2>Uploading Project Files</h2>
        
        <LoadingState
          type="progress"
          size="large"
          progress={uploadProgress}
          message={`Uploading files... ${uploadProgress}%`}
        />
        
        <p className="upload-info">
          This might take a while depending on the size of your project.
        </p>
      </div>
    );
  };

  // Render vectorization progress
  const renderVectorizationProgress = () => {
    const progressMessage = getVectorizationProgressMessage();
    const progressPercentage = getVectorProgressPercentage();
    
    return (
      <div className="vectorization-container">
        <h2>Processing Your Project</h2>
        
        <LoadingState
          type="progress"
          size="large"
          progress={progressPercentage}
          message={progressMessage}
        />
        
        <div className="vectorization-stats">
          <div className="stat">
            <span className="stat-label">Files Processed:</span>
            <span className="stat-value">
              {vectorProgress.processedFiles} / {vectorProgress.totalFiles}
            </span>
          </div>
          
          <div className="stat">
            <span className="stat-label">Functions Extracted:</span>
            <span className="stat-value">{vectorProgress.functionsProcessed}</span>
          </div>
        </div>
        
        {vectorProgress.status === 'completed' && (
          <div className="vectorization-complete">
            <h3>Vectorization Complete!</h3>
            <div className="actions">
              <Button 
                variant="primary" 
                onClick={handleDownload}
                icon={<FiDownload />}
              >
                Download Results
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onUpload && onUpload(projectId)}
              >
                Explore Project
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main render method
  if (error) {
    return (
      <div className="project-uploader">
        <ErrorState 
          error={error}
          title="Error uploading project"
          variant="card"
          onRetry={() => setError(null)}
        />
      </div>
    );
  }

  return (
    <div className="project-uploader">
      {uploading ? (
        renderUploadProgress()
      ) : vectorizing ? (
        renderVectorizationProgress()
      ) : step === 1 ? (
        renderProjectForm()
      ) : (
        <>
          <h2>Upload Project Files</h2>
          {renderFileSelector()}
          
          <div className="upload-actions">
            <Button 
              variant="secondary" 
              onClick={handleBack}
            >
              Back
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={!files.length}
              loading={uploading}
              icon={<FiUpload />}
            >
              Upload Files
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProjectUploader;