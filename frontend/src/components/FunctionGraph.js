import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import axios from 'axios';
import { 
  FiZoomIn, FiZoomOut, FiRefreshCw, 
  FiMinimize, FiMaximize, FiLayers, FiCpu 
} from 'react-icons/fi';
import ForceGraph2D from 'react-force-graph-2d';
import '../styles/FunctionGraph.css';
import PropTypes from 'prop-types';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';
import { toast } from 'react-toastify';

// Import 3D graph conditionally to handle potential errors
let ForceGraph3D = null;
try {
  // We need to use require instead of import for conditional loading
  ForceGraph3D = require('react-force-graph-3d').default;
} catch (err) {
  console.warn('3D graph module could not be loaded, falling back to 2D only mode:', err.message);
}

// Component metadata for React 19
export const metadata = {
  componentName: "FunctionGraph",
  description: "FunctionGraph component",
};

// Language color mapping
const LANGUAGE_COLORS = {
  javascript: '#F0DB4F',
  typescript: '#007ACC',
  python: '#3572A5',
  java: '#B07219',
  cpp: '#F34B7D',
  csharp: '#178600',
  ruby: '#701516',
  go: '#00ADD8',
  rust: '#DEA584',
  php: '#4F5D95',
  swift: '#F05138',
  kotlin: '#A97BFF',
  default: '#cccccc'
};

const LAYOUT_TYPES = {
  FORCE: 'force',
  CIRCULAR: 'circular',
  HIERARCHICAL: 'hierarchical',
  GRID: 'grid'
};

// Memoized Node Details Component
const NodeDetails = memo(({ node, onClose, onExpandCluster }) => {
  if (!node) return null;
  
  return (
    <div className="node-details-panel">
      <div className="node-details-header">
        <h3>{node.name}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="node-details-content">
        {node.isCluster ? (
          <>
            <p><strong>Type:</strong> Language Cluster</p>
            <p><strong>Language:</strong> {node.language}</p>
            <p><strong>Nodes:</strong> {node.val || 'Unknown'}</p>
            <div className="node-details-actions">
              <button 
                className="expand-cluster-btn"
                onClick={() => onExpandCluster(node.id)}
              >
                Expand
              </button>
            </div>
          </>
        ) : (
          <>
            {node.filePath && (
              <p>
                <strong>File:</strong> {node.filePath}
              </p>
            )}
            <p>
              <strong>Language:</strong> {node.language || 'Unknown'}
            </p>
            {node.complexity !== undefined && (
              <p>
                <strong>Complexity:</strong> {node.complexity.toFixed(2)}
              </p>
            )}
            {node.code && (
              <div className="node-code">
                <strong>Code Sample:</strong>
                <pre>{node.code}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

NodeDetails.displayName = 'NodeDetails';

// Memoized Controls Component
const GraphControls = memo(({ 
  is3D, 
  setIs3D,
  isFullscreen, 
  toggleFullscreen, 
  refreshGraph, 
  zoomIn, 
  zoomOut,
  performanceMode,
  metrics
}) => {
  return (
    <div className="graph-controls">
      <button className="control-btn" onClick={() => setIs3D(!is3D)} title={is3D ? "Switch to 2D" : "Switch to 3D"}>
        {is3D ? <FiLayers /> : <FiCpu />}
      </button>
      
      <button className="control-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
        {isFullscreen ? <FiMinimize /> : <FiMaximize />}
      </button>
      
      <button className="control-btn" onClick={refreshGraph} title="Refresh Layout">
        <FiRefreshCw />
      </button>
      
      <button className="control-btn" onClick={zoomIn} title="Zoom In">
        <FiZoomIn />
      </button>
      
      <button className="control-btn" onClick={zoomOut} title="Zoom Out">
        <FiZoomOut />
      </button>
      
      {performanceMode && (
        <div className="performance-stats">
          <div className="stat">
            <span className="stat-label">FPS:</span>
            <span className="stat-value">{metrics.fps}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Nodes:</span>
            <span className="stat-value">{metrics.nodeCount}</span>
          </div>
        </div>
      )}
    </div>
  );
});

GraphControls.displayName = 'GraphControls';

const FunctionGraph = ({ projectId, filters = {}, onFilterChange = () => {}, searchTerm = '', onNodeClick }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [is3DSupported, setIs3DSupported] = useState(!!ForceGraph3D);
  const [layout, setLayout] = useState(LAYOUT_TYPES.FORCE);
  
  // Performance metrics
  const [metrics, setMetrics] = useState({
    nodeCount: 0,
    linkCount: 0,
    renderTime: 0,
    fps: 0
  });
  
  const graphRef = useRef();
  const containerRef = useRef();
  const lastRenderTime = useRef(Date.now());
  const frameCount = useRef(0);
  const fpsInterval = useRef(null);

  // Define getLanguageColor function used in transformGraphData
  const getLanguageColor = (language) => {
    return LANGUAGE_COLORS[language?.toLowerCase()] || '#999999';
  };

  // Define transformGraphData before it's used
  const transformGraphData = useCallback((data) => {
    const nodes = data.nodes.map(node => ({
      ...node,
      id: node.id,
      name: node.name || 'Unnamed Function',
      language: node.language || 'unknown',
      file: node.file || 'Unknown file',
      complexity: node.complexity || 1,
      code: node.code || '',
      filePath: node.file_path || '',
      color: getLanguageColor(node.language),
      // Size based on complexity (or centrality if available)
      val: node.centrality || node.complexity || 1
    }));
    
    const links = data.links.map(link => ({
      ...link,
      source: link.source,
      target: link.target,
      value: link.value || link.weight || 1
    }));
    
    return { nodes, links, originalNodes: [...nodes], originalLinks: [...links] };
  }, []);

  // Define clusterNodes before it's used
  const clusterNodes = useCallback((graphData) => {
    if (!graphData.nodes.length) return graphData;
    
    // Group nodes by language
    const nodesByLanguage = {};
    graphData.nodes.forEach(node => {
      const lang = node.language || 'unknown';
      if (!nodesByLanguage[lang]) {
        nodesByLanguage[lang] = [];
      }
      nodesByLanguage[lang].push(node);
    });
    
    // Create cluster nodes and links
    const clusters = [];
    const clusterLinks = [];
    let clusterId = 'cluster-0';
    
    Object.entries(nodesByLanguage).forEach(([language, nodes], index) => {
      // Only create clusters for languages with multiple nodes
      if (nodes.length > 3) {
        // Create the cluster node
        clusterId = `cluster-${index}`;
        const cluster = {
          id: clusterId,
          name: language,
          language: language,
          isCluster: true,
          val: nodes.length, // Size based on number of contained nodes
          color: getLanguageColor(language),
          nodes: nodes.map(n => n.id) // Store member node IDs
        };
        
        clusters.push(cluster);
        
        // Create links from cluster to any external nodes
        graphData.links.forEach(link => {
          const sourceNode = nodes.find(n => n.id === link.source);
          const targetNode = nodes.find(n => n.id === link.target);
          
          // Link between current language and other language
          if ((sourceNode && !targetNode) || (!sourceNode && targetNode)) {
            // Create a link to the cluster
            const existingLink = clusterLinks.find(l => 
              (l.source === clusterId && l.target === (targetNode ? link.target : link.source)) ||
              (l.target === clusterId && l.source === (sourceNode ? link.source : link.target))
            );
            
            if (!existingLink) {
              clusterLinks.push({
                source: sourceNode ? clusterId : link.source,
                target: targetNode ? clusterId : link.target,
                value: 1
              });
            }
          }
        });
        
        // Remove the individual nodes that are now in the cluster
        graphData.nodes = graphData.nodes.filter(node => !nodes.includes(node));
      }
    });
    
    // Add the cluster nodes
    graphData.nodes = [...graphData.nodes, ...clusters];
    
    // Filter out links that are now internal to clusters
    graphData.links = graphData.links.filter(link => {
      const sourceCluster = clusters.find(c => c.nodes?.includes(link.source));
      const targetCluster = clusters.find(c => c.nodes?.includes(link.target));
      
      // Keep links that are not between nodes in the same cluster
      return !(sourceCluster && targetCluster && sourceCluster.id === targetCluster.id);
    });
    
    // Add the new cluster links
    graphData.links = [...graphData.links, ...clusterLinks];
    
    return graphData;
  }, []);

  // Define getNodeColor before it's used
  const getNodeColor = useCallback((node) => {
    // If this is a cluster node
    if (node.isCluster) {
      return '#666666';
    }
    
    // If this is a highlighted node (from search)
    if (node.__highlighted) {
      return '#FF5500';
    }
    
    // Otherwise, use language color or default
    return LANGUAGE_COLORS[node.language?.toLowerCase()] || '#AAAAAA';
  }, []);

  // Define highlightSearchResults before it's used
  const highlightSearchResults = useCallback(() => {
    if (!graphRef.current || !searchTerm || !graphData.nodes.length) return;
    
    graphRef.current.nodeColor(node => {
      // Skip processing for cluster nodes
      if (node.isCluster) return getNodeColor(node);
      
      // Check node properties for search term
      const nodeText = `${node.name} ${node.file} ${node.language || ''}`.toLowerCase();
      const isMatch = nodeText.includes(searchTerm.toLowerCase());
      
      // Mark matches for styling
      node.__highlighted = isMatch;
      
      return getNodeColor(node);
    });
  }, [searchTerm, graphData.nodes, getNodeColor]);

  // Define fetchGraphData before it's used in the useEffect
  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const queryParams = new URLSearchParams({
        threshold: filters.minSimilarity,
        limit: filters.maxNodes
      });
      
      if (filters.language && filters.language !== 'all') {
        queryParams.append('languages', filters.language);
      }
      
      const response = await axios.get(`/api/vectors/projects/${projectId}/vectors/graph?${queryParams.toString()}`);
      
      if (response.data) {
        const transformedData = transformGraphData(response.data);
        
        // Apply clustering if enabled
        if (filters.clustering) {
          setGraphData(clusterNodes(transformedData));
        } else {
          setGraphData(transformedData);
        }
        
        // Update performance metrics
        setMetrics(prev => ({
          ...prev,
          nodeCount: response.data.nodes.length,
          linkCount: response.data.links.length,
          filteredBy: filters.language || 'none'
        }));
      } else {
        setError('Failed to load graph data: Invalid response');
      }
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError(`Failed to load graph data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, filters.minSimilarity, filters.maxNodes, filters.language, filters.clustering, transformGraphData, clusterNodes]);

  // Now use the functions in effects
  useEffect(() => {
    if (!projectId) return;
    
    fetchGraphData();
  }, [projectId, filters.language, filters.minSimilarity, filters.maxNodes, fetchGraphData]);

  useEffect(() => {
    if (searchTerm && graphData.nodes.length > 0) {
      highlightSearchResults();
    } else if (graphRef.current) {
      graphRef.current.nodeColor(node => getNodeColor(node));
    }
  }, [searchTerm, graphData, highlightSearchResults, getNodeColor]);

  useEffect(() => {
    if (filters.performanceMode) {
      fpsInterval.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastRenderTime.current;
        const fps = Math.round((frameCount.current / elapsed) * 1000);
        
        setMetrics(prev => ({
          ...prev,
          fps: fps
        }));
        
        frameCount.current = 0;
        lastRenderTime.current = now;
      }, 1000);
    } else if (fpsInterval.current) {
      clearInterval(fpsInterval.current);
    }
    
    return () => {
      if (fpsInterval.current) {
        clearInterval(fpsInterval.current);
      }
    };
  }, [filters.performanceMode]);

  const expandCluster = useCallback((clusterId) => {
    const cluster = graphData.nodes.find(node => node.id === clusterId && node.isCluster);
    
    if (!cluster || !cluster.childNodeIds) return;
    
    // Create a new graph with the cluster expanded
    const newNodes = graphData.nodes.filter(node => node.id !== clusterId);
    const childNodes = cluster.childNodeIds.map(id => {
      const node = graphData.originalNodes.find(n => n.id === id);
      return node ? { ...node, x: cluster.x, y: cluster.y } : null;
    }).filter(Boolean);
    
    setGraphData({
      ...graphData,
      nodes: [...newNodes, ...childNodes]
    });
    
    setSelectedNode(null);
  }, [graphData, setGraphData, setSelectedNode]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    
    // Call external handler if provided
    if (onNodeClick) {
      onNodeClick(node);
    }
    
    // Automatically expand clusters when clicked
    if (node.isCluster) {
      expandCluster(node.id);
    }
  }, [onNodeClick, expandCluster]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
        document.exitFullscreen();
    }
  }, []);

  // Function to handle zooming in and out
  const zoomToFit = useCallback((factor) => {
    if (!graphRef.current) return;
    
    const currentZoom = graphRef.current.zoom();
    const newZoom = currentZoom * factor;
    
    graphRef.current.zoom(newZoom, 400);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const onFrameRender = useCallback(() => {
    if (filters.performanceMode) {
      frameCount.current++;
      const now = Date.now();
      const elapsed = now - lastRenderTime.current;
      
      if (elapsed > 1000) { // Update every second
        const fps = Math.round((frameCount.current / elapsed) * 1000);
        
        setMetrics(prev => ({
          ...prev,
          fps: fps
        }));
        
        frameCount.current = 0;
        lastRenderTime.current = now;
      }
    }
  }, [filters.performanceMode]);

  // Add layout functions
  const applyCircularLayout = useCallback(() => {
    const radius = Math.sqrt(graphData.nodes.length) * 50;
    const angleStep = (2 * Math.PI) / graphData.nodes.length;
    
    graphData.nodes.forEach((node, i) => {
      node.x = radius * Math.cos(angleStep * i);
      node.y = radius * Math.sin(angleStep * i);
    });
    
    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  }, [graphData.nodes]);

  const applyHierarchicalLayout = useCallback(() => {
    const levels = new Map();
    const visited = new Set();
    
    // Find root nodes (nodes with no incoming edges)
    const hasIncoming = new Set(graphData.links.map(link => link.target.id || link.target));
    const rootNodes = graphData.nodes.filter(node => !hasIncoming.has(node.id));
    
    // Assign levels through BFS
    const queue = rootNodes.map(node => ({ node, level: 0 }));
    while (queue.length > 0) {
      const { node, level } = queue.shift();
      if (visited.has(node.id)) continue;
      
      visited.add(node.id);
      if (!levels.has(level)) levels.set(level, []);
      levels.get(level).push(node);
      
      // Find children
      const children = graphData.links
        .filter(link => (link.source.id || link.source) === node.id)
        .map(link => graphData.nodes.find(n => n.id === (link.target.id || link.target)));
      
      children.forEach(child => {
        if (!visited.has(child.id)) {
          queue.push({ node: child, level: level + 1 });
        }
      });
    }
    
    // Position nodes
    const levelHeight = 100;
    levels.forEach((nodes, level) => {
      const spacing = 100; // Space between nodes
      nodes.forEach((node, i) => {
        node.x = (i - nodes.length / 2) * spacing;
        node.y = level * levelHeight;
      });
    });
    
    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  }, [graphData.nodes, graphData.links]);

  const applyGridLayout = useCallback(() => {
    const cols = Math.ceil(Math.sqrt(graphData.nodes.length));
    const cellSize = 100;
    
    graphData.nodes.forEach((node, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      node.x = (col - cols / 2) * cellSize;
      node.y = (row - Math.floor(graphData.nodes.length / cols) / 2) * cellSize;
    });
    
    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  }, [graphData.nodes]);

  // Apply layout when it changes
  useEffect(() => {
    if (!graphData.nodes.length) return;
    
    switch (layout) {
      case LAYOUT_TYPES.CIRCULAR:
        applyCircularLayout();
        break;
      case LAYOUT_TYPES.HIERARCHICAL:
        applyHierarchicalLayout();
        break;
      case LAYOUT_TYPES.GRID:
        applyGridLayout();
        break;
      default:
        // Force-directed layout is handled by react-force-graph
        if (graphRef.current) {
          graphRef.current.d3ReheatSimulation();
        }
    }
  }, [layout, graphData.nodes, applyCircularLayout, applyHierarchicalLayout, applyGridLayout]);

  // Memoize relevant nodes based on searchTerm
  const filteredNodes = useMemo(() => {
    if (!searchTerm || !graphData.nodes.length) return graphData.nodes;
    
    return graphData.nodes.filter(node => {
      if (node.isCluster) return true; // Always include clusters
      
      const nodeText = `${node.name} ${node.file} ${node.language || ''}`.toLowerCase();
      return nodeText.includes(searchTerm.toLowerCase());
    });
  }, [searchTerm, graphData.nodes]);

  // Memoize the graph data for rendering
  const renderGraphData = useMemo(() => {
    return {
      nodes: filteredNodes,
      links: graphData.links.filter(link => {
        // Keep links where both source and target are in the filtered nodes
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        const hasSource = filteredNodes.some(node => node.id === sourceId);
        const hasTarget = filteredNodes.some(node => node.id === targetId);
        
        return hasSource && hasTarget;
      })
    };
  }, [filteredNodes, graphData.links]);

  if (loading) {
    return (
      <div className="function-graph-container">
        <LoadingState 
          type="spinner" 
          message="Loading graph data..." 
          size="medium"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="function-graph-container">
        <ErrorState 
          error={error}
          title="Failed to load graph data"
          variant="card"
          onRetry={fetchGraphData}
        />
      </div>
    );
  }

  if (!graphData.nodes.length) {
    return (
      <div className="function-graph-container">
        <div className="function-graph-empty">
          <p>No function relationships found. Try adjusting your filters or vectorize more files.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`function-graph-container ${isFullscreen ? 'fullscreen' : ''}`}
      data-testid="function-graph"
    >
      <div className="function-graph-wrapper">
        <GraphControls 
          is3D={is3D && is3DSupported}
          setIs3D={(value) => {
            if (!is3DSupported && value) {
              toast.warning('3D mode is not available due to compatibility issues. Using 2D mode instead.');
              return;
            }
            setIs3D(value);
          }}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          refreshGraph={() => graphRef.current.zoomToFit(400)}
          zoomIn={() => zoomToFit(0.8)}
          zoomOut={() => zoomToFit(1.2)}
          performanceMode={filters.performanceMode}
          metrics={metrics}
        />
        
        {selectedNode && (
          <NodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} onExpandCluster={expandCluster} />
        )}
        
        <div className="function-graph">
          {is3D && is3DSupported ? (
            <ForceGraph3D
              ref={graphRef}
              graphData={renderGraphData}
              nodeLabel={(node) => `${node.name} (${node.language})`}
              nodeColor={getNodeColor}
              nodeRelSize={6}
              nodeVal={node => node.val || 1}
              linkColor={() => "#999999"}
              linkWidth={link => link.width || 1}
              enableNodeDrag={!filters.performanceMode}
              enableNavigationControls={!filters.performanceMode}
              showNavInfo={!filters.performanceMode}
            />
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={renderGraphData}
              nodeLabel={(node) => `${node.name} (${node.language})`}
              nodeColor={getNodeColor}
              nodeRelSize={6}
              nodeVal={node => node.val || 1}
              linkColor={() => "#999999"}
              linkWidth={link => link.value}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={link => link.value}
              onNodeClick={handleNodeClick}
              onNodeDragEnd={node => {
                node.fx = node.x;
                node.fy = node.y;
              }}
              onLinkClick={handleNodeClick}
              cooldownTicks={100}
              onEngineStop={() => console.log('Engine stopped')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

FunctionGraph.propTypes = {
  projectId: PropTypes.string.isRequired,
  filters: PropTypes.shape({
    language: PropTypes.string,
    minSimilarity: PropTypes.number,
    maxNodes: PropTypes.number,
    clustering: PropTypes.bool,
    performanceMode: PropTypes.bool,
  }),
  onFilterChange: PropTypes.func,
  searchTerm: PropTypes.string,
  onNodeClick: PropTypes.func
};

export default memo(FunctionGraph); 