import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header';
import StatusBar from './components/StatusBar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PrivateRoute from './components/Auth/PrivateRoute';
import ProjectDashboard from './components/Dashboard/ProjectDashboard';
import ProjectWorkspace from './components/ProjectWorkspace';
import Profile from './components/Profile';
import NotFound from './components/NotFound';
import UIDemo from './pages/UIDemo';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { checkSystemStatus, notifyPythonStatus } from './utils/systemUtils';
import './styles/App.css';

function App() {
  // Check system status on app load
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkSystemStatus();
      // Show warning if Python is not available
      notifyPythonStatus(status.pythonAvailable, toast.warn);
    };
    
    checkStatus();
  }, []);

  return (
    <AuthProvider>
      <ProjectProvider>
        <Router>
          <div className="app">
            <Header />
            
            <div className="app-content">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/ui-demo" element={<UIDemo />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <PrivateRoute>
                    <ProjectDashboard />
                  </PrivateRoute>
                } />
                
                <Route path="/project/:projectId" element={
                  <PrivateRoute>
                    <ProjectWorkspace />
                  </PrivateRoute>
                } />
                
                <Route path="/profile" element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                } />
                
                {/* Redirect to dashboard if authenticated, otherwise to login */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            
            <StatusBar />
            
            {/* Toast notifications */}
            <ToastContainer 
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
        </Router>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App; 