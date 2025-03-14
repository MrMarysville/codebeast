import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  LinearProgress,
  Paper,
  Typography
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Analytics as AnalyticsIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { projectAPI } from '../utils/api';

const VectorizationStatus = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [pollingInterval, setPollingInterval] = useState(null);

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

  const fetchStatus = useCallback(async () => {
    try {
      const response = await projectAPI.getVectorizationStatus(projectId);
      setStatus(response.data);
      
      // Calculate progress if available
      if (response.data.progress) {
        setProgress(response.data.progress);
      }
      
      // If vectorization is complete or failed, stop polling
      if (response.data.status === 'completed' || response.data.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (err) {
      console.error('Error fetching vectorization status:', err);
      toast.error('Failed to fetch vectorization status');
    }
  }, [projectId, pollingInterval]);

  useEffect(() => {
    fetchProject();
    fetchStatus();
    
    // Set up polling for status updates
    const interval = setInterval(fetchStatus, 5000);
    setPollingInterval(interval);
    
    // Clean up on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [projectId, fetchProject, fetchStatus, pollingInterval]);

  const startVectorization = async () => {
    try {
      setLoading(true);
      await projectAPI.startVectorization(projectId);
      toast.info('Vectorization started. This may take a few minutes.');
      
      // Fetch status immediately after starting
      await fetchStatus();
      
      // Start polling if not already polling
      if (!pollingInterval) {
        const interval = setInterval(fetchStatus, 5000);
        setPollingInterval(interval);
      }
    } catch (err) {
      console.error('Error starting vectorization:', err);
      toast.error('Failed to start vectorization');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!status) return 'grey';
    
    switch (status.status) {
      case 'completed':
        return 'success.main';
      case 'processing':
        return 'warning.main';
      case 'failed':
        return 'error.main';
      default:
        return 'grey';
    }
  };

  const getStatusIcon = () => {
    if (!status) return <CircularProgress size={24} />;
    
    switch (status.status) {
      case 'completed':
        return <CheckIcon color="success" fontSize="large" />;
      case 'processing':
        return <CircularProgress size={24} />;
      case 'failed':
        return <ErrorIcon color="error" fontSize="large" />;
      default:
        return <CircularProgress size={24} />;
    }
  };

  if (loading && !status) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(`/projects/${projectId}`)}
          sx={{ mr: 2 }}
        >
          Back to Project
        </Button>
        <Typography variant="h4" component="h1">
          Vectorization Status: {project?.name}
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Status</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchStatus}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ mr: 2 }}>
            {getStatusIcon()}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              {status?.status === 'completed' ? 'Vectorization Complete' : 
               status?.status === 'processing' ? 'Vectorization in Progress' : 
               status?.status === 'failed' ? 'Vectorization Failed' : 
               'Not Started'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {status?.message || 'No status message available'}
            </Typography>
            
            {status?.status === 'processing' && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant={progress > 0 ? "determinate" : "indeterminate"} 
                  value={progress} 
                />
                {progress > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                    {Math.round(progress)}% Complete
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Last Updated: {status?.timestamp ? new Date(status.timestamp).toLocaleString() : 'N/A'}
            </Typography>
            {status?.startTime && (
              <Typography variant="body2" color="text.secondary">
                Started: {new Date(status.startTime).toLocaleString()}
              </Typography>
            )}
            {status?.endTime && (
              <Typography variant="body2" color="text.secondary">
                Completed: {new Date(status.endTime).toLocaleString()}
              </Typography>
            )}
          </Box>
          
          <Box>
            {status?.status === 'completed' ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AnalyticsIcon />}
                onClick={() => navigate(`/projects/${projectId}/vectors`)}
              >
                View Vector Data
              </Button>
            ) : status?.status === 'failed' || !status?.status ? (
              <Button
                variant="contained"
                color="primary"
                onClick={startVectorization}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Start Vectorization'}
              </Button>
            ) : null}
          </Box>
        </Box>
      </Paper>

      {status?.details && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Vectorization Details
          </Typography>
          <Typography variant="body2" component="pre" sx={{ 
            whiteSpace: 'pre-wrap',
            backgroundColor: '#f5f5f5',
            p: 2,
            borderRadius: 1,
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {typeof status.details === 'string' ? status.details : JSON.stringify(status.details, null, 2)}
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default VectorizationStatus;