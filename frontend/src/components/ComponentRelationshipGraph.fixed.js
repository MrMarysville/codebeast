import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Divider,
  Tooltip,
  Grid,
  Alert
} from '@mui/material';
import { 
  BubbleChart as GraphIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FormatColorFill as ColorIcon
} from '@mui/icons-material';
import ForceGraph2D from 'react-force-graph-2d';
import { toast } from 'react-toastify';
import { vectorAPI } from '../utils/api';
import '../styles/FunctionGraph.css';

// We're not even trying to load the 3D component due to compatibility issues
const ForceGraph3D = null;

// Color scale based on node types
const getNodeColor = (node) => {
  const colorMap = {
    'function': '#1f77b4',  // blue
    'class': '#2ca02c',     // green
    'variable': '#d62728',  // red
    'module': '#9467bd',    // purple
    'file': '#8c564b',      // brown
    'package': '#e377c2',   // pink
    'namespace': '#7f7f7f', // gray
    'interface': '#bcbd22', // yellow-green
    'enum': '#17becf',      // cyan
    'type': '#ff7f0e',      // orange
  };
  
  return colorMap[node.type] || '#aaa';
};

// Edge types with different colors
const getEdgeColor = (edge) => {
  const colorMap = {
    'imports': '#999',
    'calls': '#1f77b4',
    'extends': '#2ca02c',
    'implements': '#d62728',
    'references': '#9467bd',
    'uses': '#8c564b',
  };
  
  return colorMap[edge.relationship] || '#ddd';
};

const ComponentRelationshipGraph = ({ projectId }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [graphFilter, setGraphFilter] = useState('all');
  const [nodeSize, setNodeSize] = useState(5);
  const [linkDistance, setLinkDistance] = useState(100);
  const [colorBy, setColorBy] = useState('type');
  const graphRef = useRef();
  
  useEffect(() => {
    if (projectId) {
      fetchGraphData();
    }
  }, [projectId, graphFilter]);
  
  const fetchGraphData = async () => {
    try {
      setLoading(true);
      
      // Different API calls based on the filter
      let response;
      if (graphFilter === 'all') {
        response = await vectorAPI.getComponentRelationships(projectId);
      } else if (graphFilter === 'functions') {
        response = await vectorAPI.getFunctionCalls(projectId);
      } else if (graphFilter === 'imports') {
        response = await vectorAPI.getImportGraph(projectId);
      } else if (graphFilter === 'classes') {
        response = await vectorAPI.getClassHierarchy(projectId);
      }
      
      if (response && response.nodes && response.links) {
        // Transform data if needed
        const nodes = response.nodes.map(node => ({
          ...node,
          id: node.id || node.name,
          val: node.importance || 1,
          color: getNodeColor(node)
        }));
        
        const links = response.links.map(link => ({
          ...link,
          source: link.source,
          target: link.target,
          color: getEdgeColor(link)
        }));
        
        setGraphData({ nodes, links });
      } else {
        throw new Error('Invalid graph data format');
      }
    } catch (error) {
      console.error('Error fetching graph data:', error);
      toast.error('Failed to load component relationships');
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGraphFilterChange = (event) => {
    setGraphFilter(event.target.value);
  };
  
  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 20);
    }
  };
  
  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoomReset();
    }
  };
  
  const handleColorByChange = (event) => {
    setColorBy(event.target.value);
  };
  
  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Component Relationships
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Currently only 2D visualization is available due to compatibility issues with 3D libraries.
      </Alert>
      
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth>
              <InputLabel id="graph-filter-label">Graph Type</InputLabel>
              <Select
                labelId="graph-filter-label"
                value={graphFilter}
                onChange={handleGraphFilterChange}
                label="Graph Type"
              >
                <MenuItem value="all">All Relationships</MenuItem>
                <MenuItem value="functions">Function Calls</MenuItem>
                <MenuItem value="imports">Import Dependencies</MenuItem>
                <MenuItem value="classes">Class Hierarchy</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth>
              <InputLabel id="color-by-label">Color By</InputLabel>
              <Select
                labelId="color-by-label"
                value={colorBy}
                onChange={handleColorByChange}
                label="Color By"
              >
                <MenuItem value="type">Node Type</MenuItem>
                <MenuItem value="language">Language</MenuItem>
                <MenuItem value="module">Module</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography id="node-size-slider" gutterBottom sx={{ mr: 2, minWidth: '80px' }}>
          Node Size
        </Typography>
        <Slider
          value={nodeSize}
          onChange={(e, newValue) => setNodeSize(newValue)}
          min={1}
          max={20}
          valueLabelDisplay="auto"
          aria-labelledby="node-size-slider"
        />
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography id="link-distance-slider" gutterBottom sx={{ mr: 2, minWidth: '80px' }}>
          Link Distance
        </Typography>
        <Slider
          value={linkDistance}
          onChange={(e, newValue) => setLinkDistance(newValue)}
          min={30}
          max={300}
          valueLabelDisplay="auto"
          aria-labelledby="link-distance-slider"
        />
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
        <Tooltip title="Zoom to fit">
          <Button 
            onClick={handleZoomIn} 
            startIcon={<ZoomInIcon />}
            size="small"
            sx={{ mr: 1 }}
          >
            Fit
          </Button>
        </Tooltip>
        <Tooltip title="Reset zoom">
          <Button 
            onClick={handleZoomOut} 
            startIcon={<ZoomOutIcon />}
            size="small"
          >
            Reset
          </Button>
        </Tooltip>
      </Box>
      
      <div className="function-graph-container">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : graphData.nodes.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No relationship data available. Try changing the graph type or make sure your project is vectorized.
            </Typography>
          </Box>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel={node => `${node.name} (${node.type})`}
            linkLabel={link => `${link.relationship}: ${link.source.name} → ${link.target.name}`}
            nodeRelSize={nodeSize}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            linkWidth={1}
            linkDirectionalParticleSpeed={0.003}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            cooldownTime={3000}
            onNodeClick={node => toast.info(`${node.name} (${node.type})`)}
            backgroundColor="#ffffff"
          />
        )}
      </div>
    </Paper>
  );
};

export default ComponentRelationshipGraph; 