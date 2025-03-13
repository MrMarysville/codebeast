const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../utils/supabase');

// Create a new project
exports.createProject = async (req, res) => {
  try {
    const { name = 'New Project', description = `Project created on ${new Date().toLocaleDateString()}` } = req.body;
    const projectId = uuidv4();
    
    // Create project in Supabase
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        id: projectId,
        name,
        description,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Create project directory
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    await fs.ensureDir(projectDir);

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Get project by ID
exports.getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;

    const { data, error } = await supabase
      .from('projects')
      .update({
        name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Delete from Supabase
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    // Delete project directory
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    await fs.remove(projectDir);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// Start vectorization
exports.startVectorization = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Update project status
    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update({ status: 'processing' })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create status file
    const projectDir = path.join(process.env.UPLOADS_DIR || './uploads', projectId);
    const statusFile = path.join(projectDir, '.vectorization_status.json');
    
    await fs.writeJson(statusFile, {
      status: 'processing',
      startTime: new Date().toISOString(),
      progress: 0,
      totalFiles: 0,
      processedFiles: 0
    });

    res.json({ message: 'Vectorization started', status: 'processing' });
  } catch (error) {
    console.error('Error starting vectorization:', error);
    res.status(500).json({ error: 'Failed to start vectorization' });
  }
}; 