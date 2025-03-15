import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  Divider,
  FormHelperText,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MemoryIcon from '@mui/icons-material/Memory';
import VectorizationProgress from '../components/vectorization/VectorizationProgress';
import VectorizationService from '../services/VectorizationService';

const languageOptions = [
  { value: 'js', label: 'JavaScript' },
  { value: 'jsx', label: 'JSX' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'tsx', label: 'TSX' },
  { value: 'py', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'cs', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rb', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'md', label: 'Markdown' }
];

/**
 * Project Vectorization Page Component
 * 
 * Demonstrates the enhanced vectorization capabilities
 */
const ProjectVectorization = () => {
  const [projectPath, setProjectPath] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [vectorizationMethod, setVectorizationMethod] = useState('enhanced');
  const [memoryOptimized, setMemoryOptimized] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);
  const [jobId, setJobId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [completedJobs, setCompletedJobs] = useState([]);

  /**
   * Handle starting a new vectorization job
   */
  const handleStartVectorization = async () => {
    if (!projectPath) {
      setError('Project path is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Prepare options for vectorization
      const options = {
        projectPath: projectPath.trim(),
        vectorizationMethod,
        memoryOptimized,
        maxRetries: parseInt(maxRetries, 10)
      };

      // Add file types if selected
      if (selectedLanguages.length > 0) {
        options.fileTypes = selectedLanguages;
      }

      // Start vectorization
      const response = await VectorizationService.startVectorization(options);

      if (response.success) {
        setJobId(response.jobId);
        setSuccess(`Vectorization job started successfully! Job ID: ${response.jobId}`);
      } else {
        setError(response.message || 'Failed to start vectorization');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while starting vectorization');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle job completion
   */
  const handleJobComplete = (status) => {
    // Add to completed jobs list
    setCompletedJobs(prev => [
      {
        jobId: status.jobId,
        completedAt: new Date(),
        filesProcessed: status.filesProcessed,
        status: 'completed'
      },
      ...prev
    ]);

    // Show success message
    setSuccess(`Vectorization job ${status.jobId} completed successfully!`);
  };

  /**
   * Handle job error
   */
  const handleJobError = (err, status) => {
    // Add to completed jobs list
    if (status) {
      setCompletedJobs(prev => [
        {
          jobId: status.jobId,
          completedAt: new Date(),
          filesProcessed: status.filesProcessed,
          status: 'failed',
          error: err.message
        },
        ...prev
      ]);
    }
  };

  /**
   * Handle language selection change
   */
  const handleLanguageChange = (event) => {
    setSelectedLanguages(event.target.value);
  };

  /**
   * Vectorization form component
   */
  const VectorizationForm = () => (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Start New Vectorization
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Vectorize a project directory to enable code search, analysis, and visualization features.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Project Path"
            placeholder="Enter the full path to your project directory"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            variant="outlined"
            required
            helperText="Example: C:/Users/username/projects/my-project"
            InputProps={{
              startAdornment: <FolderOpenIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="vectorization-method-label">Vectorization Method</InputLabel>
            <Select
              labelId="vectorization-method-label"
              value={vectorizationMethod}
              label="Vectorization Method"
              onChange={(e) => setVectorizationMethod(e.target.value)}
            >
              <MenuItem value="simple">Simple (Faster but less accurate)</MenuItem>
              <MenuItem value="enhanced">Enhanced (Balanced)</MenuItem>
              <MenuItem value="incremental">Incremental (Best for large codebases)</MenuItem>
            </Select>
            <FormHelperText>
              Choose a method based on your project size and needs
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="max-retries-label">Maximum Retries</InputLabel>
            <Select
              labelId="max-retries-label"
              value={maxRetries}
              label="Maximum Retries"
              onChange={(e) => setMaxRetries(e.target.value)}
            >
              <MenuItem value={0}>No retries</MenuItem>
              <MenuItem value={1}>1 retry</MenuItem>
              <MenuItem value={2}>2 retries</MenuItem>
              <MenuItem value={3}>3 retries (Recommended)</MenuItem>
              <MenuItem value={5}>5 retries</MenuItem>
            </Select>
            <FormHelperText>
              How many times to retry if vectorization fails
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="language-label">File Types to Include</InputLabel>
            <Select
              labelId="language-label"
              multiple
              value={selectedLanguages}
              onChange={handleLanguageChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip 
                      key={value} 
                      label={languageOptions.find(lang => lang.value === value)?.label || value} 
                      size="small"
                    />
                  ))}
                </Box>
              )}
            >
              {languageOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Leave empty to include all file types
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              Memory Optimization:
            </Typography>
            <Button
              variant={memoryOptimized ? "contained" : "outlined"}
              color={memoryOptimized ? "primary" : "inherit"}
              size="small"
              onClick={() => setMemoryOptimized(true)}
              startIcon={<MemoryIcon />}
              sx={{ mr: 1 }}
            >
              Enabled
            </Button>
            <Button
              variant={!memoryOptimized ? "contained" : "outlined"}
              color={!memoryOptimized ? "primary" : "inherit"}
              size="small"
              onClick={() => setMemoryOptimized(false)}
            >
              Disabled
            </Button>
          </Box>
          <FormHelperText>
            Enable for large codebases to reduce memory usage (recommended)
          </FormHelperText>
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleStartVectorization}
            disabled={loading || !projectPath}
            startIcon={<PlayArrowIcon />}
            fullWidth
          >
            {loading ? 'Starting...' : 'Start Vectorization'}
          </Button>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && !jobId && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Paper>
  );

  /**
   * Render completed jobs list
   */
  const renderCompletedJobs = () => {
    if (completedJobs.length === 0) {
      return null;
    }

    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Recently Completed Jobs
        </Typography>
        <Grid container spacing={2}>
          {completedJobs.map((job, index) => (
            <Grid item xs={12} key={job.jobId || index}>
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={1}>
                    <Grid item xs={8}>
                      <Typography variant="subtitle2" gutterBottom>
                        Job: {job.jobId?.substring(0, 8)}...
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {job.status === 'completed' ? 
                          `Processed ${job.filesProcessed} files` : 
                          `Failed: ${job.error || 'Unknown error'}`}
                      </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Chip 
                        label={job.status.toUpperCase()} 
                        color={job.status === 'completed' ? 'success' : 'error'} 
                        size="small"
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {job.completedAt.toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Project Vectorization
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        The enhanced vectorization system processes your code into vector representations
        for efficient search, analysis, and visualization. Large codebases are automatically
        processed in batches to optimize memory usage.
      </Typography>

      <Box sx={{ my: 4 }}>
        <VectorizationForm />

        {jobId && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Current Job Status
            </Typography>
            <VectorizationProgress 
              jobId={jobId}
              onComplete={handleJobComplete}
              onError={handleJobError}
              detailed={true}
            />
          </Box>
        )}

        {renderCompletedJobs()}
      </Box>
    </Container>
  );
};

export default ProjectVectorization; 