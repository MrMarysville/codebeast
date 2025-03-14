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