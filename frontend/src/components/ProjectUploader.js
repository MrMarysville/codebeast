import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import FileInput from './ui/FileInput';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';
import { FiUpload, FiFolder, FiFile, FiDownload, FiCheck } from 'react-icons/fi';
import '../styles/ProjectUploader.css';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// eslint-disable-next-line no-unused-vars
import {
  Box,
  CircularProgress,
  Container,
  IconButton,
  LinearProgress,
  Paper,
  TextField,
  Typography
} from '@mui/material';

// eslint-disable-next-line no-unused-vars
import {
  ArrowBack as BackIcon,
  CloudUpload as UploadIcon,
  Folder as FolderIcon,
  Archive as ZipIcon,
  Delete as DeleteIcon,
  Check as CheckIcon
} from '@mui/icons-material';

import { projectAPI, fileAPI } from '../utils/api';
// eslint-disable-next-line no-unused-vars
import { formatFileSize } from '../utils/systemUtils';

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
// eslint-disable-next-line no-unused-vars
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
// eslint-disable-next-line no-unused-vars
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
  // Provide a default empty object for useAuth() result to prevent null destructuring error
  const { currentUser, loading: authLoading } = useAuth() || {};
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [zipFile, setZipFile] = useState(null);
  const [uploadType, setUploadType] = useState('files'); // 'files' or 'zip'
  // eslint-disable-next-line no-unused-vars
  const [directoryName, setDirectoryName] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [isCreatingDirectory, setIsCreatingDirectory] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [isUploading, setIsUploading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  // eslint-disable-next-line no-unused-vars
  const [projectName, setProjectName] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [projectDescription, setProjectDescription] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [projectLanguage, setProjectLanguage] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [vectorizationStatus, setVectorizationStatus] = useState('not_started');
  // eslint-disable-next-line no-unused-vars
  const [vectorizationProgress, setVectorizationProgress] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [projectData, setProjectData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedZipFile, setSelectedZipFile] = useState(null);
  const [extractPath, setExtractPath] = useState('');
  const [vectorizing, setVectorizing] = useState(false);
  const [vectorProgress, setVectorProgress] = useState({
    status: 'not_started',
    progress: 0,
    details: {}
  });
  
  // Add missing refs
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);
  
  // Add missing state variables
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Fix setProjectId
  // eslint-disable-next-line no-unused-vars
  const [projectId2, setProjectId] = useState(null);
  
  // State for excluded files statistics
  // eslint-disable-next-line no-unused-vars
  const [excludedStats, setExcludedStats] = useState({
    total: 0,
    byDirectory: {},
    byExtension: 0
  });
  
  // Flag to control whether exclusions are enabled
  // eslint-disable-next-line no-unused-vars
  const [enableExclusions, setEnableExclusions] = useState(true);
  
  // Flag to control whether to save locally or to Supabase
  const [saveLocally, setSaveLocally] = useState(true);
  
  // State for download link
  const [downloadLink, setDownloadLink] = useState(null);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getProjectById(projectId);
      setProjectData(response.data);
    } catch (err) {
      console.error('Error fetching project:', err);
      toast.error('Failed to load project details');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId, fetchProject]);

  // eslint-disable-next-line no-unused-vars
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  // eslint-disable-next-line no-unused-vars
  const handleZipSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/zip') {
      setSelectedZipFile(file);
    } else {
      toast.error('Please select a valid ZIP file');
      setSelectedZipFile(null);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleUploadFiles = async () => {
    if (!selectedFiles.length) {
      toast.error('Please select files to upload');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      // Create FormData object to send files
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Set up headers
      const headers = {
        'Content-Type': 'multipart/form-data',
      };
      
      // Add auth token if available
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      
      // Upload files
      const response = await fileAPI.uploadFile(projectId, formData, extractPath);
      
      toast.success('Files uploaded successfully');
      
      // Redirect to project
      navigate(`/projects/${projectId}`);
      
      return response.data;
    } catch (error) {
      console.error('Error uploading files:', error);
      setError(error.message || 'Failed to upload files');
      toast.error('Failed to upload files');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleUploadZip = async () => {
    if (!selectedZipFile) {
      toast.error('Please select a ZIP file to upload');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      // Create FormData object to send ZIP file
      const formData = new FormData();
      formData.append('zipFile', selectedZipFile);
      
      // Set up headers
      const headers = {
        'Content-Type': 'multipart/form-data',
      };
      
      // Add auth token if available
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      
      // Upload ZIP file
      const response = await fileAPI.uploadZip(projectId, formData, extractPath);
      
      toast.success('ZIP file uploaded and extracted successfully');
      
      // Redirect to project
      navigate(`/projects/${projectId}`);
      
      return response.data;
    } catch (error) {
      console.error('Error uploading ZIP file:', error);
      setError(error.message || 'Failed to upload ZIP file');
      toast.error('Failed to upload ZIP file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleCreateDirectory = async () => {
    try {
      const dirPath = prompt('Enter directory path (e.g., src/components)');
      if (!dirPath) return;

      await fileAPI.createDirectory(projectId, dirPath);
      toast.success(`Directory "${dirPath}" created successfully`);
    } catch (err) {
      console.error('Error creating directory:', err);
      toast.error('Failed to create directory');
    }
  };

  // Function to fetch vector data for download - defined before it's used in useEffect
  const fetchVectorData = useCallback(async (projectId) => {
    try {
      const headers = {};
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
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
  }, [currentUser]);
  
  // Define fetchVectorizationStatus with useCallback before using it
  const fetchVectorizationStatus = useCallback(async (projectId) => {
    const headers = {};
    if (currentUser?.token) {
      headers['Authorization'] = `Bearer ${currentUser.token}`;
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
  }, [currentUser]);
  
  // Poll for vectorization status updates
  const checkVectorizationStatus = useCallback(async (projectId) => {
    try {
      // Poll for status updates
      const status = await fetchVectorizationStatus(projectId);
      setVectorProgress(status);
      
      // If vectorization is still processing, poll again after a delay
      if (status.status === 'processing') {
        setTimeout(() => checkVectorizationStatus(projectId), 5000);
      } else if (status.status === 'completed') {
        setVectorizing(false);
        toast.success('Vectorization completed successfully!');
      } else if (status.status === 'failed') {
        setVectorizing(false);
        toast.error('Vectorization failed. Please check the logs for details.');
      }
    } catch (error) {
      console.error('Error checking vectorization status:', error);
      setVectorizing(false);
      toast.error('Failed to check vectorization status');
    }
  }, [fetchVectorizationStatus]);
  
  // Handle file selection with automatic filtering
  const handleFileChange = (files) => {
    setFiles(Array.from(files || []));
    setError(null);
  };
  
  // eslint-disable-next-line no-unused-vars
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
      
      // Set up headers
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if available
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      
      // Start vectorization
      await projectAPI.startVectorization(projectId);
      
      toast.info('Vectorization started. This may take a few minutes.');
      
      // Start polling for status
      checkVectorizationStatus(projectId);
    } catch (error) {
      console.error('Error starting vectorization:', error);
      setError(error.message || 'Failed to start vectorization');
      toast.error('Failed to start vectorization');
      setVectorizing(false);
    }
  };
  
  // Handle project upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || name.trim() === '') {
      toast.error('Project name is required');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      // Create new project
      const formData = {
        name,
        description: description || `Project created on ${new Date().toLocaleDateString()}`,
        source: 'web-upload',
        saveLocally
      };
      
      // Set up headers
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if available
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      
      // Create project
      const response = await projectAPI.createProject(formData);
      const newProjectId = response.data.id;
      
      toast.success('Project created successfully');
      
      // Go to next step
      setStep(2);
      
      // Update project ID for further operations
      setProjectId(newProjectId);
      
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error.message || 'Failed to create project');
      toast.error('Failed to create project');
      return null;
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
      setLoading(true);
      setError(null);
      
      // Add the user ID if available
      const dataWithUser = {
        ...formData,
        user_id: currentUser?.id || 'anonymous',
        saveLocally
      };
      
      // Create the project in the database
      const response = await projectAPI.createProject(dataWithUser);
      const newProjectId = response.data.id;
      
      // If creating a project with files
      if (formData.files && formData.files.length > 0) {
        // Upload files to the project
        const fileFormData = new FormData();
        formData.files.forEach(file => {
          fileFormData.append('files', file);
        });
        
        await fileAPI.uploadFile(newProjectId, fileFormData);
      }
      
      // Pass the project data back up to parent if needed
      if (onUpload) {
        onUpload({
          ...response.data,
          user_id: currentUser?.id || 'anonymous',
          files: formData.files || []
        });
      }
      
      // Navigate to the new project
      toast.success('Project created successfully!');
      navigate(`/projects/${newProjectId}`);
      
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error.message || 'Failed to create project');
      toast.error('Error creating project: ' + (error.message || 'Unknown error'));
      return null;
    } finally {
      setLoading(false);
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
        user_id: currentUser?.id || 'anonymous',
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
  }, [name, description, currentUser?.id, saveLocally]);

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
            <label htmlFor="storage-options">Storage Options</label>
            <div className="storage-options" id="storage-options">
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