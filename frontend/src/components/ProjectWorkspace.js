import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Paper,
  Typography,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Upload as UploadIcon,
  Folder as FolderIcon,
  Description as FileIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
  Code as CodeIcon,
  AccountTree as TreeIcon,
  BubbleChart as GraphIcon,
  CloudUpload as CloudUploadIcon,
  AutoFixHigh as AutoFixHighIcon
} from '@mui/icons-material';
import { projectAPI } from '../utils/api';

// Component metadata for React 19
export const metadata = {
  componentName: "ProjectWorkspace",
  description: "ProjectWorkspace component",
};

function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [vectorizing, setVectorizing] = useState(false);
  const [vectorizationStatus, setVectorizationStatus] = useState(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getProjectById(projectId);
      setProject(response.data);
    } catch (err) {
      console.error('Error fetching project:', err);
      toast.error('Failed to load project details');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  const fetchFiles = useCallback(async () => {
    try {
      setFileLoading(true);
      const response = await projectAPI.getProjectFiles(projectId);
      setFiles(response.data.files);
    } catch (err) {
      console.error('Error fetching files:', err);
      toast.error('Failed to load project files');
    } finally {
      setFileLoading(false);
    }
  }, [projectId]);

  const checkVectorizationStatus = useCallback(async () => {
    try {
      const response = await projectAPI.getVectorizationStatus(projectId);
      setVectorizationStatus(response.data);
      
      // If vectorization is in progress, poll for updates
      if (response.data.status === 'processing') {
        setVectorizing(true);
        setTimeout(checkVectorizationStatus, 5000); // Poll every 5 seconds
      } else {
        setVectorizing(false);
      }
    } catch (err) {
      console.error('Error checking vectorization status:', err);
      setVectorizing(false);
    }
  }, [projectId]);
  
  useEffect(() => {
    fetchProject();
    fetchFiles();
    checkVectorizationStatus();
  }, [projectId, fetchProject, fetchFiles, checkVectorizationStatus]);

  const startVectorization = async () => {
    try {
      setVectorizing(true);
      await projectAPI.startVectorization(projectId);
      toast.info('Vectorization started. This may take a few minutes.');
      checkVectorizationStatus();
    } catch (err) {
      console.error('Error starting vectorization:', err);
      toast.error('Failed to start vectorization');
      setVectorizing(false);
    }
  };

  const handleDeleteFile = async (filePath) => {
    if (!window.confirm(`Are you sure you want to delete ${filePath}?`)) {
      return;
    }
    
    try {
      await projectAPI.deleteFile(projectId, filePath);
      toast.success(`File ${filePath} deleted successfully`);
      fetchFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      toast.error('Failed to delete file');
    }
  };

  const handleUploadFiles = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    setUploading(true);
    
    try {
      // Upload the files to the current project
      await projectAPI.uploadFiles(projectId, selectedFiles);
      
      // Refresh the file list
      fetchFiles();
      
      // Show success message if needed
      console.log(`Successfully uploaded ${selectedFiles.length} files`);
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const renderFileTree = (files) => {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No files found in this project.
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => navigate(`/projects/${projectId}/upload`)}
            sx={{ mt: 2 }}
          >
            Upload Files
          </Button>
        </Box>
      );
    }

    return (
      <List component="div" dense>
        {files.map((file) => (
          <ListItem
            key={file.path}
            disablePadding
            secondaryAction={
              <IconButton edge="end" onClick={() => handleDeleteFile(file.path)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemButton>
              <ListItemIcon>
                {file.type === 'directory' ? <FolderIcon color="primary" /> : <FileIcon />}
              </ListItemIcon>
              <ListItemText
                primary={file.name}
                secondary={file.path}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/projects')} sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {project?.name}
          </Typography>
        </Box>
        <Box>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleUploadFiles}
          />
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={vectorizing ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
            onClick={startVectorization}
            disabled={vectorizing}
          >
            {vectorizing ? 'Vectorizing...' : 'Vectorize Code'}
          </Button>
        </Box>
      </Box>

      {project?.description && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="body1">{project.description}</Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Project Files</Typography>
              <IconButton onClick={fetchFiles} disabled={fileLoading}>
                <RefreshIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {fileLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              renderFileTree(files)
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Created: {new Date(project?.createdAt).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last Updated: {new Date(project?.updatedAt).toLocaleDateString()}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Vectorization Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: vectorizationStatus?.status === 'completed' ? 'success.main' : 
                                    vectorizationStatus?.status === 'processing' ? 'warning.main' : 'error.main',
                    mr: 1
                  }}
                />
                <Typography variant="body2">
                  {vectorizationStatus?.status === 'completed' ? 'Completed' : 
                   vectorizationStatus?.status === 'processing' ? 'In Progress' : 
                   vectorizationStatus?.status === 'failed' ? 'Failed' : 'Not Started'}
                </Typography>
              </Box>
              {vectorizationStatus?.status === 'completed' && (
                <Button
                  variant="outlined"
                  startIcon={<AnalyticsIcon />}
                  fullWidth
                  sx={{ mt: 2 }}
                  component={Link}
                  to={`/projects/${projectId}/vectors`}
                >
                  View Vector Data
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => {
                  const newName = prompt('Enter new project name:', project?.name);
                  if (newName && newName !== project?.name) {
                    projectAPI.updateProject(projectId, { name: newName })
                      .then(() => {
                        setProject({ ...project, name: newName });
                        toast.success('Project name updated');
                      })
                      .catch(err => {
                        console.error('Error updating project:', err);
                        toast.error('Failed to update project name');
                      });
                  }
                }}
              >
                Edit Project
              </Button>
              <Button
                variant="outlined"
                startIcon={<CodeIcon />}
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => navigate(`/projects/${projectId}/analyze`)}
              >
                Analyze Code
              </Button>
              
              {vectorizationStatus?.status === 'completed' && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<GraphIcon />}
                    fullWidth
                    sx={{ mb: 1 }}
                    component={Link}
                    to={`/projects/${projectId}/function-graph`}
                  >
                    Function Call Graph
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<TreeIcon />}
                    fullWidth
                    sx={{ mb: 1 }}
                    component={Link}
                    to={`/projects/${projectId}/component-graph`}
                  >
                    Component Relationships
                  </Button>
                </>
              )}
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                fullWidth
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete project "${project?.name}"? This action cannot be undone.`)) {
                    projectAPI.deleteProject(projectId)
                      .then(() => {
                        toast.success('Project deleted successfully');
                        navigate('/projects');
                      })
                      .catch(err => {
                        console.error('Error deleting project:', err);
                        toast.error('Failed to delete project');
                      });
                  }
                }}
              >
                Delete Project
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ProjectWorkspace; 