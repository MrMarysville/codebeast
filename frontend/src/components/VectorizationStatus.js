import { FiActivity, FiCode, FiCpu, FiDatabase, FiFile, FiAlertTriangle, FiCheckCircle, FiLoader, FiRefreshCw, FiSearch, FiTrendingUp, FiClock, FiGitBranch } from 'react-icons/fi';
import VectorizationTrigger from './VectorizationTrigger';


// Component metadata for React 19
export const metadata = {
  componentName: "VectorizationStatus",
  description: "VectorizationStatus component",
};

const VectorizationStatus = ({ 
  status, 
  onRefresh, 
  projectId, 
  onVectorizationStarted,
  changedFilesCount,
  lastUpdateTimestamp,
  lastUpdateType,
  cacheInfo
}) => {
  if (!status) {
    return <div className="vector-loading">Loading status...</div>;
  }

  // Format the state for display
  const getStateDisplay = () => {
    switch (status.state || status.status) {
      case 'not_started':
        return { 
          label: 'Not Started', 
          className: 'not-started',
          icon: <FiCode />
        };
      case 'initializing':
      case 'processing':
      case 'in_progress':
        return { 
          label: 'In Progress', 
          className: 'in-progress',
          icon: <FiLoader className="spinner-small" /> 
        };
      case 'completed':
        return { 
          label: 'Completed', 
          className: 'completed',
          icon: <FiCheckCircle /> 
        };
      case 'completed_with_errors':
        return { 
          label: 'Completed with Errors', 
          className: 'error',
          icon: <FiAlertTriangle /> 
        };
      case 'failed':
      case 'error':
        return {
          label: 'Failed',
          className: 'error',
          icon: <FiAlertTriangle />
        };
      default:
        return { 
          label: 'Unknown', 
          className: '',
          icon: <FiCode /> 
        };
    }
  };

  const stateDisplay = getStateDisplay();

  // If vectorization has not started, show the trigger button
  if ((status.state === 'not_started' || status.status === 'not_started' || status.status === 'idle') && 
      (!status.processedFiles && !status.processed)) {
    return (
      <div className="vectorization-empty">
        <div className="empty-message">
          <h3>Codebase Not Vectorized</h3>
          <p>
            Vectorize your codebase to unlock powerful features like semantic code search, 
            function relationships visualization, and enhanced feature processing.
          </p>
          <VectorizationTrigger 
            projectId={projectId} 
            onVectorizationStarted={onVectorizationStarted} 
          />
        </div>
        <div className="benefits">
          <div className="benefit-item">
            <FiSearch className="benefit-icon" />
            <h4>Semantic Search</h4>
            <p>Find functions by meaning, not just keywords</p>
          </div>
          <div className="benefit-item">
            <FiTrendingUp className="benefit-icon" />
            <h4>Code Relationships</h4>
            <p>Visualize connections between your functions</p>
          </div>
          <div className="benefit-item">
            <FiCpu className="benefit-icon" />
            <h4>Enhanced Features</h4>
            <p>Contextual feature processing based on your code patterns</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress percentages
  const totalCount = status.total || status.totalFiles || 1; // Avoid division by zero
  const processedCount = status.processed || status.processedFiles || 0;
  const pendingCount = status.pending || (totalCount - processedCount) || 0;
  const failedCount = status.failed || 0;
  
  const processedPercent = (processedCount / totalCount) * 100;
  const pendingPercent = (pendingCount / totalCount) * 100;
  const failedPercent = (failedCount / totalCount) * 100;

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      
      if (diffSec < 60) return 'just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
      return `${Math.floor(diffSec / 86400)} days ago`;
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Last updated time
  const lastUpdated = status.lastUpdated || status.endTime || status.timestamp;
  const relativeTime = lastUpdated ? formatRelativeTime(lastUpdated) : '';

  return (
    <div className="vectorization-status">
      <div className="status-header">
        <div className="status-indicator">
          <div className={`status-badge ${stateDisplay.className}`}>
            {stateDisplay.icon}
            <span>{stateDisplay.label}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="refresh-button" onClick={onRefresh} title="Refresh status">
            <FiRefreshCw />
          </button>
        </div>
      </div>
      
      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress-segment processed" style={{ width: `${processedPercent}%` }} title={`Processed: ${processedCount} files`}>
            {processedPercent > 10 && `${Math.round(processedPercent)}%`}
          </div>
          {failedCount > 0 && (
            <div className="progress-segment failed" style={{ width: `${failedPercent}%` }} title={`Failed: ${failedCount} files`}>
              {failedPercent > 10 && `${Math.round(failedPercent)}%`}
            </div>
          )}
          {pendingCount > 0 && (
            <div className="progress-segment pending" style={{ width: `${pendingPercent}%` }} title={`Pending: ${pendingCount} files`}>
              {pendingPercent > 10 && `${Math.round(pendingPercent)}%`}
            </div>
          )}
        </div>
        
        <div className="progress-stats">
          <div className="stat-group">
            <div className="stat-item">
              <FiFile className="stat-icon processed" />
              <div className="stat-data">
                <div className="stat-label">Total Files</div>
                <div className="stat-value">{totalCount}</div>
              </div>
            </div>
            
            <div className="stat-item">
              <FiCheckCircle className="stat-icon processed" />
              <div className="stat-data">
                <div className="stat-label">Processed</div>
                <div className="stat-value">{processedCount}</div>
              </div>
            </div>
            
            {status.functionsProcessed !== undefined && (
              <div className="stat-item">
                <FiCode className="stat-icon" />
                <div className="stat-data">
                  <div className="stat-label">Functions</div>
                  <div className="stat-value">{status.functionsProcessed}</div>
                </div>
              </div>
            )}
            
            {status.componentsProcessed !== undefined && (
              <div className="stat-item">
                <FiCpu className="stat-icon" />
                <div className="stat-data">
                  <div className="stat-label">Components</div>
                  <div className="stat-value">{status.componentsProcessed}</div>
                </div>
              </div>
            )}
            
            {pendingCount > 0 && (
              <div className="stat-item">
                <FiLoader className="stat-icon pending" />
                <div className="stat-data">
                  <div className="stat-label">Pending</div>
                  <div className="stat-value">{pendingCount}</div>
                </div>
              </div>
            )}
            
            {failedCount > 0 && (
              <div className="stat-item">
                <FiAlertTriangle className="stat-icon failed" />
                <div className="stat-data">
                  <div className="stat-label">Failed</div>
                  <div className="stat-value">{failedCount}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {lastUpdated && (
          <div className="last-updated">
            <FiClock className="time-icon" />
            <span>Last updated: <time dateTime={lastUpdated}>{relativeTime}</time></span>
          </div>
        )}
      </div>
      
      {/* Incremental update information */}
      {(changedFilesCount > 0 || lastUpdateType) && (
        <div className="incremental-info">
          <div className="incremental-header">
            <FiGitBranch className="incremental-icon" />
            <h4>Update Information</h4>
          </div>
          
          <div className="incremental-details">
            {lastUpdateType && (
              <div className="incremental-item">
                <span className="item-label">Update Type:</span>
                <span className={`update-type ${lastUpdateType}`}>
                  {lastUpdateType === 'incremental' ? 'Incremental' : 
                   lastUpdateType === 'selective' ? 'Selective' : 'Full'}
                </span>
              </div>
            )}
            
            {changedFilesCount > 0 && (
              <div className="incremental-item">
                <span className="item-label">Changed Files:</span>
                <span className="item-value">{changedFilesCount}</span>
              </div>
            )}
            
            {lastUpdateTimestamp && (
              <div className="incremental-item">
                <span className="item-label">Timestamp:</span>
                <span className="item-value">{new Date(lastUpdateTimestamp).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Cache information if available */}
      {cacheInfo && (
        <div className="cache-info">
          <div className="cache-header">
            <FiDatabase className="cache-icon" />
            <h4>Vector Cache Information</h4>
          </div>
          
          <div className="cache-details">
            <div className="cache-item">
              <span className="item-label">Cached Functions:</span>
              <span className="item-value">{cacheInfo.cachedFunctions || 0}</span>
            </div>
            
            <div className="cache-item">
              <span className="item-label">Cache Size:</span>
              <span className="item-value">{cacheInfo.totalCacheSize ? `${(cacheInfo.totalCacheSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}</span>
            </div>
            
            {cacheInfo.cacheHitRate !== undefined && (
              <div className="cache-item">
                <span className="item-label">Cache Hit Rate:</span>
                <span className="item-value">{`${(cacheInfo.cacheHitRate * 100).toFixed(1)}%`}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Error message if any */}
      {status.errorMessage && (
        <div className="error-message">
          <FiAlertTriangle className="error-icon" />
          <div className="error-content">
            <h4>Error Details</h4>
            <p>{status.errorMessage}</p>
          </div>
        </div>
      )}
      
      {/* Let user re-trigger vectorization if needed */}
      {(status.state === 'completed' || status.state === 'completed_with_errors' || 
        status.status === 'completed' || status.status === 'completed_with_errors' ||
        status.status === 'failed' || status.status === 'error') && (
        <div className="revectorize-section">
          <p>Need to update your vectors? You can re-run the vectorization process:</p>
          <VectorizationTrigger 
            projectId={projectId} 
            onVectorizationStarted={onVectorizationStarted}
          />
        </div>
      )}
    </div>
  );
};

export default VectorizationStatus;