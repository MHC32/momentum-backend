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
    enum: ['dev', 'personal', 'book'], // 🆕 AJOUT : 'book'
    default: 'dev'
  },
  // 🆕 NOUVEAU : Champs spécifiques pour les projets de type "book"
  book_pages: {
    type: Number,
    default: null,
    min: 1
  },
  book_author: {
    type: String,
    trim: true,
    default: null
  },
  book_isbn: {
    type: String,
    trim: true,
    default: null
  },
  // 🆕 NOUVEAU : Lien vers l'objectif Goals
  linked_goal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    default: null
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
  },
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

// 🆕 NOUVELLE MÉTHODE : Calculer les pages lues (pour projets book)
ProjectSchema.methods.calculatePagesRead = async function() {
  if (this.type !== 'book') {
    return 0;
  }

  const Task = mongoose.model('Task');
  const tasks = await Task.find({ 
    project: this._id,
    status: 'done'
  });

  // Parser les pages depuis les titres des tasks
  // Ex: "Lire chapitres 1-3 (50 pages)" → 50
  let totalPagesRead = 0;

  for (const task of tasks) {
    const match = task.title.match(/\((\d+)\s*pages?\)/i);
    if (match) {
      totalPagesRead += parseInt(match[1]);
    }
  }

  return totalPagesRead;
};

// 🆕 HOOK : Auto-compléter le projet book si toutes les tâches sont done
ProjectSchema.pre('save', async function() {
  if (this.type === 'book' && this.isModified('progress')) {
    // Si le projet atteint 100% et n'était pas encore complété
    if (this.progress >= 100 && this.status !== 'completed') {
      this.status = 'completed';
      this.endDate = new Date();
      console.log(`📚 Book project "${this.name}" auto-completed`);
    }
  }
});

// Index pour recherche rapide
ProjectSchema.index({ user: 1, status: 1 });
ProjectSchema.index({ user: 1, type: 1 });
ProjectSchema.index({ user: 1, type: 1, status: 1 }); // 🆕 Index composite

module.exports = mongoose.model('Project', ProjectSchema);