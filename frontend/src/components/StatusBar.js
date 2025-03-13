import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import '../styles/StatusBar.css';


// Component metadata for React 19
export const metadata = {
  componentName: "StatusBar",
  description: "StatusBar component",
};

const STATUS_MESSAGES = {
  connecting: 'Connecting to server...',
  connected: 'Connected',
  disconnected: 'Disconnected',
  processing: 'Processing...',
  applying: 'Applying changes...',
  adjusting: 'Adjusting UI...',
  error: 'Error'
};

function StatusBar({ status, projectId, onBackToDashboard }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const statusRef = useRef(status);
  
  // Update ref when prop changes
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  // Listen for status changes from other components
  useEffect(() => {
    const handleStatusChange = (event) => {
      if (event.detail) {
        if (event.detail.status) {
          statusRef.current = event.detail.status;
        }
        
        if (event.detail.message) {
          // Add to notifications
          const newNotification = {
            id: Date.now(),
            type: event.detail.type || 'info',
            message: event.detail.message,
            timestamp: new Date()
          };
          
          setNotifications(prev => [newNotification, ...prev].slice(0, 10)); // Keep only 10 most recent
        }
      }
    };
    
    // Listen for custom events
    window.addEventListener('app-status', handleStatusChange);
    
    return () => {
      window.removeEventListener('app-status', handleStatusChange);
    };
  }, []);
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Toggle notifications panel
  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };
  
  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };
  
  // Determine status class
  const getStatusClass = () => {
    switch (statusRef.current) {
      case 'connected':
        return 'connected';
      case 'disconnected':
      case 'error':
        return 'disconnected';
      case 'processing':
      case 'applying':
      case 'adjusting':
        return 'processing';
      default:
        return '';
    }
  };
  
  return (
    <div className="status-bar">
      <div className="status">
        <div className={`status-indicator ${getStatusClass()}`} />
        <span className="status-text">
          {STATUS_MESSAGES[statusRef.current] || 'Unknown status'}
        </span>
      </div>
      <div className="status-actions">
        <button 
          className="action-button" 
          onClick={onBackToDashboard}
          title="Return to Dashboard"
        >
          Dashboard
        </button>
        {projectId && (
          <span className="project-id" title="Project ID">
            ID: {projectId}
          </span>
        )}
      </div>
      
      <div className="notifications-wrapper">
        <button 
          className="notifications-button"
          onClick={toggleNotifications}
        >
          <span className="notifications-icon">��</span>
          {notifications.length > 0 && (
            <span className="notifications-badge">{notifications.length}</span>
          )}
        </button>
        
        {showNotifications && (
          <div className="notifications-panel">
            <div className="notifications-header">
              <h3>Notifications</h3>
              <button
                className="clear-notifications-button"
                onClick={clearNotifications}
                disabled={notifications.length === 0}
              >
                Clear All
              </button>
            </div>
            
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  No notifications
                </div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${notification.type}`}
                  >
                    <div className="notification-content">
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      <div className="notification-time">
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="app-version">
        v1.0.0
      </div>
    </div>
  );
}

StatusBar.propTypes = {
  status: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired,
  onBackToDashboard: PropTypes.func.isRequired
};

export default StatusBar; 