import React from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, Card, CardContent, Typography, IconButton, Tooltip } from '@mui/material';
import { FiTrash2, FiEdit, FiFolder, FiClock, FiFile } from 'react-icons/fi';
import '../styles/ProjectList.css';

export const metadata = {
  componentName: "ProjectList",
  description: "Displays a list or grid of projects with their details",
};

const ProjectList = ({ projects, onDelete, onSelect, viewMode = 'grid' }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderGridView = () => (
    <Grid container spacing={3}>
      {projects.map((project) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
          <Card 
            className="project-card"
            onClick={() => onSelect(project.id)}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h6" component="h3" className="project-title">
                  {project.name}
                </Typography>
                <Box>
                  <Tooltip title="Edit">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(project.id);
                      }}
                    >
                      <FiEdit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(project.id);
                      }}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              <Typography variant="body2" color="textSecondary" className="project-description">
                {project.description || 'No description provided'}
              </Typography>
              
              <Box display="flex" alignItems="center" mt={2} className="project-meta">
                <FiFolder className="meta-icon" />
                <Typography variant="body2" className="meta-text">
                  {project.file_count || 0} files
                </Typography>
                
                <FiClock className="meta-icon" style={{ marginLeft: '12px' }} />
                <Typography variant="body2" className="meta-text">
                  Updated {formatDate(project.updated_at)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderListView = () => (
    <Box>
      {projects.map((project) => (
        <Card 
          key={project.id}
          className="project-list-item"
          onClick={() => onSelect(project.id)}
        >
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box flex={1}>
                <Typography variant="h6" component="h3">
                  {project.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {project.description || 'No description provided'}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" className="project-meta">
                <Box display="flex" alignItems="center" mr={3}>
                  <FiFile className="meta-icon" />
                  <Typography variant="body2" className="meta-text">
                    {project.file_count || 0} files
                  </Typography>
                </Box>
                
                <Box display="flex" alignItems="center" mr={3}>
                  <FiClock className="meta-icon" />
                  <Typography variant="body2" className="meta-text">
                    Updated {formatDate(project.updated_at)}
                  </Typography>
                </Box>
                
                <Box>
                  <Tooltip title="Edit">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(project.id);
                      }}
                    >
                      <FiEdit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(project.id);
                      }}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  return (
    <Box className="project-list">
      {projects.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="textSecondary">
            No projects found. Create a new project to get started.
          </Typography>
        </Box>
      ) : (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}
    </Box>
  );
};

ProjectList.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    file_count: PropTypes.number,
    updated_at: PropTypes.string.isRequired,
  })).isRequired,
  onDelete: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  viewMode: PropTypes.oneOf(['grid', 'list']),
};

export default ProjectList; 