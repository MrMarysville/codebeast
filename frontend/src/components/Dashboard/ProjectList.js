import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CardActions, 
  CircularProgress, 
  Container, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid, 
  TextField,
  Typography,
  IconButton
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Upload as UploadIcon, Analytics as AnalyticsIcon } from '@mui/icons-material';
import { projectAPI } from '../../utils/api';
import { formatDate } from '../../utils/systemUtils';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const navigate = useNavigate();

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getAllProjects();
      setProjects(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects. Please try again later.');
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.createProject(newProject);
      setProjects([...projects, response.data]);
      setNewProject({ name: '', description: '' });
      setOpenCreateDialog(false);
      toast.success('Project created successfully');
      
      // Navigate to the new project
      navigate(`/projects/${response.data.id}`);
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      await projectAPI.deleteProject(selectedProject.id);
      setProjects(projects.filter(p => p.id !== selectedProject.id));
      setSelectedProject(null);
      setOpenDeleteDialog(false);
      toast.success('Project deleted successfully');
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (project) => {
    setSelectedProject(project);
    setOpenDeleteDialog(true);
  };

  if (loading && projects.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Projects
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
        >
          Create Project
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {projects.length === 0 && !loading ? (
        <Card sx={{ minWidth: 275, mb: 2, textAlign: 'center', p: 4 }}>
          <CardContent>
            <Typography variant="h6" component="div" gutterBottom>
              No projects found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first project to get started
            </Typography>
          </CardContent>
          <CardActions sx={{ justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
            >
              Create Project
            </Button>
          </CardActions>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="div" gutterBottom>
                    {project.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {project.description || 'No description provided'}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    Created: {formatDate(project.createdAt)}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    Last Updated: {formatDate(project.updatedAt)}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    component={Link} 
                    to={`/projects/${project.id}`}
                  >
                    View
                  </Button>
                  <IconButton 
                    size="small" 
                    component={Link} 
                    to={`/projects/${project.id}/upload`}
                    color="primary"
                    title="Upload Files"
                  >
                    <UploadIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    component={Link} 
                    to={`/projects/${project.id}/vectors`}
                    color="secondary"
                    title="View Vectors"
                  >
                    <AnalyticsIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => confirmDelete(project)}
                    title="Delete Project"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Project Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the details for your new project.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            sx={{ mb: 2, mt: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained" 
            color="primary"
            disabled={!newProject.name.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the project "{selectedProject?.name}"? 
            This action cannot be undone and all associated files will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteProject} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectList; 