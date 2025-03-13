import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import ChatInterface from './ChatInterface';
import CodePreview from './CodePreview';
import ProjectSettings from './ProjectSettings';
import FileTree from './FileTree';
import FileViewer from './FileViewer';
import { useAuth } from '../contexts/AuthContext';
import VectorExplorer from './VectorExplorer';
import FunctionGraph from './FunctionGraph';
import SimilaritySearch from './SimilaritySearch';
import VectorizationStatus from './VectorizationStatus';
import StatusBar from './StatusBar';
import FileTypeBreakdown from './FileTypeBreakdown';
import CodeComplexityView from './CodeComplexityView';
import '../styles/ProjectWorkspace.css';


// Component metadata for React 19
export const metadata = {
  componentName: "ProjectWorkspace",
  description: "ProjectWorkspace component",
};

// Set backend URL from environment or default
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

const TAB_CONFIG = [
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'vectors', label: 'Vectors', icon: '🔍' },
  { id: 'features', label: 'Features', icon: '✨' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

function ProjectWorkspace() {
  const [status, setStatus] = useState('connecting');
  const [messages, setMessages] = useState([]);
  const [previewContent, setPreviewContent] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState('files');
  const [selectedFile, setSelectedFile] = useState(null);
  const [vectorizationStatus, setVectorizationStatus] = useState(null);
  const [isVectorDataLoaded, setIsVectorDataLoaded] = useState(false);
  
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  // Fetch project data when component mounts
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        console.log(`Fetching project with ID: ${projectId}`);
        
        // Set up headers with authentication if available
        const headers = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        // Define all the endpoints we'll try in order
        const endpoints = [
          // Authenticated endpoint (with /api)
          `${BACKEND_URL}/projects/${projectId}`,
          // Direct endpoint (no /api)
          `/projects/${projectId}`,
          // Local project endpoint under /project path
          `${BACKEND_URL}/project/projects/${projectId}/info`,
          // Direct endpoint with /info
          `/projects/${projectId}/info`,
          // Local endpoints without BACKEND_URL
          `project/projects/${projectId}/info`,
          `projects/${projectId}/info`
        ];
        
        console.log(`Trying ${endpoints.length} endpoints for project ${projectId}`);
        
        // Try all endpoints until one works
        let success = false;
        let lastError = null;
        
        for (const endpoint of endpoints) {
          try {
            console.log(`Trying endpoint: ${endpoint}`);
            const response = await axios.get(endpoint, { headers });
            
            if (response.data && response.data.success) {
              console.log(`Successfully fetched project from ${endpoint}`);
              setProject(response.data.project);
              setLoading(false);
              success = true;
              break;
            }
          } catch (err) {
            console.log(`Error fetching from ${endpoint}: ${err.message}`);
            lastError = err;
            // Continue to next endpoint
          }
        }
        
        if (!success) {
          console.error('All endpoints failed:', lastError);
          throw lastError || new Error('Failed to fetch project from any endpoint');
        }
      } catch (err) {
        console.error('Error loading project:', err);
        
        // Provide more descriptive error messages based on status codes
        if (err.response) {
          const status = err.response.status;
          switch (status) {
            case 400:
              setError(`Invalid project ID or parameters (${projectId})`);
              break;
            case 401:
              setError('Authentication required - please log in again');
              break;
            case 403:
              setError('You do not have permission to access this project');
              break;
            case 404:
              setError(`Project not found - ID: ${projectId} may have been deleted or is incorrect`);
              break;
            default:
              setError(`Server error (${status}): ${err.response.data?.message || 'Unknown error'}`);
          }
        } else if (err.request) {
          // Request was made but no response received
          setError('No response from server. Please check your network connection.');
        } else {
          // Something else went wrong
          setError(`Error: ${err.message}`);
        }
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    } else {
      setError('No project ID provided');
      setLoading(false);
    }
  }, [projectId, session]);

  // Add new useEffect for vector status checking
  useEffect(() => {
    const checkVectorization = async () => {
      if (!project) return;
      
      try {
        // Define all possible endpoints to try
        const endpoints = [
          `${BACKEND_URL}/projects/${projectId}/vectorization-status`,
          `/projects/${projectId}/vectorization-status`,
          `${BACKEND_URL}/api/projects/${projectId}/vectors/status?saveLocally=true`,
          `/api/projects/${projectId}/vectors/status?saveLocally=true`
        ];
        
        console.log('Checking vectorization status...');
        
        // Try each endpoint until one works
        let success = false;
        let lastError = null;
        
        for (const endpoint of endpoints) {
          try {
            console.log(`Trying vectorization status endpoint: ${endpoint}`);
            const response = await axios.get(endpoint);
            
            if (response.data && response.data.success) {
              console.log(`Successfully fetched vectorization status from ${endpoint}:`, response.data);
              setVectorizationStatus(response.data.status);
              setIsVectorDataLoaded(response.data.status === 'completed');
              success = true;
              break;
            }
          } catch (err) {
            console.log(`Error fetching vectorization status from ${endpoint}:`, err.message);
            lastError = err;
            // Continue to next endpoint
          }
        }
        
        if (!success) {
          console.error('All vectorization status endpoints failed:', lastError);
          throw lastError || new Error('Failed to fetch vectorization status from any endpoint');
        }
      } catch (err) {
        console.error('Error checking vectorization status:', err);
      }
    };

    checkVectorization();
    // Poll for status every 5 seconds if vectorization is in progress
    const interval = setInterval(() => {
      if (vectorizationStatus === 'processing') {
        checkVectorization();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [project, projectId, vectorizationStatus]);
  
  // Connect to Socket.io
  useEffect(() => {
    if (!projectId || !session) return;
    
    // Initialize socket connection
    const newSocket = io(BACKEND_URL, {
      query: { projectId },
      auth: {
        token: session.access_token
      }
    });
    
    setSocket(newSocket);
    
    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setStatus('connected');
      
      // Join project room
      newSocket.emit('join_project', { projectId });
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setStatus('disconnected');
      
      // Add disconnect message
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          content: 'Disconnected from server. Trying to reconnect...',
          timestamp: new Date()
        }
      ]);
    });
    
    newSocket.on('progress', (data) => {
      setStatus(data.status || 'processing');
      
      // Add system message
      if (data.message) {
        setMessages(prev => [
          ...prev,
          { 
            type: 'system', 
            content: data.message, 
            timestamp: new Date() 
          }
        ]);
      }
    });
    
    newSocket.on('preview', (data) => {
      setPreviewContent(data);
    });
    
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          content: `Error: ${error.message || 'Something went wrong'}`,
          timestamp: new Date()
        }
      ]);
    });
    
    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [projectId, session]);
  
  // Handle file selection
  const handleFileSelect = (filePath) => {
    setSelectedFile(filePath);
  };

  // Feature request handler
  const handleFeatureRequest = async (request, options = {}) => {
    if (!socket || status === 'disconnected') {
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          content: 'Cannot process request: Not connected to server',
          timestamp: new Date()
        }
      ]);
      return;
    }
    
    try {
      // Add user message to chat
      setMessages(prev => [
        ...prev,
        {
          type: 'user',
          content: request,
          timestamp: new Date()
        }
      ]);
      
      // Emit request to server
      socket.emit('feature_request', {
        projectId,
        request,
        options
      });
      
      // Add processing message
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          content: 'Processing your request...',
          timestamp: new Date()
        }
      ]);
      
      // Set status to processing
      setStatus('processing');
    } catch (err) {
      console.error('Error sending feature request:', err);
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          content: `Error: ${err.message || 'Failed to send request'}`,
          timestamp: new Date()
        }
      ]);
    }
  };
  
  // Show appropriate loading, error, or content UI
  if (loading) {
    return (
      <div className="project-workspace loading-state">
        <div className="loading-animation">
          <div className="spinner"></div>
          <p>Loading project workspace...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="project-workspace error-state">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
            <button onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Render main workspace
  return (
    <div className="project-workspace">
      <div className="workspace-header">
        <h1>{project?.name || 'Project Workspace'}</h1>
        <div className="workspace-actions">
          <button onClick={() => navigate('/projects')}>
            Back to Projects
          </button>
        </div>
      </div>
      
      <div className="workspace-tabs">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      
      <div className="workspace-content">
        {activeTab === 'files' && (
          <div className="files-container">
            <div className="file-tree-container">
              <FileTree 
                projectId={projectId} 
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            </div>
            <div className="file-viewer-container">
              <FileViewer 
                selectedFile={selectedFile}
                projectId={projectId}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'vectors' && (
          <div className="vectors-container">
            <VectorizationStatus
              projectId={projectId}
              status={vectorizationStatus}
              onStatusChange={setVectorizationStatus}
            />
            {isVectorDataLoaded && (
              <>
                <div className="vector-analysis-grid">
                  <FileTypeBreakdown />
                  <CodeComplexityView projectId={projectId} />
                  <VectorExplorer projectId={projectId} />
                </div>
                <FunctionGraph projectId={projectId} />
                <SimilaritySearch projectId={projectId} />
              </>
            )}
          </div>
        )}
        
        {activeTab === 'features' && (
          <div className="features-container">
            <div className="chat-container">
              <ChatInterface 
                messages={messages} 
                onSendMessage={handleFeatureRequest} 
                status={status}
              />
            </div>
            <div className="preview-container">
              <CodePreview content={previewContent} />
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="settings-container">
            <ProjectSettings 
              project={project} 
              projectId={projectId}
            />
          </div>
        )}
      </div>
      
      <StatusBar 
        status={status} 
        projectId={projectId}
        projectName={project?.name}
      />
    </div>
  );
}

export default ProjectWorkspace; 