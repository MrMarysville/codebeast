const express = require('express');
const router = express.Router({ mergeParams: true });
const path = require('path');
const fs = require('fs-extra');
const { validateRequest } = require('../middleware/validationMiddleware');
const componentValidation = require('../validations/component.validation');
const { asyncHandler, ApiError } = require('../middleware/errorMiddleware');

/**
 * @route   GET /api/projects/:projectId/components
 * @desc    Get all components in a project
 * @access  Private
 */
router.get(
  '/', 
  validateRequest(componentValidation.getAllComponents),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { type, search, sort = 'name', order = 'asc' } = req.query;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }

    // Get the components based on file structure and analysis
    // In a real app, this would use more sophisticated analysis
    // For demo purposes, just identifying React components
    
    const components = [];
    
    // Helper function to recursively find component files
    const findComponents = async (dir, baseDir = '') => {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = path.join(baseDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          await findComponents(filePath, relativePath);
        } else {
          // Check if file is a likely component (React/Vue)
          const isReactComponent = /\.(jsx|tsx)$/.test(file) || 
                                  (/\.(js|ts)$/.test(file) && !file.includes('.test.') && !file.includes('.spec.'));
          
          if (isReactComponent) {
            try {
              const content = await fs.readFile(filePath, 'utf8');
              
              // Simple heuristic: if it contains React.Component, useState, or function Component
              const hasComponentPattern = 
                content.includes('React.Component') || 
                content.includes('useState') ||
                content.includes('class') && content.includes('extends') ||
                content.includes('function') && /function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g.test(content);
              
              if (hasComponentPattern) {
                // Extract component name from file
                const name = file.split('.')[0];
                const componentType = content.includes('class') && content.includes('extends') ? 'class' : 'functional';
                
                // Apply filters if provided
                if (type && componentType !== type) {
                  continue;
                }
                
                if (search && !name.toLowerCase().includes(search.toLowerCase())) {
                  continue;
                }
                
                components.push({
                  id: Buffer.from(relativePath).toString('base64'),
                  name,
                  path: relativePath,
                  type: componentType
                });
              }
            } catch (error) {
              console.error(`Error reading file ${filePath}:`, error);
            }
          }
        }
      }
    };
    
    await findComponents(projectDir);
    
    // Sort components
    if (sort === 'name') {
      components.sort((a, b) => {
        return order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
    }
    
    res.json({
      success: true,
      components
    });
  })
);

/**
 * @route   GET /api/projects/:projectId/components/:componentId
 * @desc    Get component details
 * @access  Private
 */
router.get(
  '/:componentId', 
  validateRequest(componentValidation.getComponentById),
  asyncHandler(async (req, res) => {
    const { projectId, componentId } = req.params;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }
    
    // Decode component path from base64
    const relativePath = Buffer.from(componentId, 'base64').toString();
    const componentPath = path.join(projectDir, relativePath);
    
    if (!fs.existsSync(componentPath)) {
      throw new ApiError('Component not found', 404);
    }
    
    const content = await fs.readFile(componentPath, 'utf8');
    const name = path.basename(relativePath).split('.')[0];
    
    // Analyze the component (basic version)
    const type = content.includes('class') && content.includes('extends') ? 'class' : 'functional';
    const hasState = content.includes('useState') || (type === 'class' && content.includes('this.state'));
    const usesPropTypes = content.includes('PropTypes') || content.includes('propTypes');
    
    // Extract props (basic regex approach)
    let props = [];
    if (type === 'functional') {
      const propsMatch = content.match(/function\s+[A-Z][A-Za-z0-9_]*\s*\(\s*\{([^}]*)\}/);
      if (propsMatch && propsMatch[1]) {
        props = propsMatch[1].split(',').map(p => p.trim()).filter(p => p);
      }
    }
    
    res.json({
      success: true,
      component: {
        id: componentId,
        name,
        path: relativePath,
        type,
        content,
        analysis: {
          hasState,
          usesPropTypes,
          props
        }
      }
    });
  })
);

/**
 * @route   POST /api/projects/:projectId/components
 * @desc    Create a new component
 * @access  Private
 */
router.post(
  '/',
  validateRequest(componentValidation.createComponent),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { name, description, type = 'ui', files = [] } = req.body;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }
    
    // Create a component ID
    const componentId = Buffer.from(`components/${name}`).toString('base64');
    
    // Create component directory
    const componentDir = path.join(projectDir, 'components');
    await fs.ensureDir(componentDir);
    
    // Create component file with template
    const componentFile = path.join(componentDir, `${name}.jsx`);
    
    // Check if component already exists
    if (fs.existsSync(componentFile)) {
      throw new ApiError('Component with this name already exists', 400);
    }
    
    // Create component template based on type
    let template = '';
    if (type === 'ui') {
      template = `import React from 'react';

/**
 * ${name} Component
 * ${description || ''}
 */
function ${name}(props) {
  return (
    <div className="${name.toLowerCase()}">
      {/* Component content */}
    </div>
  );
}

export default ${name};
`;
    } else {
      template = `/**
 * ${name} Component
 * ${description || ''}
 */
class ${name} {
  constructor() {
    // Initialize component
  }
  
  // Add methods here
}

export default ${name};
`;
    }
    
    // Write component file
    await fs.writeFile(componentFile, template);
    
    // Create component metadata
    const metadata = {
      id: componentId,
      name,
      description,
      type,
      files: [componentFile, ...files],
      createdAt: new Date().toISOString()
    };
    
    // Save metadata
    const metadataDir = path.join(componentDir, '.metadata');
    await fs.ensureDir(metadataDir);
    await fs.writeJson(path.join(metadataDir, `${name}.json`), metadata);
    
    res.status(201).json({
      success: true,
      component: metadata
    });
  })
);

/**
 * @route   PUT /api/projects/:projectId/components/:componentId
 * @desc    Update a component
 * @access  Private
 */
router.put(
  '/:componentId',
  validateRequest(componentValidation.updateComponent),
  asyncHandler(async (req, res) => {
    const { projectId, componentId } = req.params;
    const { name, description, type, files } = req.body;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }
    
    // Decode component path
    const relativePath = Buffer.from(componentId, 'base64').toString();
    const componentPath = path.join(projectDir, relativePath);
    
    if (!fs.existsSync(componentPath)) {
      throw new ApiError('Component not found', 404);
    }
    
    // Get component name
    const currentName = path.basename(relativePath).split('.')[0];
    
    // Update component metadata
    const metadataDir = path.join(projectDir, 'components', '.metadata');
    const metadataPath = path.join(metadataDir, `${currentName}.json`);
    
    let metadata = {};
    if (fs.existsSync(metadataPath)) {
      metadata = await fs.readJson(metadataPath);
    } else {
      metadata = {
        id: componentId,
        name: currentName,
        files: [componentPath],
        createdAt: new Date().toISOString()
      };
    }
    
    // Update metadata
    if (name) metadata.name = name;
    if (description !== undefined) metadata.description = description;
    if (type) metadata.type = type;
    if (files) metadata.files = files;
    
    metadata.updatedAt = new Date().toISOString();
    
    // Save updated metadata
    await fs.ensureDir(metadataDir);
    await fs.writeJson(metadataPath, metadata);
    
    res.json({
      success: true,
      component: metadata
    });
  })
);

/**
 * @route   DELETE /api/projects/:projectId/components/:componentId
 * @desc    Delete a component
 * @access  Private
 */
router.delete(
  '/:componentId',
  validateRequest(componentValidation.deleteComponent),
  asyncHandler(async (req, res) => {
    const { projectId, componentId } = req.params;
    
    // Check if project exists
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    if (!fs.existsSync(projectDir)) {
      throw new ApiError('Project not found', 404);
    }
    
    // Decode component path
    const relativePath = Buffer.from(componentId, 'base64').toString();
    const componentPath = path.join(projectDir, relativePath);
    
    if (!fs.existsSync(componentPath)) {
      throw new ApiError('Component not found', 404);
    }
    
    // Delete component file
    await fs.unlink(componentPath);
    
    // Delete metadata if exists
    const componentName = path.basename(relativePath).split('.')[0];
    const metadataPath = path.join(projectDir, 'components', '.metadata', `${componentName}.json`);
    
    if (fs.existsSync(metadataPath)) {
      await fs.unlink(metadataPath);
    }
    
    res.status(204).send();
  })
);

module.exports = router; 