import api from './api';
import { handleApiError } from '../utils/error';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

/**
 * VectorizationService provides methods to interact with the enhanced
 * vectorization API and manage the vectorization of project code.
 */
class VectorizationService {
  /**
   * Start a vectorization job for a project
   * 
   * @param {Object} options - Vectorization options
   * @param {string} options.projectPath - Path to the project
   * @param {string} [options.vectorizationMethod='enhanced'] - Method to use: 'simple', 'enhanced', or 'incremental'  
   * @param {Array<string>} [options.fileTypes] - Optional array of file extensions to include
   * @returns {Promise<Object>} - Job information with jobId
   */
  async startVectorization(options) {
    try {
      const response = await api.post('/vectorize/project', options);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to start vectorization');
    }
  }
  
  /**
   * Get the status of a vectorization job
   * 
   * @param {string} jobId - The job ID
   * @returns {Promise<Object>} - Current job status
   */
  async getJobStatus(jobId) {
    try {
      const response = await api.get(`/vectorize/status/${jobId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to get vectorization status');
    }
  }
  
  /**
   * Cancel a vectorization job
   * 
   * @param {string} jobId - The job ID to cancel
   * @returns {Promise<Object>} - Cancellation result
   */
  async cancelJob(jobId) {
    try {
      const response = await api.post(`/vectorize/cancel/${jobId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to cancel vectorization job');
    }
  }
  
  /**
   * Get statistics about all vectorization jobs
   * 
   * @returns {Promise<Object>} - Vectorization job statistics
   */
  async getVectorizationStats() {
    try {
      const response = await api.get('/vectorize/stats');
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to get vectorization statistics');
    }
  }
  
  /**
   * Get information about vectors for a project
   * 
   * @param {string} projectId - The project ID
   * @returns {Promise<Object>} - Vector information
   */
  async getVectorInfo(projectId) {
    try {
      const response = await api.get(`/vectorize/info/${projectId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to get vector information');
    }
  }
  
  /**
   * Poll for job status until completion or failure
   * 
   * @param {string} jobId - The job ID
   * @param {function} onStatusUpdate - Callback for status updates
   * @param {number} [interval=2000] - Polling interval in milliseconds
   * @param {number} [timeout=3600000] - Maximum polling time (1 hour default)
   * @returns {Promise<Object>} - Final job status
   */
  async pollJobStatus(jobId, onStatusUpdate, interval = 2000, timeout = 3600000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let pollTimer = null;
      
      const checkStatus = async () => {
        try {
          // Check if we've exceeded the timeout
          if (Date.now() - startTime > timeout) {
            clearTimeout(pollTimer);
            reject(new Error('Vectorization job polling timed out'));
            return;
          }
          
          const status = await this.getJobStatus(jobId);
          
          // Call the status update callback
          if (onStatusUpdate && typeof onStatusUpdate === 'function') {
            onStatusUpdate(status);
          }
          
          // Check if the job has completed or failed
          if (['completed', 'failed', 'cancelled'].includes(status.status)) {
            clearTimeout(pollTimer);
            resolve(status);
            return;
          }
          
          // Continue polling
          pollTimer = setTimeout(checkStatus, interval);
        } catch (error) {
          clearTimeout(pollTimer);
          reject(error);
        }
      };
      
      // Start polling
      checkStatus();
    });
  }

  /**
   * Get current status of the vectorization queue
   * 
   * @returns {Promise<Object>} Queue status information
   */
  async getQueueStatus() {
    try {
      const response = await axios.get(`${API_URL}/vectorize/queue`);
      return response.data;
    } catch (error) {
      console.error('Error fetching queue status:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch queue status');
    }
  }

  /**
   * Cancel a queued vectorization job
   * 
   * @param {string} jobId Job ID to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelQueuedJob(jobId) {
    try {
      const response = await axios.post(`${API_URL}/vectorize/queue/${jobId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling job:', error);
      throw new Error(error.response?.data?.message || 'Failed to cancel job');
    }
  }

  /**
   * Get estimated memory requirements for a project
   * 
   * @param {string} projectPath Path to the project
   * @param {Array<string>} fileTypes File types to include
   * @returns {Promise<Object>} Memory requirement estimates
   */
  async getMemoryRequirements(projectPath, fileTypes = []) {
    try {
      const response = await axios.post(`${API_URL}/vectorize/memory-estimate`, {
        projectPath,
        fileTypes
      });
      return response.data;
    } catch (error) {
      console.error('Error estimating memory requirements:', error);
      throw new Error(error.response?.data?.message || 'Failed to estimate memory requirements');
    }
  }
}

export default new VectorizationService(); 