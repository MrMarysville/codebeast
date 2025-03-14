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
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Alert
} from '@mui/material';
import { 
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import ForceGraph2D from 'react-force-graph-2d';
import { toast } from 'react-toastify';
import { vectorAPI } from '../utils/api';
import '../styles/FunctionGraph.css';

// We're not even trying to load the 3D component due to compatibility issues
const ForceGraph3D = null;

const FunctionGraph = ({ projectId }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('2d');
  const [nodeSize, setNodeSize] = useState(5);
  const graphRef = useRef();
  
  // 3D is not available
  const is3DAvailable = false;
  
  useEffect(() => {
    if (projectId) {
      fetchGraphData();
    }
  }, [projectId]);
  
  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const response = await vectorAPI.getFunctionCalls(projectId);
      
      if (response && response.nodes && response.links) {
        // Transform data if needed
        const nodes = response.nodes.map(node => ({
          ...node,
          id: node.id || node.name,
          val: node.importance || 1
        }));
        
        const links = response.links.map(link => ({
          ...link,
          source: link.source,
          target: link.target
        }));
        
        setGraphData({ nodes, links });
      } else {
        throw new Error('Invalid graph data format');
      }
    } catch (error) {
      console.error('Error fetching graph data:', error);
      toast.error('Failed to load function call graph');
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      if (newView === '3d') {
        toast.warning('3D view is not available due to compatibility issues.');
        return;
      }
      setView(newView);
    }
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
  
  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Function Call Graph
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Currently only 2D visualization is available due to compatibility issues with 3D libraries.
      </Alert>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
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
      </Box>
      
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
      
      <Divider sx={{ my: 1 }} />
      
      <div className="function-graph-container">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : graphData.nodes.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No function call data available. Make sure your project is vectorized.
            </Typography>
          </Box>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel={node => node.name}
            linkLabel={link => `${link.source.name} → ${link.target.name}`}
            nodeRelSize={nodeSize}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            linkWidth={1}
            linkDirectionalParticleSpeed={0.003}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            cooldownTime={3000}
            onNodeClick={node => toast.info(node.name)}
            backgroundColor="#ffffff"
          />
        )}
      </div>
    </Paper>
  );
};

export default FunctionGraph; 