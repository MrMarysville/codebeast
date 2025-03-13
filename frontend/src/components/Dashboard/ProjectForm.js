import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography,
  CircularProgress
} from '@mui/material';


// Component metadata for React 19
export const metadata = {
  componentName: "ProjectForm",
  description: "ProjectForm component",
};

const ProjectForm = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit({ name, description });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Create New Project
      </Typography>

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
          error={!!error}
          helperText={error}
          disabled={loading}
          required
        />

        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          multiline
          rows={3}
          disabled={loading}
        />

        <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default ProjectForm; 