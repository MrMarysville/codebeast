import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  ListItemButton,
  Divider,
  Paper,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  Functions as FunctionIcon, 
  Code as CodeIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { vectorAPI } from '../utils/api';
import { toast } from 'react-toastify';

const FunctionList = ({ projectId, onFunctionSelect }) => {
  const [functions, setFunctions] = useState([]);
  const [filteredFunctions, setFilteredFunctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [languages, setLanguages] = useState([]);

  const fetchFunctions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await vectorAPI.getFunctions(projectId);
      if (data && Array.isArray(data.functions)) {
        setFunctions(data.functions);
        
        // Extract unique languages
        const uniqueLanguages = [...new Set(data.functions.map(func => func.language))];
        setLanguages(uniqueLanguages);
      } else {
        throw new Error('Invalid function data format');
      }
    } catch (error) {
      console.error('Error fetching functions:', error);
      toast.error('Failed to load functions');
      setFunctions([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const filterFunctions = useCallback(() => {
    if (!functions.length) return;
    
    let filtered = [...functions];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(func => 
        func.name.toLowerCase().includes(term) || 
        (func.file && func.file.toLowerCase().includes(term))
      );
    }
    
    // Filter by language
    if (selectedLanguage && selectedLanguage !== 'all') {
      filtered = filtered.filter(func => func.language === selectedLanguage);
    }
    
    setFilteredFunctions(filtered);
  }, [functions, searchTerm, selectedLanguage]);

  useEffect(() => {
    if (projectId) {
      fetchFunctions();
    }
  }, [projectId, fetchFunctions]);

  useEffect(() => {
    filterFunctions();
  }, [filterFunctions]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
  };

  const handleFunctionClick = (func) => {
    if (onFunctionSelect) {
      onFunctionSelect(func);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Functions
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search functions..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          size="small"
          sx={{ mb: 2 }}
        />
        
        <FormControl size="small" fullWidth>
          <InputLabel id="language-select-label">Language</InputLabel>
          <Select
            labelId="language-select-label"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            label="Language"
          >
            <MenuItem value="all">All Languages</MenuItem>
            {languages.map((lang) => (
              <MenuItem key={lang} value={lang}>{lang}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : filteredFunctions.length > 0 ? (
        <List sx={{ overflow: 'auto', flexGrow: 1 }}>
          {filteredFunctions.map((func, index) => (
            <React.Fragment key={`${func.file_path}-${func.name}-${index}`}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleFunctionClick(func)}>
                  <ListItemIcon>
                    <FunctionIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={func.name} 
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="body2" color="text.primary">
                          {func.file_path}
                        </Typography>
                        {func.description && 
                          <Typography component="div" variant="body2" color="text.secondary" noWrap>
                            {func.description}
                          </Typography>
                        }
                      </React.Fragment>
                    }
                  />
                  <Chip 
                    label={func.language} 
                    size="small" 
                    icon={<CodeIcon />} 
                    variant="outlined"
                  />
                </ListItemButton>
              </ListItem>
              {index < filteredFunctions.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {functions.length > 0 
              ? 'No functions match your search criteria' 
              : 'No functions found. Make sure your code is vectorized.'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default FunctionList; 