import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import '../styles/StatusBar.css';
import { Box, Typography, Tooltip } from '@mui/material';
import { formatDate } from '../utils/systemUtils';


// Component metadata for React 19
export const metadata = {
  componentName: "StatusBar",
  description: "StatusBar component",
};

const STATUS_MESSAGES = {
  connecting: 'Connecting to server...',
  connected: 'Connected',
  disconnected: 'Disconnected',
  processing: 'Processing...',
  applying: 'Applying changes...',
  adjusting: 'Adjusting UI...',
  error: 'Error'
};

const StatusBar = ({ status }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title={status.server === 'running' ? 'Server is running' : 'Server is not running'}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: status.server === 'running' ? 'success.main' : 'error.main',
              mr: 1,
            }}
          />
        </Tooltip>
        <Typography variant="body2" sx={{ mr: 2 }}>
          Server: {status.server}
        </Typography>

        <Tooltip title={status.pythonAvailable ? 'Python is available' : 'Python is not available'}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: status.pythonAvailable ? 'success.main' : 'error.main',
              mr: 1,
            }}
          />
        </Tooltip>
        <Typography variant="body2">
          Python: {status.pythonAvailable ? 'Available' : 'Not Available'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="body2" color="text.secondary">
          Last Updated: {status.timestamp ? formatDate(status.timestamp) : 'N/A'}
        </Typography>
      </Box>
    </Box>
  );
};

StatusBar.propTypes = {
  status: PropTypes.object.isRequired,
};

export default StatusBar; 