import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        setLoading(true);
        const data = await authAPI.getCurrentUser();
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        // Not setting current user if there's an error
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const data = await authAPI.login({ email, password });
      if (data && data.user) {
        setCurrentUser(data.user);
        toast.success('Login successful');
        navigate('/projects');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    try {
      setLoading(true);
      const data = await authAPI.register({ name, email, password });
      if (data && data.user) {
        setCurrentUser(data.user);
        toast.success('Registration successful');
        navigate('/projects');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authAPI.logout();
      setCurrentUser(null);
      toast.success('Logout successful');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(error.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 