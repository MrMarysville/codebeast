/**
 * Simplified setup script
 * No Python dependencies required
 */
const fs = require('fs');
const path = require('path');

console.log('\n🔧 Simple project setup...\n');

// Check Node.js version
console.log(`Node.js version: ${process.version}`);

// Create directories
ensureDirectoriesExist();

// Create environment files
createEnvironmentFiles();

console.log('\n✅ Setup complete!');
console.log('\nTo start the application:');
console.log('1. Install dependencies: npm run install-all');
console.log('2. Start backend: npm run backend');
console.log('3. Start frontend: npm run frontend (in a new terminal)');

/**
 * Make sure required directories exist
 */
function ensureDirectoriesExist() {
  console.log('\nEnsuring directories exist...');
  
  const dirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'frontend', 'build')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${path.relative(__dirname, dir)}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Create environment files if they don't exist
 */
function createEnvironmentFiles() {
  console.log('\nCreating environment files...');
  
  // Backend .env
  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  if (!fs.existsSync(backendEnvPath)) {
    console.log('Creating backend .env');
    const backendEnv = `PORT=5001
JWT_SECRET=your-jwt-secret-${Math.random().toString(36).substring(2, 15)}
UPLOADS_DIR=../uploads
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
`;
    fs.writeFileSync(backendEnvPath, backendEnv);
  }
  
  // Frontend .env
  const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
  if (!fs.existsSync(frontendEnvPath)) {
    console.log('Creating frontend .env');
    const frontendEnv = `REACT_APP_BACKEND_URL=http://localhost:5001/api
`;
    fs.writeFileSync(frontendEnvPath, frontendEnv);
  }
}