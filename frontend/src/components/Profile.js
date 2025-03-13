import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Profile.css';


// Component metadata for React 19
export const metadata = {
  componentName: "Profile",
  description: "Profile component",
};

function Profile() {
  const { user, isAuthenticated, loading: authLoading, updatePassword } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  
  // Fetch user profile data
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        if (user) {
          setProfileData(user);
          setFormData({
            email: user.email || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [isAuthenticated, authLoading, navigate, user]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Toggle edit mode
  const toggleEdit = () => {
    setEditing(prev => !prev);
    setError('');
    setSuccess('');
    
    // Reset form to current values if canceling edit
    if (editing) {
      setFormData({
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      
      // Update password if provided
      if (formData.newPassword) {
        const { error } = await updatePassword(formData.newPassword);
        
        if (error) throw error;
        
        setSuccess('Password updated successfully');
      }
      
      setEditing(false);
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }
  
  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>User Profile</h2>
        <button 
          className="edit-button"
          onClick={toggleEdit}
        >
          {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      {success && (
        <div className="success-message">{success}</div>
      )}
      
      <div className="profile-content">
        {editing ? (
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                disabled={true}
                readOnly
              />
              <p className="form-help">Email cannot be changed directly. Contact support for email changes.</p>
            </div>
            
            <div className="password-section">
              <h3>Change Password</h3>
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={toggleEdit}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="save-button"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-details">
            <div className="profile-field">
              <span className="field-label">Email:</span>
              <span className="field-value">{profileData?.email}</span>
            </div>
            
            <div className="profile-field">
              <span className="field-label">User ID:</span>
              <span className="field-value">{profileData?.id}</span>
            </div>
            
            <div className="profile-field">
              <span className="field-label">Email Verified:</span>
              <span className="field-value">
                {profileData?.email_confirmed_at ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="profile-field">
              <span className="field-label">Last Sign In:</span>
              <span className="field-value">
                {profileData?.last_sign_in_at 
                  ? new Date(profileData.last_sign_in_at).toLocaleString() 
                  : 'Never'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile; 