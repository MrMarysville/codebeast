/**
 * Script to check for syntax errors in all JavaScript files in the backend directory
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Root directory
const backendDir = path.join(__dirname, 'backend');

console.log('Checking for syntax errors in backend files...');

// Recursively find all JavaScript files
function findJsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip node_modules
    if (entry.name === 'node_modules') continue;
    
    if (entry.isDirectory()) {
      findJsFiles(fullPath, files);
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const jsFiles = findJsFiles(backendDir);
console.log(`Found ${jsFiles.length} JavaScript files to check`);

let hasErrors = false;

// Check each file for syntax errors
jsFiles.forEach(file => {
  try {
    const relativePath = path.relative(__dirname, file);
    process.stdout.write(`Checking ${relativePath}... `);
    
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    
    console.log('OK');
  } catch (error) {
    hasErrors = true;
    console.log('ERROR');
    console.error(`Syntax error in ${file}:`);
    console.error(error.stderr.toString());
    console.log();
  }
});

if (hasErrors) {
  console.error('\nFailed! Syntax errors were found.');
  process.exit(1);
} else {
  console.log('\nSuccess! No syntax errors found.');
} 