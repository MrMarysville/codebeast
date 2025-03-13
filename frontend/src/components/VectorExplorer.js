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

const VectorExplorer = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('status');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Available languages in the project
  const [availableLanguages, setAvailableLanguages] = useState([]);
  
  // Tracking incremental updates
  const [changedFilesCount] = useState(0);
  const [lastUpdateTimestamp] = useState(null);
  const [lastUpdateType] = useState(null);
  
  // Graph filters state
  const [filters, setFilters] = useState({
    language: 'all',
    minSimilarity: 0.5,
    maxNodes: 100,
    clustering: true,
    performanceMode: false
  });
  
  // Use custom fetch hook for vectorization status
  const { 
    data: vectorStatus, 
    loading: statusLoading, 
    error: statusError,
    refetch: refetchStatus 
  } = useFetch(
    `${BACKEND_URL}/api/vectorization_status/${projectId}`, 
    { cacheTime: 30000, dependencies: [projectId] }
  );
  
  // Use custom fetch hook for vector cache info
  const { 
    data: cacheInfo, 
    loading: cacheLoading, 
    error: cacheError,
    refetch: refetchCache 
  } = useFetch(
    `${BACKEND_URL}/api/vector_cache_info/${projectId}`, 
    { cacheTime: 60000, dependencies: [projectId] }
  );
  
  // Use custom fetch hook for available languages
  const { 
    data: languagesData, 
    loading: languagesLoading, 
    error: languagesError 
  } = useFetch(
    `${BACKEND_URL}/api/available_languages/${projectId}`, 
    { cacheTime: 300000, dependencies: [projectId] }
  );
  
  // Update languages when data changes
  useEffect(() => {
    if (languagesData?.languages) {
      setAvailableLanguages(languagesData.languages);
    }
  }, [languagesData]);
  
  // Refresh handler with debounce
  const handleRefresh = useCallback(() => {
    refetchStatus();
    refetchCache();
  }, [refetchStatus, refetchCache]);

  const handleVectorizationStarted = () => {
    // After vectorization is triggered, poll for status updates
    setRefreshTrigger(prev => prev + 1);
    
    // Start polling for status updates
    const interval = setInterval(() => {
      refetchStatus();
      // If vectorization is complete, stop polling
      if (vectorStatus && 
          (vectorStatus.status === 'completed' || 
           vectorStatus.status === 'failed' || 
           vectorStatus.status === 'error' || 
           vectorStatus.state === 'completed' || 
           vectorStatus.state === 'error' || 
           vectorStatus.state === 'completed_with_errors')) {
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  };

  // Determine if vectorization has been started
  const isVectorized = vectorStatus && 
    ((vectorStatus.processedFiles > 0) || 
     (vectorStatus.totalFiles > 0) ||
     (vectorStatus.total > 0));

  // Combined loading state
  const isLoading = statusLoading || cacheLoading || languagesLoading;
  
  // Combined error state
  const hasError = statusError || cacheError || languagesError;
  const error = statusError || cacheError || languagesError;

  // Render error state if there's an error
  if (hasError) {
    return (
      <div className="vector-explorer">
        <ErrorState 
          error={error} 
          title="Failed to load vector data"
          variant="card"
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  // Render appropriate content based on active tab
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <LoadingState 
          type="skeleton" 
          message="Loading vector data..." 
          size="medium"
        />
      );
    }

    if (!isVectorized && activeTab !== 'status' && activeTab !== 'changes') {
      return (
        <div className="vector-empty">
          <p>This project has not been vectorized yet. Start the vectorization process to enable this feature.</p>
          <VectorizationTrigger 
            projectId={projectId} 
            onVectorizationStarted={handleVectorizationStarted} 
          />
        </div>
      );
    }

    switch (activeTab) {
      case 'status':
        return (
          <div className="status-container">
            <VectorizationStatus 
              status={vectorStatus} 
              onRefresh={handleRefresh} 
              projectId={projectId}
              onVectorizationStarted={handleVectorizationStarted}
              changedFilesCount={changedFilesCount}
              lastUpdateTimestamp={lastUpdateTimestamp}
              lastUpdateType={lastUpdateType}
              cacheInfo={cacheInfo}
            />
            
            {/* Show incremental update statistics if available */}
            {isVectorized && lastUpdateType && (
              <div className="update-stats">
                <h4>Last Update Information</h4>
                <div className="update-info">
                  <div className="info-item">
                    <strong>Update Type:</strong> 
                    <span className={`update-type ${lastUpdateType}`}>
                      {lastUpdateType === 'incremental' ? 'Incremental' : 
                       lastUpdateType === 'selective' ? 'Selective' : 'Full'}
                    </span>
                  </div>
                  {changedFilesCount > 0 && (
                    <div className="info-item">
                      <strong>Changed Files:</strong> {changedFilesCount}
                    </div>
                  )}
                  {lastUpdateTimestamp && (
                    <div className="info-item">
                      <strong>Last Updated:</strong> 
                      {new Date(lastUpdateTimestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case 'changes':
        return <ChangedFilesVisualization projectId={projectId} refreshTrigger={refreshTrigger} />;
      case 'functions':
        return <FunctionList projectId={projectId} languages={availableLanguages} />;
      case 'search':
        return <SimilaritySearch projectId={projectId} languages={availableLanguages} />;
      case 'graph':
        return (
          <FunctionGraph 
            projectId={projectId} 
            filters={filters}
            onFilterChange={setFilters}
            languages={availableLanguages}
          />
        );
      case 'components':
        return <ComponentRelationshipGraph projectId={projectId} />;
      default:
        return <VectorizationStatus status={vectorStatus} onRefresh={handleRefresh} />;
    }
  };

  return (
    <div className="vector-explorer">
      <div className="vector-header">
        <h2>Vector Explorer</h2>
        <div className="refresh-button" onClick={handleRefresh} title="Refresh data">
          <FiRefreshCw />
        </div>
      </div>

      <div className="vector-tabs">
        <div 
          className={`vector-tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          <FiActivity />
          <span>Status</span>
        </div>
        <div 
          className={`vector-tab ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('changes')}
        >
          <FiGitBranch />
          <span>Changed Files</span>
        </div>
        <div 
          className={`vector-tab ${activeTab === 'functions' ? 'active' : ''} ${!isVectorized ? 'disabled' : ''}`}
          onClick={() => isVectorized && setActiveTab('functions')}
        >
          <FiCode />
          <span>Functions</span>
        </div>
        <div 
          className={`vector-tab ${activeTab === 'search' ? 'active' : ''} ${!isVectorized ? 'disabled' : ''}`}
          onClick={() => isVectorized && setActiveTab('search')}
        >
          <FiSearch />
          <span>Similarity</span>
        </div>
        <div 
          className={`vector-tab ${activeTab === 'graph' ? 'active' : ''} ${!isVectorized ? 'disabled' : ''}`}
          onClick={() => isVectorized && setActiveTab('graph')}
        >
          <FiTrendingUp />
          <span>Graph</span>
        </div>
        <div 
          className={`vector-tab ${activeTab === 'components' ? 'active' : ''}`}
          onClick={() => setActiveTab('components')}
        >
          <FiDatabase />
          <span>Component Graph</span>
        </div>
      </div>

      <div className="vector-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

VectorExplorer.propTypes = {
  projectId: PropTypes.string.isRequired,
};

export default VectorExplorer;