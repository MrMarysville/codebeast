import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Chip
} from '@mui/material';
import { 
  Search as SearchIcon,
  Code as CodeIcon,
  FormatQuote as QuoteIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { vectorAPI } from '../utils/api';
import '../styles/SimilaritySearch.css';

const SimilaritySearch = ({ projectId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('text');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [threshold, setThreshold] = useState(0.7);
  const [maxResults, setMaxResults] = useState(10);
  
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast.warn('Please enter a search query');
      return;
    }
    
    try {
      setLoading(true);
      setResults([]);
      
      let response;
      if (searchType === 'text') {
        response = await vectorAPI.searchSimilarCode(projectId, {
          query: searchQuery,
          threshold,
          limit: maxResults
        });
      } else if (searchType === 'code') {
        response = await vectorAPI.searchSimilarCodeByCode(projectId, {
          code: searchQuery,
          threshold,
          limit: maxResults
        });
      } else if (searchType === 'function') {
        response = await vectorAPI.searchSimilarCodeByFunction(projectId, {
          function_id: searchQuery,
          threshold,
          limit: maxResults
        });
      }
      
      if (response && Array.isArray(response.results)) {
        setResults(response.results);
        if (response.results.length === 0) {
          toast.info('No similar code found');
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error performing similarity search');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Similarity Search
      </Typography>
      
      <Box component="form" onSubmit={handleSearchSubmit} sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth sx={{ mb: 2 }}>
              <InputLabel id="search-type-label">Search Type</InputLabel>
              <Select
                labelId="search-type-label"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                label="Search Type"
              >
                <MenuItem value="text">Text Query</MenuItem>
                <MenuItem value="code">Code Snippet</MenuItem>
                <MenuItem value="function">Function ID</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label={searchType === 'text' ? 'Search Query' : searchType === 'code' ? 'Code Snippet' : 'Function ID'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              multiline={searchType === 'code'}
              rows={searchType === 'code' ? 4 : 1}
              placeholder={
                searchType === 'text' 
                  ? 'E.g., "Function to parse JSON data"' 
                  : searchType === 'code'
                  ? 'Paste code snippet here...'
                  : 'Enter function ID'
              }
              sx={{ mb: 2 }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography id="threshold-slider-label" gutterBottom>
              Similarity Threshold: {threshold}
            </Typography>
            <Slider
              value={threshold}
              onChange={(e, newValue) => setThreshold(newValue)}
              min={0.1}
              max={1.0}
              step={0.05}
              aria-labelledby="threshold-slider-label"
              sx={{ mb: 2 }}
            />
            
            <Typography id="max-results-slider-label" gutterBottom>
              Max Results: {maxResults}
            </Typography>
            <Slider
              value={maxResults}
              onChange={(e, newValue) => setMaxResults(newValue)}
              min={1}
              max={50}
              step={1}
              aria-labelledby="max-results-slider-label"
              sx={{ mb: 2 }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      {results.length > 0 && (
        <div className="search-results">
          <Typography variant="h6" gutterBottom>
            Results
          </Typography>
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {results.map((result, index) => (
              <React.Fragment key={index}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" component="div">
                          {result.function_name || result.file_path.split('/').pop()}
                        </Typography>
                        <Chip 
                          label={`${(result.similarity * 100).toFixed(1)}% match`} 
                          color={result.similarity > 0.8 ? "success" : result.similarity > 0.6 ? "primary" : "default"}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography component="div" variant="body2" color="text.primary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
                          {result.file_path}
                          {result.language && (
                            <Chip 
                              label={result.language} 
                              size="small" 
                              sx={{ ml: 1 }}
                              variant="outlined"
                            />
                          )}
                        </Typography>
                        
                        <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                          <Typography component="div" variant="body2" fontFamily="monospace" whiteSpace="pre-wrap">
                            {result.code_snippet || result.content || '(No preview available)'}
                          </Typography>
                        </Paper>
                        
                        {result.description && (
                          <Typography 
                            component="div" 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ mt: 1, display: 'flex', alignItems: 'flex-start' }}
                          >
                            <QuoteIcon fontSize="small" sx={{ mr: 0.5 }} />
                            {result.description}
                          </Typography>
                        )}
                      </React.Fragment>
                    }
                  />
                </ListItem>
                {index < results.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </div>
      )}
    </Paper>
  );
};

export default SimilaritySearch; 