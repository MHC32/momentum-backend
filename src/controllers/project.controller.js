const Project = require('../models/Project.model');
const Task = require('../models/Task.model');
const Commit = require('../models/Commit.model');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    const { type, status } = req.query;
    
    let query = { user: req.user.id };
    
    if (type) query.type = type;
    if (status) query.status = status;

    const projects = await Project.find(query)
      .sort({ createdAt: -1 });

    // Calculer le nombre de tâches, progression ET commits pour chaque projet
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const tasks = await Task.find({ project: project._id });
        const taskCount = tasks.length;
        const completedCount = tasks.filter(task => task.status === 'done').length;
        
        // ✅ NOUVEAU : Calculer le nombre total de commits depuis Commit model
        const commitCount = await Commit.countDocuments({ project: project._id });
        
        // Calculer la progression
        const progress = taskCount > 0 
          ? Math.round((completedCount / taskCount) * 100)
          : 0;
        
        // Mettre à jour la progression dans la base de données si différente
        if (project.progress !== progress) {
          await Project.findByIdAndUpdate(project._id, { progress });
        }

        return {
          ...project.toObject(),
          taskCount,
          completedCount,
          commitCount, // ✅ Ajouter commitCount calculé
          progress
        };
      })
    );

    res.status(200).json({
      success: true,
      count: projectsWithStats.length,
      data: projectsWithStats
    });
  } catch (error) {
    console.error('Get Projects Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Vérifier que le projet appartient à l'utilisateur
    if (project.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    // Récupérer les tâches du projet
    const tasks = await Task.find({ project: project._id });

    // ✅ Calculer commitCount aussi pour un seul projet depuis Commit model
    const commitCount = await Commit.countDocuments({ project: project._id });

    res.status(200).json({
      success: true,
      data: {
        ...project.toObject(),
        tasks,
        commitCount // ✅ Inclure dans la réponse
      }
    });
  } catch (error) {
    console.error('Get Project Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project',
      error: error.message
    });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res) => {
  try {
    // Ajouter l'utilisateur au projet
    req.body.user = req.user.id;

    const project = await Project.create(req.body);

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Create Project Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating project',
      error: error.message
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Vérifier ownership
    if (project.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    // Ne pas permettre de changer le user
    delete req.body.user;

    project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Update Project Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating project',
      error: error.message
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Vérifier ownership
    if (project.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project'
      });
    }

    // Supprimer toutes les tâches associées
    await Task.deleteMany({ project: project._id });

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Project and associated tasks deleted',
      data: {}
    });
  } catch (error) {
    console.error('Delete Project Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting project',
      error: error.message
    });
  }
};

// @desc    Update project progress
// @route   PUT /api/projects/:id/progress
// @access  Private
exports.updateProjectProgress = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Calculer automatiquement la progression
    await project.calculateProgress();
    await project.save();

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Update Progress Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
};