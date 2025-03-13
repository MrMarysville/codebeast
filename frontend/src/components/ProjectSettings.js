import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/ProjectSettings.css';


// Component metadata for React 19
export const metadata = {
  componentName: "ProjectSettings",
  description: "ProjectSettings component",
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

function ProjectSettings({ projectId, onClose, onUpdate }) {
  const [project, setProject] = useState({ name: '', description: '' });
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Fetch project details - memoized with useCallback
  const fetchProjectDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${BACKEND_URL}/api/projects/${projectId}`);
      
      if (response.data) {
        setProject(response.data);
        setFormData({
          name: response.data.name || '',
          description: response.data.description || ''
        });
      }
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  
  // Fetch project details on mount
  useEffect(() => {
    fetchProjectDetails();
  }, [projectId, fetchProjectDetails]);
  
  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Send update request
      const response = await axios.put(
        `${BACKEND_URL}/api/project/${projectId}`,
        {
          name: formData.name.trim(),
          description: formData.description.trim()
        }
      );
      
      // Show success message
      setSuccess('Project settings updated successfully');
      
      // Notify parent component
      if (onUpdate) {
        onUpdate(response.data.project);
      }
      
      // Dispatch status change event for the StatusBar
      window.dispatchEvent(new CustomEvent('status-change', { 
        detail: { 
          status: 'success', 
          message: 'Project settings updated successfully',
          type: 'success'
        } 
      }));
      
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err.response?.data?.message || 'Failed to update project settings');
      
      // Dispatch error event for the StatusBar
      window.dispatchEvent(new CustomEvent('status-change', { 
        detail: { 
          status: 'error', 
          message: 'Failed to update project settings',
          type: 'error'
        } 
      }));
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading project settings...</p>
      </div>
    );
  }
  
  return (
    <div className="project-settings">
      <div className="settings-header">
        <h2>Project Settings</h2>
        <button 
          className="close-settings-btn"
          onClick={onClose}
        >
          &times;
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-name">Project Name*</label>
          <input
            type="text"
            id="project-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter project name"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="project-description">Description</label>
          <textarea
            id="project-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter project description"
            rows={4}
          />
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="spinner-small"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectSettings; 