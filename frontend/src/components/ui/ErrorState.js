import React from 'react';
import PropTypes from 'prop-types';
import './ErrorState.css';

/**
 * Error State Component
 * 
 * A reusable component for displaying error messages and handling retries
 * in a consistent way across the application.
 * 
 * @component
 * @version 1.0.0
 */
export const metadata = {
  componentName: "ErrorState",
  description: "Reusable error display component",
  version: "1.0.0",
  author: "Code Beast Team",
  keywords: ["error", "ui", "message", "retry"]
};

const ErrorState = ({ 
  error, 
  title, 
  onRetry, 
  variant = 'inline',
  size = 'medium',
  style,
  className = '',
  children
}) => {
  // Extract error message from the error prop
  const errorMessage = typeof error === 'string' 
    ? error 
    : error instanceof Error
      ? error.message
      : 'An unknown error occurred';

  // Generate CSS classes based on props
  const classes = [
    'error-state',
    `error-${variant}`,
    `size-${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} data-testid="error-state">
      <div className="error-content">
        <div className="error-icon-container">
          <svg 
            className="error-icon" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        
        <div className="error-message-container">
          {title && <h4 className="error-title">{title}</h4>}
          <p className="error-message">{errorMessage}</p>
          
          {onRetry && (
            <button 
              className="retry-button" 
              onClick={onRetry}
              data-testid="error-retry-button"
            >
              Try Again
            </button>
          )}
          
          {children}
        </div>
      </div>
    </div>
  );
};

ErrorState.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Error),
    PropTypes.object
  ]),
  title: PropTypes.string,
  onRetry: PropTypes.func,
  variant: PropTypes.oneOf(['inline', 'card', 'page', 'toast']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  style: PropTypes.object,
  className: PropTypes.string,
  children: PropTypes.node
};

export default ErrorState; 