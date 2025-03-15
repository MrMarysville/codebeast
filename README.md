# Code Visualization and Analysis Platform

A powerful web application for visualizing and analyzing codebases using vector embeddings and graph-based representations.

## Features

- **Project Management**: Create, update, and delete coding projects
- **File Management**: Upload individual files or entire codebases (ZIP)
- **Code Vectorization**: Convert code into vector embeddings for analysis
- **Vector Exploration**: Search and explore vector data
- **Function Call Graph**: Visualize function calls and relationships
- **Component Relationship Graph**: Explore component dependencies and interactions
- **2D and 3D Visualization**: Interactive graph visualizations with zoom, pan, and filtering

## Technology Stack

### Frontend
- React
- Material-UI
- React Router
- React Force Graph (2D/3D)
- React Toastify

### Backend
- Node.js
- Express
- Python (for code analysis)
- Vector database

## Recent Stability Improvements

### Vectorization Workflow Enhancements

We've significantly improved the vectorization workflow for processing folder codebases:

1. **Enhanced Job Tracking**: Long-running vectorization jobs now have robust status tracking, allowing for real-time progress updates.

2. **Job Management API**: New API endpoints to start, monitor, cancel, and retrieve information about vectorization jobs.
   - `/api/vectorize/project`: Start a new vectorization job
   - `/api/vectorize/status/:jobId`: Get current job status
   - `/api/vectorize/cancel/:jobId`: Cancel a running job
   - `/api/vectorize/stats`: Get statistics about all jobs
   - `/api/vectorize/info/:projectId`: Get information about vectors for a project

3. **Performance Optimizations**:
   - Better handling of large codebases with many files
   - Progress monitoring with detailed metrics
   - File type filtering for targeted vectorization

4. **Improved Error Handling**:
   - Graceful cancellation of running jobs
   - Detailed error reporting
   - Automatic cleanup of temporary files

5. **Frontend Integration**:
   - New `VectorizationService` for easy integration with the frontend
   - Polling mechanism for real-time status updates
   - Enhanced UI feedback during vectorization 

### Memory Optimization for Large Codebases
- Added adaptive batch processing for vectorizing large codebases
- Implemented memory profiling to monitor and optimize resource usage
- Dynamic batch size adjustment based on available system memory
- Automatic fallback to memory-optimized mode when high memory usage is detected
- Detailed memory metrics collection for performance analysis
- Support for taking heap snapshots to diagnose memory issues

### Enhanced UI for Vectorization
- Added a new user-friendly interface for starting and monitoring vectorization jobs
- Real-time progress updates with detailed status information
- Support for choosing vectorization method based on project size
- File type filtering to target specific languages in your codebase
- Memory optimization controls with smart defaults

### Improved Error Handling
- Automatic retry functionality for failed vectorization jobs
- Customizable retry limits with exponential backoff
- Detailed error logging and diagnostics
- Graceful shutdown with proper cleanup of resources

### Other Stability Improvements

1. **Consolidated Routes**: Addressed duplicate route definitions to prevent conflicts.

2. **Component Fixes**: Resolved ESLint warnings and React Hook dependency issues in `FunctionGraph.js` and `ComponentRelationshipGraph.js`.

3. **Syntax Checking**: Introduced a syntax checking tool with the command `npm run check:syntax` to ensure JavaScript files are error-free.

4. **Robust Application Launcher**: Added multiple ways to start the application reliably:
   - `npm run start:robust` - Improved startup process with better error handling
   - `./start.sh` - Unix/Linux/Mac shell script
   - `start.bat` - Windows batch file

5. **Enhanced Logging**: Comprehensive logging system with dedicated log files for different aspects of the application.

6. **Graceful Shutdown**: Proper handling of application shutdown to prevent data loss and connection issues.

7. **Python Integration Improvements**: Better detection and handling of Python availability with mock responses when Python is not available.

## New Features

### Processing Queue System

Our application now includes a robust processing queue system for vectorization tasks, which provides:

- **Memory-aware task scheduling**: Tasks are scheduled based on available system memory to prevent crashes
- **Priority-based ordering**: Higher priority tasks are processed first
- **Automatic retry mechanism**: Failed jobs can be automatically retried with configurable attempts
- **Graceful cancellation**: Users can cancel queued jobs that haven't started processing
- **Detailed status monitoring**: Real-time feedback on queue status and job progress

#### Queue Management API Endpoints

- `GET /api/vectorize/queue` - Get current status of the processing queue
- `POST /api/vectorize/queue/:jobId/cancel` - Cancel a queued job
- `GET /api/vectorize/job/:jobId` - Get status of a specific job

#### Frontend Integration

The processing queue is integrated into the frontend with:

- Queue status monitoring in the vectorization UI
- Ability to cancel queued jobs
- Visual feedback on job priority and position in queue
- Memory usage estimates before job submission

### Memory Optimization

To handle large codebases efficiently, we've implemented:

- **Memory usage profiling**: Real-time monitoring and logging of memory consumption
- **Intelligent batching**: Breaking down large projects into smaller batches for processing
- **Adaptive processing**: Switching to memory-optimized mode when memory pressure is detected
- **Memory recovery techniques**: Proactive steps to recover memory when usage exceeds thresholds

## Getting Started

### Prerequisites
- Node.js (v14+)
- Python (v3.6+)
- npm or yarn

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/code-visualization-platform.git
cd code-visualization-platform
```

2. Install backend dependencies
```
cd backend
npm install
```

3. Install frontend dependencies
```
cd ../frontend
npm install
```

### Running the Application

1. Start the backend server
```
cd backend
npm start
```

2. Start the frontend development server
```
cd ../frontend
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Create a new project from the dashboard
2. Upload your codebase (individual files or ZIP)
3. Start the vectorization process
4. Explore the vector data and visualizations

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [React Force Graph](https://github.com/vasturiano/react-force-graph) for the graph visualizations
- [Material-UI](https://mui.com/) for the UI components

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start the application:
   ```bash
   npm run start:robust
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001/api 