import axios from 'axios';

// Create an API base URL from environment variable or default to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get token from local storage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle unauthorized errors (401)
    if (error.response && error.response.status === 401) {
      // Redirect to login page if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// API Functions

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/api/v2/auth/login', credentials),
  register: (userData) => api.post('/api/v2/auth/register', userData),
  getCurrentUser: () => api.get('/api/v2/auth/me'),
  logout: () => api.post('/api/v2/auth/logout'),
};

// Project endpoints
export const projectAPI = {
  getAllProjects: () => api.get('/api/projects'),
  getProjectById: (projectId) => api.get(`/api/projects/${projectId}`),
  createProject: (projectData) => api.post('/api/v2/project', projectData),
  updateProject: (projectId, projectData) => api.put(`/api/v2/project/${projectId}`, projectData),
  deleteProject: (projectId) => api.delete(`/api/v2/project/${projectId}`),
  
  // Project file operations
  getProjectFiles: (projectId) => api.get(`/api/projects/${projectId}/files`),
  getFileContent: (projectId, filePath) => api.get(`/api/projects/${projectId}/file/${filePath}`),
  updateFileContent: (projectId, filePath, content) => 
    api.put(`/api/v2/project/${projectId}/files/${filePath}`, { content }),
  deleteFile: (projectId, filePath) => api.delete(`/api/v2/project/${projectId}/files/${filePath}`),
  
  // Project analysis
  analyzeProject: (projectId) => api.post(`/api/v2/project/${projectId}/analyze`),
  getProjectAnalysis: (projectId) => api.get(`/api/v2/project/${projectId}/analysis`),
  
  // Vectorization
  startVectorization: (projectId) => api.post(`/api/projects/${projectId}/vectorize`),
  getVectorizationStatus: (projectId) => api.get(`/api/projects/${projectId}/vectors/status`),
  getVectorData: (projectId) => api.get(`/api/projects/${projectId}/vectors/data`),
  getVectorLanguages: (projectId) => api.get(`/api/projects/${projectId}/vectors/languages`),
};

// File upload endpoints
export const fileAPI = {
  uploadFile: (projectId, formData, filePath) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    
    if (filePath) {
      return api.post(`/api/v2/file/upload/${projectId}?filePath=${encodeURIComponent(filePath)}`, formData, config);
    }
    
    return api.post(`/api/v2/file/upload/${projectId}`, formData, config);
  },
  
  uploadZip: (projectId, formData, extractPath) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    
    if (extractPath) {
      return api.post(`/api/v2/file/upload-zip/${projectId}?extractPath=${encodeURIComponent(extractPath)}`, formData, config);
    }
    
    return api.post(`/api/v2/file/upload-zip/${projectId}`, formData, config);
  },
  
  downloadFile: (projectId, filePath) => {
    return api.get(`/api/v2/file/download/${projectId}/${filePath}`, {
      responseType: 'blob',
    });
  },
  
  createDirectory: (projectId, dirPath) => {
    return api.post(`/api/v2/file/mkdir/${projectId}`, { dirPath });
  },
};

// Feature endpoints
export const featureAPI = {
  getAllFeatures: () => api.get('/api/v2/features'),
  getFeatureById: (featureId) => api.get(`/api/v2/features/${featureId}`),
};

// Vector endpoints
export const vectorAPI = {
  getVectorStatus: () => api.get('/api/v2/vectors/status'),
  getAvailableLanguages: () => api.get('/api/v2/vectors/languages'),
  getCacheInfo: () => api.get('/api/v2/vectors/cache'),
  clearCache: () => api.delete('/api/v2/vectors/cache'),
};

// System endpoints
export const systemAPI = {
  getSystemStatus: () => api.get('/api/system/status'),
  getHealth: () => api.get('/health'),
};

// Export the axios instance as default
export default api; 