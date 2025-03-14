import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { checkSystemStatus } from './utils/systemUtils';
import Header from './components/Header';
import StatusBar from './components/StatusBar';
import ProjectList from './components/Dashboard/ProjectList';
import ProjectWorkspace from './components/ProjectWorkspace';
import ProjectUploader from './components/ProjectUploader';
import VectorExplorer from './components/VectorExplorer';
import VectorizationStatus from './components/VectorizationStatus';
import FunctionGraph from './components/FunctionGraph.fixed';
import ComponentRelationshipGraph from './components/ComponentRelationshipGraph.fixed';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const [status, setStatus] = useState({ server: 'checking', pythonAvailable: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check system status on mount
    const fetchSystemStatus = async () => {
      try {
        setLoading(true);
        const statusData = await checkSystemStatus();
        setStatus(statusData);
        
        // Show toast if Python is not available
        if (!statusData.pythonAvailable) {
          toast.warning('Python is not available. Some features may not work properly.', {
            autoClose: 10000,
            closeButton: true,
            closeOnClick: true,
          });
        }
      } catch (error) {
        console.error('Error checking system status:', error);
        setStatus({ server: 'error', pythonAvailable: false });
        toast.error('Failed to connect to the server. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStatus();
  }, []);

  return (
    <Router>
      <div className="App">
        <Header status={status} />
        <main className="App-main">
          <Routes>
            <Route path="/" element={<ProjectList />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:projectId" element={<ProjectWorkspace />} />
            <Route path="/projects/:projectId/upload" element={<ProjectUploader />} />
            <Route path="/projects/:projectId/vectors" element={<VectorExplorer />} />
            <Route path="/projects/:projectId/vectorization" element={<VectorizationStatus />} />
            <Route path="/projects/:projectId/function-graph" element={<FunctionGraph />} />
            <Route path="/projects/:projectId/component-graph" element={<ComponentRelationshipGraph />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <StatusBar status={status} />
        <ToastContainer position="bottom-right" />
      </div>
    </Router>
  );
}

export default App; 