import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Button,
  Slider,
  Divider,
  Tooltip,
  Alert
} from '@mui/material';
import { 
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import ForceGraph2D from 'react-force-graph-2d';
import { toast } from 'react-toastify';
import { vectorAPI } from '../utils/api';
import '../styles/ComponentRelationshipGraph.css';
import PropTypes from 'prop-types';

const ComponentRelationshipGraph = ({ projectId }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [nodeSize, setNodeSize] = useState(5);
  const graphRef = useRef();
  
  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await vectorAPI.getComponentRelationships(projectId);
      
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
      console.error('Error fetching component relationship data:', error);
      toast.error('Failed to load component relationships');
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  
  useEffect(() => {
    if (projectId) {
      fetchGraphData();
    }
  }, [projectId, fetchGraphData]);
  
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
  
  const handleRefresh = () => {
    fetchGraphData();
  };
  
  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Component Relationship Graph
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        This graph shows relationships between React components in your project.
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
              sx={{ mr: 1 }}
            >
              Reset
            </Button>
          </Tooltip>
          <Tooltip title="Refresh data">
            <Button 
              onClick={handleRefresh} 
              startIcon={<RefreshIcon />}
              size="small"
            >
              Refresh
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
      
      <div className="component-graph-container">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : graphData.nodes.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No component relationship data available. Make sure your project contains React components and is vectorized.
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

ComponentRelationshipGraph.propTypes = {
  projectId: PropTypes.string.isRequired
};

export default ComponentRelationshipGraph; 