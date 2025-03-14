import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Home as HomeIcon, 
  Code as CodeIcon, 
  Settings as SettingsIcon,
  GitHub as GitHubIcon
} from '@mui/icons-material';

// Import icons from react-icons
import { FiCode, FiUser, FiLogOut, FiSettings, FiMenu, FiX } from 'react-icons/fi';

// Component metadata for React 19
export const metadata = {
  componentName: "Header",
  description: "Header component",
};

const Header = ({ status }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Projects', icon: <CodeIcon />, path: '/projects' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            component={Link} 
            to={item.path}
            selected={isActive(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
            Zak's Code Beast
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={`Server: ${status.server}, Python: ${status.pythonAvailable ? 'Available' : 'Not Available'}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: status.server === 'running' ? 'success.main' : 'error.main',
                    mr: 1
                  }}
                />
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: status.pythonAvailable ? 'success.main' : 'error.main'
                  }}
                />
              </Box>
            </Tooltip>
            
            {!isMobile && menuItems.map((item) => (
              <Button 
                key={item.text}
                color="inherit" 
                component={Link} 
                to={item.path}
                startIcon={item.icon}
                sx={{ 
                  mx: 1,
                  fontWeight: isActive(item.path) ? 'bold' : 'normal',
                  borderBottom: isActive(item.path) ? '2px solid white' : 'none'
                }}
              >
                {item.text}
              </Button>
            ))}
            
            <Tooltip title="View on GitHub">
              <IconButton
                color="inherit"
                component="a"
                href="https://github.com/yourusername/zaks-code-beast"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Header; 