import React, { useState } from 'react';
import { Button, CircularProgress, Box, Typography, Alert } from '@mui/material';
import { PlayArrow as StartIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { vectorAPI } from '../utils/api';

const VectorizationTrigger = ({ projectId, onVectorizationStart }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startVectorization = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vectorAPI.startVectorization(projectId);
      
      if (response && response.status === 'success') {
        toast.success('Vectorization process started successfully');
        if (onVectorizationStart) {
          onVectorizationStart();
        }
      } else {
        throw new Error(response?.message || 'Failed to start vectorization');
      }
    } catch (err) {
      console.error('Error starting vectorization:', err);
      setError(err.message || 'An error occurred while starting vectorization');
      toast.error(err.message || 'Failed to start vectorization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ my: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Button
        variant="contained"
        color="primary"
        onClick={startVectorization}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <StartIcon />}
        sx={{ mr: 1 }}
      >
        {loading ? 'Starting Vectorization...' : 'Start Vectorization'}
      </Button>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Vectorization prepares your code for semantic search and analysis. This process may take several minutes depending on the size of your codebase.
      </Typography>
    </Box>
  );
};

export default VectorizationTrigger; 