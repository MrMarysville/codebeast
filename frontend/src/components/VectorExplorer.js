import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { FiActivity, FiCode, FiDatabase, FiTrendingUp, FiSearch, FiRefreshCw, FiGitBranch } from 'react-icons/fi';
import VectorizationStatus from './VectorizationStatus';
import VectorizationTrigger from './VectorizationTrigger';
import FunctionList from './FunctionList';
import SimilaritySearch from './SimilaritySearch';
import FunctionGraph from './FunctionGraph';
import ComponentRelationshipGraph from './ComponentRelationshipGraph';
import ChangedFilesVisualization from './ChangedFilesVisualization';
import { useFetch } from '../hooks/useFetch';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';
import '../styles/VectorExplorer.css';
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
  Paper,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Search as SearchIcon,
  Code as CodeIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { projectAPI } from '../utils/api';


// Enhanced component metadata for React 19
export const metadata = {
  componentName: "VectorExplorer",
  description: "Interactive explorer for code vectorization and analysis",
  authors: ["Code Beast Team"],
  version: "2.0.0",
  keywords: ["code analysis", "vector search", "function graph", "visualization"],
  features: [
    "Function relationship visualization",
    "Code similarity search",
    "Language-based clustering",
    "Component relationships",
    "Vectorization status tracking"
  ]
};

// Document metadata for React 19
export function generateMetadata({ projectId }) {
  return {
    title: `Vector Explorer${projectId ? ` - Project ${projectId}` : ''}`,
    description: "Explore code relationships through vector embeddings and visualizations",
    keywords: ["code analysis", "vector embeddings", "graph visualization", "similarity search"],
    openGraph: {
      title: `Code Beast - Vector Explorer${projectId ? ` - Project ${projectId}` : ''}`,
      description: "Interactive code exploration through vector embeddings",
      type: "website"
    }
  };
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const VectorExplorer = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [vectorData, setVectorData] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

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

  const fetchVectorData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getVectorData(projectId);
      setVectorData(response.data);
    } catch (err) {
      console.error('Error fetching vector data:', err);
      toast.error('Failed to load vector data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchLanguages = useCallback(async () => {
    try {
      const response = await projectAPI.getVectorLanguages(projectId);
      setLanguages(response.data);
    } catch (err) {
      console.error('Error fetching languages:', err);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchVectorData();
    fetchLanguages();
  }, [projectId, fetchProject, fetchVectorData, fetchLanguages]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.warning('Please enter a search query');
      return;
    }

    try {
      setSearching(true);
      // This is a mock implementation - in a real app, you would call an API endpoint
      // that performs semantic search using the vector embeddings
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock results - in a real app, these would come from the backend
      const mockResults = [
        {
          id: '1',
          name: 'fetchProject',
          path: 'src/components/ProjectWorkspace.js',
          similarity: 0.92,
          snippet: 'const fetchProject = async () => { try { setLoading(true); const response = await projectAPI.getProjectById(projectId); setProject(response.data); } catch (err) { ... } }'
        },
        {
          id: '2',
          name: 'getProjectById',
          path: 'src/utils/api.js',
          similarity: 0.87,
          snippet: 'getProjectById: (projectId) => api.get(`/api/projects/${projectId}`)'
        },
        {
          id: '3',
          name: 'ProjectDetails',
          path: 'src/components/ProjectDetails.js',
          similarity: 0.78,
          snippet: 'function ProjectDetails({ project }) { return ( <div>...</div> ); }'
        }
      ];
      
      setSearchResults(mockResults);
    } catch (err) {
      console.error('Error searching vectors:', err);
      toast.error('Failed to search vectors');
    } finally {
      setSearching(false);
    }
  };

  if (loading && !vectorData) {
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
          Vector Explorer: {project?.name}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Vector Statistics
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CodeIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Total Functions" 
                  secondary={vectorData?.totalFunctions || 'N/A'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LanguageIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Languages" 
                  secondary={languages?.length > 0 ? languages.join(', ') : 'N/A'} 
                />
              </ListItem>
            </List>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Semantic Search
            </Typography>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Search Query"
                placeholder="Find functions similar to..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                fullWidth
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Search Results
            </Typography>
            {searchResults.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  {searchQuery.trim() ? 'No results found. Try a different query.' : 'Enter a search query to find similar functions.'}
                </Typography>
              </Box>
            ) : (
              <List>
                {searchResults.map((result) => (
                  <ListItem key={result.id} sx={{ 
                    mb: 2, 
                    border: '1px solid', 
                    borderColor: 'divider',
                    borderRadius: 1,
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {result.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Similarity: {(result.similarity * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {result.path}
                    </Typography>
                    <Box sx={{ 
                      backgroundColor: 'background.default',
                      p: 1,
                      borderRadius: 1,
                      width: '100%',
                      overflow: 'auto'
                    }}>
                      <Typography variant="body2" component="pre" sx={{ 
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem'
                      }}>
                        {result.snippet}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

VectorExplorer.propTypes = {
  projectId: PropTypes.string.isRequired,
};

export default VectorExplorer;