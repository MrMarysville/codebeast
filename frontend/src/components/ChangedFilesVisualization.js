import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import { 
  InsertDriveFile as FileIcon,
  Add as AddedIcon,
  Remove as RemovedIcon,
  Edit as ModifiedIcon,
  FileCopy as CopiedIcon,
  FolderOpen as FolderIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { projectAPI } from '../utils/api';

// Status icon mapping
const getStatusIcon = (status) => {
  switch (status.toLowerCase()) {
    case 'added':
      return <AddedIcon color="success" />;
    case 'removed':
      return <RemovedIcon color="error" />;
    case 'modified':
      return <ModifiedIcon color="warning" />;
    case 'renamed':
      return <CopiedIcon color="info" />;
    default:
      return <FileIcon />;
  }
};

// Status color mapping
const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'added':
      return 'success';
    case 'removed':
      return 'error';
    case 'modified':
      return 'warning';
    case 'renamed':
      return 'info';
    default:
      return 'default';
  }
};

// Helper function to generate mock file changes data
const generateMockChanges = (startDate, endDate) => {
  const statuses = ['added', 'modified', 'deleted', 'renamed'];
  const fileTypes = ['.js', '.jsx', '.css', '.html', '.json', '.md'];
  const fileNames = [
    'App', 'Header', 'Footer', 'Sidebar', 'Dashboard', 'Login', 
    'Register', 'Profile', 'Settings', 'Home', 'About', 'Contact',
    'utils', 'helpers', 'constants', 'types', 'hooks', 'context'
  ];
  
  const numChanges = Math.floor(Math.random() * 20) + 5; // 5-25 changes
  const changes = [];
  
  for (let i = 0; i < numChanges; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
    const fileName = fileNames[Math.floor(Math.random() * fileNames.length)];
    
    // Generate a random date between startDate and endDate
    const changeDate = new Date(
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    );
    
    changes.push({
      id: `change-${i}`,
      file: `src/${fileName}${fileType}`,
      status,
      date: changeDate.toISOString(),
      author: 'User',
      linesAdded: status !== 'deleted' ? Math.floor(Math.random() * 100) : 0,
      linesRemoved: status !== 'added' ? Math.floor(Math.random() * 50) : 0
    });
  }
  
  return changes;
};

const ChangedFilesVisualization = ({ projectId }) => {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('week');
  const [filteredChanges, setFilteredChanges] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  
  const fetchChanges = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on selected time range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7); // Default to week
      }
      
      // Mock API call - in a real app, this would fetch from the backend
      // const response = await projectAPI.getFileChanges(projectId, startDate, endDate);
      
      // For demo purposes, generate mock data
      const mockChanges = generateMockChanges(startDate, endDate);
      setChanges(mockChanges);
    } catch (err) {
      console.error('Error fetching file changes:', err);
      setError('Failed to load file changes');
    } finally {
      setLoading(false);
    }
  }, [projectId, timeRange]);

  const filterChanges = useCallback(() => {
    if (!changes.length) return;
    
    let filtered = [...changes];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(file => file.status === statusFilter);
    }
    
    setFilteredChanges(filtered);
  }, [changes, statusFilter]);
  
  useEffect(() => {
    if (projectId) {
      fetchChanges();
    }
  }, [projectId, fetchChanges]);
  
  useEffect(() => {
    filterChanges();
  }, [filterChanges]);
  
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };
  
  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };
  
  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        File Changes
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth>
              <InputLabel id="time-range-label">Time Range</InputLabel>
              <Select
                labelId="time-range-label"
                value={timeRange}
                onChange={handleTimeRangeChange}
                label="Time Range"
              >
                <MenuItem value="day">Last 24 Hours</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
              >
                <MenuItem value="all">All Changes</MenuItem>
                <MenuItem value="added">Added</MenuItem>
                <MenuItem value="removed">Removed</MenuItem>
                <MenuItem value="modified">Modified</MenuItem>
                <MenuItem value="renamed">Renamed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : filteredChanges.length > 0 ? (
          <List sx={{ overflow: 'auto', flexGrow: 1 }}>
            {filteredChanges.map((change, index) => (
              <React.Fragment key={`${change.file_path}-${index}`}>
                <ListItem 
                  button 
                  onClick={() => handleFileSelect(change)}
                  selected={selectedFile && selectedFile.file_path === change.file_path}
                >
                  <ListItemIcon>
                    {getStatusIcon(change.status)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={change.file_path.split('/').pop()} 
                    secondary={
                      <React.Fragment>
                        <Typography variant="body2" component="span" color="text.primary">
                          {change.file_path}
                        </Typography>
                        <br />
                        <Typography variant="body2" component="span" color="text.secondary">
                          {change.author} - {new Date(change.timestamp).toLocaleString()}
                        </Typography>
                      </React.Fragment>
                    }
                  />
                  <Tooltip title={`${change.status}: ${change.lines_added} added, ${change.lines_removed} removed`}>
                    <Chip 
                      label={change.status} 
                      color={getStatusColor(change.status)} 
                      variant="outlined"
                      size="small"
                    />
                  </Tooltip>
                </ListItem>
                {index < filteredChanges.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No file changes found for the selected time range and status filter.
            </Typography>
          </Box>
        )}
      </Box>
      
      {selectedFile && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
          <Typography variant="subtitle2" gutterBottom>
            Change Details
          </Typography>
          <Typography variant="body2">
            <strong>File:</strong> {selectedFile.file_path}
          </Typography>
          <Typography variant="body2">
            <strong>Status:</strong> {selectedFile.status}
          </Typography>
          <Typography variant="body2">
            <strong>Lines Added:</strong> {selectedFile.lines_added}
          </Typography>
          <Typography variant="body2">
            <strong>Lines Removed:</strong> {selectedFile.lines_removed}
          </Typography>
          <Typography variant="body2">
            <strong>Author:</strong> {selectedFile.author}
          </Typography>
          <Typography variant="body2">
            <strong>Date:</strong> {new Date(selectedFile.timestamp).toLocaleString()}
          </Typography>
          {selectedFile.message && (
            <Typography variant="body2">
              <strong>Message:</strong> {selectedFile.message}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ChangedFilesVisualization; 