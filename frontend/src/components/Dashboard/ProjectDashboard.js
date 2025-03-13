import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { supabase } from '../../utils/supabaseClient';
import ProjectList from './ProjectList';
import ProjectForm from './ProjectForm';
import ErrorBoundary from '../ErrorBoundary';
import '../../styles/Dashboard.css';

// Import icons (assuming react-icons is installed, otherwise we'll need to add it)
import { FiSearch, FiGrid, FiList, FiCode, FiCalendar, FiFile, FiPlus } from 'react-icons/fi';


// Component metadata for React 19
export const metadata = {
  componentName: "ProjectDashboard",
  description: "ProjectDashboard component",
};

function ProjectDashboard() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const [showUploader, setShowUploader] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [connectionMode, setConnectionMode] = useState('online'); // 'online' or 'local'
  const { session } = useAuth();
  const { updateFileTypes } = useProject();
  const navigate = useNavigate();
  
  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple connection check
        const startTime = Date.now();
        const { data, error } = await supabase.from('projects').select('count').limit(1);
        const responseTime = Date.now() - startTime;
        
        if (error && error.message && (error.message.includes('Failed to fetch') || responseTime > 5000)) {
          console.warn('Switching to local mode due to connection issues');
          setConnectionMode('local');
        } else {
          setConnectionMode('online');
        }
      } catch (err) {
        console.warn('Supabase connection check failed:', err);
        setConnectionMode('local');
      }
    };
    
    checkConnection();
  }, []);
  
  // Fetch projects with retry logic
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error: supabaseError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setProjects(data || []);
      setFilteredProjects(data || []);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);

      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchProjects();
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  }, [session, retryCount]);

  useEffect(() => {
    fetchProjects();

    // Cleanup function
    return () => {
      setProjects([]);
      setLoading(false);
      setError(null);
    };
  }, [fetchProjects]);
  
  // Handle search and filtering
  useEffect(() => {
    if (projects.length === 0) return;
    
    const filtered = projects.filter(project => {
      // Filter by search query
      if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !project.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
    
    // Apply sorting
    const sortedProjects = [...filtered].sort((a, b) => {
      const dateA = new Date(a[sortBy] || a.created_at);
      const dateB = new Date(b[sortBy] || b.created_at);
      
      if (sortDirection === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
    
    setFilteredProjects(sortedProjects);
  }, [projects, searchQuery, sortBy, sortDirection]);
  
  // Handle project creation
  const handleCreateProject = async (projectData) => {
    try {
      setError(null);
      
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error: createError } = await supabase
        .from('projects')
        .insert([
          {
            ...projectData,
            user_id: session.user.id,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }

      setProjects(prev => [data, ...prev]);
      setFilteredProjects(prev => [data, ...prev]);
      setShowForm(false);
      updateFileTypes({}); // Reset file types for new project
      return data;
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message);
      throw err;
    }
  };
  
  // Handle project deletion
  const handleDeleteProject = async (projectId) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      setFilteredProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err.message);
      throw err;
    }
  };
  
  // Toggle sort direction
  const toggleSort = (field) => {
    if (sortBy === field) {
      // Toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortBy(field);
      setSortDirection('desc');
    }
  };
  
  // Get days since project creation/update
  const getDaysSince = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Format date relative to now
  const formatDate = (dateString) => {
    const days = getDaysSince(dateString);
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return new Date(dateString).toLocaleDateString();
  };

  // Render project status badges
  const renderStatusBadge = (project) => {
    const daysSinceUpdate = getDaysSince(project.updated_at || project.created_at);
    
    if (project.id.startsWith('local-')) {
      return <span className="status-badge offline">Offline</span>;
    } else if (daysSinceUpdate < 2) {
      return <span className="status-badge recent">Recent</span>;
    } else if (project.file_count > 50) {
      return <span className="status-badge large">Large</span>;
    }
    
    return null;
  };
  
  // Render project card based on view mode
  const renderProjectCard = (project) => {
    if (viewMode === 'grid') {
      return (
        <div 
          key={project.id} 
          className="project-card"
          onClick={() => navigate(`/project/${project.id}`)}
        >
          <div className="project-card-header">
            <div className="project-icon">
              <FiCode />
            </div>
            <h3>{project.name}</h3>
            {renderStatusBadge(project)}
          </div>
          
          <p className="project-description">{project.description}</p>
          
          <div className="project-stats">
            <div className="stat">
              <FiFile className="stat-icon" />
              <span>{project.file_count || 0} files</span>
            </div>
            <div className="stat">
              <FiCalendar className="stat-icon" />
              <span>{formatDate(project.updated_at || project.created_at)}</span>
            </div>
          </div>
          
          <div className="project-actions">
            <button 
              className="open-project-btn"
              onClick={(e) => { e.stopPropagation(); setDeleteConfirmation(project); }}
            >
              Open
            </button>
            <button 
              className="delete-project-btn"
              onClick={(e) => { e.stopPropagation(); setDeleteConfirmation(project); }}
              aria-label="Delete project"
            >
              Delete
            </button>
          </div>
        </div>
      );
    } else {
      // List view
      return (
        <div 
          key={project.id} 
          className="project-list-item"
          onClick={() => navigate(`/project/${project.id}`)}
        >
          <div className="project-list-icon">
            <FiCode />
          </div>
          <div className="project-list-content">
            <div className="project-list-name">
              <h3>{project.name}</h3>
              {renderStatusBadge(project)}
            </div>
            <p className="project-list-description">{project.description}</p>
          </div>
          <div className="project-list-stats">
            <div className="stat">
              <FiFile className="stat-icon" />
              <span>{project.file_count || 0}</span>
            </div>
          </div>
          <div className="project-list-date">
            {formatDate(project.updated_at || project.created_at)}
          </div>
          <div className="project-list-actions">
            <button 
              className="delete-project-btn"
              onClick={(e) => { e.stopPropagation(); setDeleteConfirmation(project); }}
              aria-label="Delete project"
            >
              <span className="delete-icon">&times;</span>
            </button>
          </div>
        </div>
      );
    }
  };
  
  // Render loading state with skeleton cards
  if (loading && projects.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <ErrorBoundary>
      <Box className="dashboard-container">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1">
            Your Projects
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowForm(true)}
          >
            Create New Project
          </Button>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {showForm && (
          <ProjectForm
            onSubmit={handleCreateProject}
            onCancel={() => setShowForm(false)}
          />
        )}

        <div className="dashboard-toolbar">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="toolbar-actions">
            <div className="sort-options">
              <label>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="updated_at">Last Updated</option>
                <option value="created_at">Date Created</option>
                <option value="name">Name</option>
                <option value="file_count">File Count</option>
              </select>
              <button 
                className={`sort-direction-btn ${sortDirection === 'desc' ? 'desc' : 'asc'}`}
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            <div className="view-toggles">
              <button 
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <FiGrid />
              </button>
              <button 
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <FiList />
              </button>
            </div>
          </div>
        </div>
        
        <ProjectList
          projects={filteredProjects}
          onDelete={handleDeleteProject}
          onSelect={(projectId) => navigate(`/project/${projectId}`)}
        />
      </Box>
    </ErrorBoundary>
  );
}

export default ProjectDashboard;