/**
 * Mock Python Runner Module
 * 
 * This module simulates Python script functionality without requiring actual Python
 * to be installed. It maintains the same API interfaces so the application can
 * continue to function without Python dependencies.
 */
const os = require('os');

/**
 * Get the appropriate Python command based on the operating system
 * @returns {string} - The Python command to use
 */
const getPythonCommand = () => {
  console.log('Getting Python command for the current environment');
  // On Windows, prefer 'py', on other platforms use 'python'
  const isWindows = os.platform() === 'win32';
  return process.env.PYTHON_PATH || (isWindows ? 'py' : 'python');
};

/**
 * Mock Python dependency check - always returns success
 * @param {Array} requiredPackages - List of required Python packages
 * @returns {Promise<Object>} - Mock results of the dependency check
 */
const checkPythonDependencies = async (requiredPackages = ['numpy', 'scikit-learn', 'pandas']) => {
  console.log('Mock Python dependency check (Python not required)');
  
  // Generate a mock response that indicates all dependencies are available
  const dependencies = {};
  requiredPackages.forEach(pkg => {
    dependencies[pkg] = { 
      installed: true, 
      version: '0.0.0-mock' 
    };
  });
  
  return {
    success: true,
    dependencies
  };
};

/**
 * Mock Python script runner - returns simulated results without running Python
 * @param {string} scriptName - The name of the Python script that would have been run
 * @param {Array} args - The arguments that would have been passed to the Python script
 * @returns {Promise<object>} - Simulated results based on the script name
 */
const runPythonScript = async (scriptName, args = []) => {
  console.log(`Mock Python runner called for: ${scriptName} with args: ${args.join(' ')}`);
  
  // Determine which mock response to return based on the script name
  switch (scriptName) {
    case 'vectorize.py':
    case 'simple_vector.py':
    case 'enhanced_vectorize.py':
    case 'incremental_vectorize.py':
      return {
        success: true,
        files_processed: 15,
        vectors_created: 120,
        languages_detected: ['javascript', 'typescript', 'jsx', 'css', 'html'],
        message: '[Mock] Vectorization completed successfully'
      };
      
    case 'process_feature.py':
      return {
        success: true,
        feature_processed: true,
        message: '[Mock] Feature processed successfully'
      };
      
    case 'get_vector_info.py':
      return {
        success: true,
        total_vectors: 120,
        languages: {
          javascript: 65,
          typescript: 30,
          jsx: 15,
          css: 5,
          html: 5
        },
        message: '[Mock] Vector information retrieved successfully'
      };
      
    case 'generate_vector_cache_stats.py':
      return {
        success: true,
        cache_size: 1024000,
        efficiency: 85,
        hit_rate: 92,
        languages: {
          javascript: { vectors: 65, bytes: 520000 },
          typescript: { vectors: 30, bytes: 240000 },
          jsx: { vectors: 15, bytes: 120000 },
          css: { vectors: 5, bytes: 40000 },
          html: { vectors: 5, bytes: 40000 }
        },
        message: '[Mock] Vector cache statistics generated successfully'
      };
      
    case 'delta_encoding.py':
      return {
        success: true,
        encoded: true,
        compression_ratio: 0.65,
        message: '[Mock] Delta encoding completed successfully'
      };
      
    case 'apply_changes.py':
      return {
        success: true,
        changes_applied: 8,
        message: '[Mock] Changes applied successfully'
      };
      
    case 'adjust_ui.py':
      return {
        success: true,
        components_adjusted: 5,
        message: '[Mock] UI adjustments completed successfully'
      };
      
    default:
      console.warn(`Unknown Python script: ${scriptName} - returning generic success response`);
      return {
        success: true,
        message: `[Mock] Script ${scriptName} executed successfully`
      };
  }
};

module.exports = {
  runPythonScript,
  getPythonCommand,
  checkPythonDependencies
};