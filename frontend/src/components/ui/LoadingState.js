import React from 'react';
import PropTypes from 'prop-types';
import './LoadingState.css';

/**
 * Reusable loading state component with various display modes
 * 
 * @param {Object} props - Component props
 * @param {string} props.type - Loading type: 'spinner', 'skeleton', 'progress'
 * @param {string} props.size - Size: 'small', 'medium', 'large'
 * @param {string} props.message - Optional message to display
 * @param {number} props.progress - Progress value (0-100) for progress bar
 * @param {string} props.overlay - Whether to display as overlay: 'none', 'container', 'fullscreen'
 * @param {string} props.position - Position: 'center', 'top', 'inline'
 * @param {Object} props.style - Additional styles
 */
const LoadingState = ({ 
  type = 'spinner',
  size = 'medium',
  message,
  progress = 0,
  overlay = 'none',
  position = 'center',
  children,
  style = {},
  className = ''
}) => {
  // Determine CSS classes
  const classes = [
    'loading-state',
    `loading-${type}`,
    `size-${size}`,
    `position-${position}`,
    overlay !== 'none' ? `overlay-${overlay}` : '',
    className
  ].filter(Boolean).join(' ');
  
  // Render appropriate loading indicator
  const renderLoadingIndicator = () => {
    switch (type) {
      case 'spinner':
        return (
          <div className="spinner-container">
            <div className="spinner"></div>
            {message && <div className="loading-message">{message}</div>}
          </div>
        );
        
      case 'skeleton':
        return (
          <div className="skeleton-container">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-line"></div>
            ))}
            {message && <div className="loading-message">{message}</div>}
          </div>
        );
        
      case 'progress':
        return (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              ></div>
            </div>
            {message && <div className="loading-message">{message}</div>}
            {progress > 0 && (
              <div className="progress-percentage">{Math.round(progress)}%</div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className={classes} style={style} data-testid="loading-state">
      {renderLoadingIndicator()}
      {children}
    </div>
  );
};

LoadingState.propTypes = {
  type: PropTypes.oneOf(['spinner', 'skeleton', 'progress']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  message: PropTypes.string,
  progress: PropTypes.number,
  overlay: PropTypes.oneOf(['none', 'container', 'fullscreen']),
  position: PropTypes.oneOf(['center', 'top', 'inline']),
  children: PropTypes.node,
  style: PropTypes.object,
  className: PropTypes.string
};

export default LoadingState; 