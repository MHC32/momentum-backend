// backend/src/models/Task.model.js
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    unique: true,
    sparse: true, // Permet null temporairement
  },
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['dev', 'personal', 'goal', 'habit'],
    default: 'dev'
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done'],
    default: 'todo'
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
  completed: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  deadline: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  estimatedTime: {
    type: Number,
    default: null
  },
  actualTime: {
    type: Number,
    default: null
  },
  
  // Legacy (garder pour compatibilité)
  gitCommits: [{
    hash: String,
    message: String,
    author: String,
    date: Date,
    repo: String
  }],
  // Relations
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  }
}, {
  timestamps: true
});

// 🆕 HOOK 1 : Générer taskId automatiquement
TaskSchema.pre('save', async function() {
  // Seulement si nouveau document ET projet existe ET taskId pas déjà défini
  if (this.isNew && this.project && !this.taskId) {
    try {
      const Project = mongoose.model('Project');
      const project = await Project.findById(this.project);
      
      if (project) {
        // Trouver le dernier task de ce projet
        const Task = mongoose.model('Task');
        const lastTask = await Task.findOne({ project: this.project })
          .sort({ createdAt: -1 });
        
        // Calculer le prochain numéro
        let nextNum = 1;
        if (lastTask && lastTask.taskId) {
          const match = lastTask.taskId.match(/-(\d+)$/);
          if (match) {
            nextNum = parseInt(match[1]) + 1;
          }
        }
        
        // Générer taskId : VAL-01, VAL-02, FIN-01, etc.
        const projectPrefix = project.name.substring(0, 3).toUpperCase();
        this.taskId = `${projectPrefix}-${String(nextNum).padStart(2, '0')}`;
        
        console.log(`✅ Generated taskId: ${this.taskId}`);
      }
    } catch (error) {
      console.error('Error generating taskId:', error.message);
      // Ne pas bloquer la création si erreur
    }
  }
  // ✅ PAS DE next() - Mongoose gère automatiquement avec async/await
});

// 🆕 HOOK 2 : Auto-update completedAt et completed quand status change
TaskSchema.pre('save', function() {
  if (this.isModified('status')) {
    if (this.status === 'done') {
      // Task terminée
      if (!this.completedAt) {
        this.completedAt = new Date();
      }
      this.completed = true;
      this.progress = 100;
    } else {
      // Task réouverte
      this.completedAt = null;
      this.completed = false;
    }
  }
  // ✅ PAS DE next() - Ce hook est synchrone, Mongoose gère automatiquement
});

// Index pour recherche rapide
TaskSchema.index({ user: 1, status: 1 });
TaskSchema.index({ user: 1, project: 1 });
TaskSchema.index({ deadline: 1 });

module.exports = mongoose.model('Task', TaskSchema);