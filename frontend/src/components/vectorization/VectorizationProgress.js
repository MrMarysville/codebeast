import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  LinearProgress, 
  Paper, 
  Chip, 
  Button, 
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Alert,
  Collapse,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VectorizationService from '../../services/VectorizationService';

/**
 * Time formatter to convert milliseconds to human-readable format
 * @param {number} ms - Milliseconds to format
 * @returns {string} - Formatted time string
 */
const formatTime = (ms) => {
  if (!ms) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Component for displaying vectorization job progress
 */
const VectorizationProgress = ({ 
  jobId, 
  onStatusChange,
  onComplete,
  onError,
  autoRefresh = true,
  showCancelButton = true,
  refreshInterval = 2000,
  detailed = false
}) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  
  /**
   * Fetch the current job status
   */
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await VectorizationService.getJobStatus(jobId);
      
      if (response.success) {
        setStatus(response);
        setError(null);
        
        // Call the status change callback if provided
        if (onStatusChange) {
          onStatusChange(response);
        }
        
        // If completed, call the completion callback
        if (response.status === 'completed' && onComplete) {
          onComplete(response);
        }
        
        // If failed and no retry is scheduled, call the error callback
        if (response.status === 'failed' && !response.retryInfo && onError) {
          onError(new Error(response.error || 'Vectorization failed'));
        }
      } else {
        setError(response.message || 'Failed to fetch job status');
        if (onError) onError(new Error(response.message));
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching status');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Set up polling for job status
   */
  useEffect(() => {
    // Initial fetch
    fetchStatus();
    
    // Set up polling if auto-refresh is enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStatus();
      }, refreshInterval);
    }
    
    // Clean up
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId, autoRefresh, refreshInterval]);
  
  /**
   * Handle manual refresh
   */
  const handleRefresh = () => {
    fetchStatus();
  };
  
  /**
   * Handle job cancellation
   */
  const handleCancel = async () => {
    try {
      setLoading(true);
      const response = await VectorizationService.cancelJob(jobId);
      
      if (response.success) {
        // Refresh status to reflect cancellation
        fetchStatus();
      } else {
        setError(response.message || 'Failed to cancel job');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while cancelling');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Toggle expanded details view
   */
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  /**
   * Get status chip color based on job status
   */
  const getStatusChipProps = () => {
    const statusMap = {
      created: { color: 'default', icon: <ScheduleIcon /> },
      counting_files: { color: 'info', icon: <ScheduleIcon /> },
      preparing: { color: 'info', icon: <ScheduleIcon /> },
      vectorizing: { color: 'primary', icon: <ScheduleIcon /> },
      completed: { color: 'success', icon: <CheckCircleIcon /> },
      failed: { color: 'error', icon: <WarningIcon /> },
      cancelled: { color: 'warning', icon: <CancelIcon /> },
      retry_scheduled: { color: 'warning', icon: <RestartAltIcon /> },
      retrying: { color: 'info', icon: <RestartAltIcon /> }
    };
    
    return statusMap[status?.status] || { color: 'default', icon: null };
  };
  
  /**
   * Render retry information if available
   */
  const renderRetryInfo = () => {
    if (!status?.retryInfo) return null;
    
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          Retry attempt {status.retryInfo.retryCount} of {status.retryInfo.maxRetries}
        </Typography>
        {status.retryInfo.lastError && (
          <Typography variant="caption" display="block">
            Previous error: {status.retryInfo.lastError}
          </Typography>
        )}
        {status.retryInfo.active && (
          <Typography variant="caption">
            Next retry in progress...
          </Typography>
        )}
      </Alert>
    );
  };
  
  if (!status && loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Loading vectorization status...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }
  
  if (error && !status) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
        <Button size="small" onClick={handleRefresh} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Alert>
    );
  }
  
  if (!status) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        No status information available for job ID: {jobId}
        <Button size="small" onClick={handleRefresh} startIcon={<RefreshIcon />}>
          Refresh
        </Button>
      </Alert>
    );
  }
  
  const { statusColor, icon } = getStatusChipProps();
  const isActive = ['vectorizing', 'preparing', 'counting_files', 'retrying'].includes(status.status);
  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';
  const isCancelled = status.status === 'cancelled';
  const isRetrying = status.status === 'retrying' || status.status === 'retry_scheduled';
  
  return (
    <Card variant="outlined" sx={{ width: '100%', mt: 2 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <Typography variant="h6" gutterBottom>
              Vectorization Job: {jobId.substring(0, 8)}...
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Chip 
                label={status.status.toUpperCase()} 
                color={statusColor} 
                icon={icon}
                size="small" 
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Started {new Date(status.startTime).toLocaleString()}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="body2">
              Elapsed: {formatTime(status.elapsedTimeMs)}
            </Typography>
            {detailed && (
              <Typography variant="caption" display="block" color="text.secondary">
                Last updated: {new Date(status.lastUpdated).toLocaleTimeString()}
              </Typography>
            )}
          </Grid>
        </Grid>
        
        {isActive && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {status.filesProcessed} / {status.filesTotal} files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {status.progress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={status.progress} 
              sx={{ height: 8, borderRadius: 2 }}
            />
          </Box>
        )}
        
        {isCompleted && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Vectorization completed successfully! Processed {status.filesProcessed} files.
          </Alert>
        )}
        
        {isFailed && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {status.error || 'Vectorization failed'}
          </Alert>
        )}
        
        {isCancelled && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Vectorization was cancelled
          </Alert>
        )}
        
        {isRetrying && renderRetryInfo()}
        
        {detailed && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button
                size="small"
                endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={toggleExpanded}
              >
                {expanded ? 'Less Details' : 'More Details'}
              </Button>
            </Box>
            
            <Collapse in={expanded}>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Job Details
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Job ID</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="caption">{jobId}</Typography>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="caption">{status.status}</Typography>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Files</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="caption">
                      {status.filesProcessed} processed / {status.filesTotal} total
                    </Typography>
                  </Grid>
                  
                  {status.result && (
                    <>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Vectors Created</Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="caption">
                          {status.result.vectors_created || 'N/A'}
                        </Typography>
                      </Grid>
                      
                      {status.result.languages_detected && (
                        <>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Languages</Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {status.result.languages_detected.map(lang => (
                                <Chip key={lang} label={lang} size="small" variant="outlined" />
                              ))}
                            </Box>
                          </Grid>
                        </>
                      )}
                    </>
                  )}
                  
                  {status.error && (
                    <>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Error</Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="caption" color="error">
                          {status.error}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>
      
      <Divider />
      
      <CardActions>
        <Button 
          size="small" 
          startIcon={<RefreshIcon />} 
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
        
        {isActive && showCancelButton && (
          <Button 
            size="small" 
            color="error" 
            startIcon={<CancelIcon />} 
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

VectorizationProgress.propTypes = {
  jobId: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func,
  onComplete: PropTypes.func,
  onError: PropTypes.func,
  autoRefresh: PropTypes.bool,
  showCancelButton: PropTypes.bool,
  refreshInterval: PropTypes.number,
  detailed: PropTypes.bool
};

export default VectorizationProgress; 