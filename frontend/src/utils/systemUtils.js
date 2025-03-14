import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * Check the system status
 * @returns {Promise<Object>} System status information
 */
export const checkSystemStatus = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/system/status`);
    return response.data;
  } catch (error) {
    console.error('Error checking system status:', error);
    return {
      server: 'error',
      pythonAvailable: false,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

/**
 * Notify the user about Python availability
 * @param {boolean} available Whether Python is available
 * @param {Function} toastFn Toast function to use
 */
export const notifyPythonStatus = (available, toastFn) => {
  if (!available && typeof toastFn === 'function') {
    toastFn(
      'Python is not available. Some features may not work properly.',
      {
        autoClose: 10000,
        closeButton: true,
        closeOnClick: true,
      }
    );
  }
};

/**
 * Format a date string
 * @param {string} dateString Date string to format
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format file size to human-readable format
 * @param {number} bytes File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file extension from path
 * 
 * @param {string} path File path
 * @returns {string} File extension
 */
export const getFileExtension = (path) => {
  if (!path) return '';
  
  const parts = path.split('.');
  if (parts.length <= 1) return '';
  
  return parts.pop().toLowerCase();
};

/**
 * Get file icon based on file extension
 * 
 * @param {string} extension File extension
 * @returns {string} Icon name
 */
export const getFileIcon = (extension) => {
  const iconMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'css': 'css',
    'scss': 'css',
    'sass': 'css',
    'json': 'json',
    'md': 'markdown',
    'txt': 'text',
    'pdf': 'pdf',
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'svg': 'image',
    'zip': 'archive',
    'tar': 'archive',
    'gz': 'archive',
    'rar': 'archive'
  };
  
  return iconMap[extension] || 'document';
};

const systemUtils = {
  checkSystemStatus,
  notifyPythonStatus,
  formatFileSize,
  formatDate,
  getFileExtension,
  getFileIcon
};

export default systemUtils; 