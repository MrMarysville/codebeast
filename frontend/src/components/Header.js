import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Header.css';

// Import icons from react-icons
import { FiCode, FiUser, FiLogOut, FiSettings, FiMenu, FiX } from 'react-icons/fi';


// Component metadata for React 19
export const metadata = {
  componentName: "Header",
  description: "Header component",
};

const Header = () => {
  const { user, signOut } = useAuth();
  const isAuthenticated = !!user;
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate('/login');
    setUserMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  return (
    <header className={`header ${menuOpen ? 'mobile-open' : ''}`}>
      <div className="header-container">
        <div className="logo-container">
          <Link to="/" className="logo">
            <FiCode />
            <div className="logo-text">
              <span>CodeBeast</span>
              <span>AI-Powered Development</span>
            </div>
          </Link>
        </div>

        <nav className="nav-links">
          {isAuthenticated && (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/projects" className="nav-link">Projects</Link>
              <Link to="/docs" className="nav-link">Documentation</Link>
              <Link to="/community" className="nav-link">Community</Link>
            </>
          )}
        </nav>

        <div className="auth-buttons">
          {isAuthenticated ? (
            <div className="user-dropdown">
              <button className="user-menu-button" onClick={toggleUserMenu}>
                <div className="user-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="user-name">{user.name || 'User'}</span>
              </button>
              
              <div className={`user-menu ${userMenuOpen ? 'open' : ''}`}>
                <div className="user-menu-header">
                  <div className="user-name">{user.name || 'User'}</div>
                  <div className="user-email">{user.email}</div>
                </div>
                
                <div className="user-menu-items">
                  <Link to="/profile" className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                    <FiUser className="user-menu-icon" />
                    Profile
                  </Link>
                  <Link to="/settings" className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                    <FiSettings className="user-menu-icon" />
                    Settings
                  </Link>
                  <button onClick={handleLogout} className="user-menu-item danger">
                    <FiLogOut className="user-menu-icon" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>

        <button className="mobile-menu-button" onClick={toggleMobileMenu}>
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </header>
  );
};

export default Header; 