const Task = require('../models/Task.model');
const Project = require('../models/Project.model');

// Helper pour émettre via Socket.IO
const emitTaskUpdate = (req, task, type = 'task-updated') => {
  const io = req.app.get('io');
  if (io && task.user) {
    io.to(`user:${task.user}`).emit(type, {
      task: task.toObject ? task.toObject() : task,
      type
    });
  }
};

// Helper pour mettre à jour la progression du projet
const updateProjectProgress = async (projectId) => {
  if (!projectId) return;
  
  try {
    const project = await Project.findById(projectId);
    if (project) {
      const progress = await project.calculateProgress();
      project.progress = progress;
      await project.save();
    }
  } catch (error) {
    console.error('Error updating project progress:', error);
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    const { project, status, type, priority } = req.query;
    
    let query = { user: req.user.id };
    
    if (project) query.project = project;
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('project', 'name color icon')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get Tasks Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name color icon');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Get Task Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message
    });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    req.body.user = req.user.id;

    if (req.body.project) {
      const project = await Project.findById(req.body.project);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      if (project.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add task to this project'
        });
      }
    }

    const task = await Task.create(req.body);
    await task.populate('project', 'name color icon');

    // Mettre à jour la progression du projet
    if (task.project) {
      await updateProjectProgress(task.project._id || task.project);
    }

    // 🆕 Émettre via Socket.IO
    emitTaskUpdate(req, task, 'task-created');

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Create Task Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request body' 
      });
    }

    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this task' 
      });
    }

    const allowedUpdates = [
      'title', 'description', 'type', 'status', 'priority', 'progress',
      'tags', 'deadline', 'startDate', 'completedAt', 'estimatedTime',
      'actualTime', 'project', 'parentTask'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updates,
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('project', 'name color icon');

    // Mettre à jour la progression du projet si status changé
    if (updates.status && updatedTask.project) {
      await updateProjectProgress(updatedTask.project._id);
    }

    // 🆕 Émettre via Socket.IO
    emitTaskUpdate(req, updatedTask, 'task-updated');

    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Update Task Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task'
      });
    }

    const projectId = task.project;
    const taskForEmit = task.toObject();

    await task.deleteOne();

    // Mettre à jour la progression du projet
    if (projectId) {
      await updateProjectProgress(projectId);
    }

    // 🆕 Émettre via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('task-deleted', {
        taskId: taskForEmit._id,
        type: 'task-deleted'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted',
      data: {}
    });
  } catch (error) {
    console.error('Delete Task Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
};

// @desc    Update task status (for Kanban drag & drop + Dashboard checkbox)
// @route   PATCH /api/tasks/:id/status
// @access  Private
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['todo', 'in-progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    // Mettre à jour le statut (hooks pre-save géreront completedAt et completed)
    task.status = status;
    await task.save();

    const updatedTask = await Task.findById(id)
      .populate('project', 'name color icon');

    // Mettre à jour la progression du projet
    if (updatedTask.project) {
      await updateProjectProgress(updatedTask.project._id);
    }

    // 🆕 Émettre via Socket.IO
    emitTaskUpdate(req, updatedTask, 'task-status-updated');

    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Update Task Status Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get tasks by project (Kanban view)
// @route   GET /api/tasks/project/:projectId/kanban
// @access  Private
exports.getProjectKanban = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

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

    const tasks = await Task.find({ 
      project: req.params.projectId 
    }).sort({ createdAt: -1 });

    const kanban = {
      todo: tasks.filter(t => t.status === 'todo'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      done: tasks.filter(t => t.status === 'done')
    };

    res.status(200).json({
      success: true,
      data: {
        project,
        kanban,
        stats: {
          total: tasks.length,
          todo: kanban.todo.length,
          inProgress: kanban['in-progress'].length,
          done: kanban.done.length,
          progress: project.progress
        }
      }
    });
  } catch (error) {
    console.error('Get Kanban Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching kanban',
      error: error.message
    });
  }
};

module.exports = exports;