// backend/src/models/Project.model.js
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a project name'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['dev', 'personal'],
    default: 'dev'
  },
  color: {
    type: String,
    default: '#7BBDE8' // Momentum light-2 color
  },
  icon: {
    type: String,
    default: null // Emoji ou lettre
  },
  status: {
    type: String,
    enum: ['active', 'on-hold', 'completed', 'archived'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  gitRepos: [{
    name: String,
    url: String,
    branch: String
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual pour obtenir les tâches du projet
ProjectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  justOne: false
});

// Méthode pour calculer la progression basée sur les tâches
ProjectSchema.methods.calculateProgress = async function() {
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ project: this._id });
  
  if (tasks.length === 0) {
    return 0;
  }
  
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const progress = Math.round((completedTasks / tasks.length) * 100);
  
  return progress;
};

// Index pour recherche rapide
ProjectSchema.index({ user: 1, status: 1 });
ProjectSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Project', ProjectSchema);