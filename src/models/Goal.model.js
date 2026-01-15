const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  // ==================== IDENTIFICATION ====================
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },

  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [200, 'Goal title cannot exceed 200 characters']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // ==================== TYPE (selon wireframes) ====================
  goal_type: {
    type: String,
    enum: [
      'numeric_target',     // "12 livres", "4000 commits" (compteur)
      'numeric_progress',   // "Lire Atomic Habits" (progression %)
      'steps',              // "Acheter Xbox" (étapes)
      'financial_target',   // "700k HTG" (avec intégration Rise)
      'simple_check'        // Tâche unique "Faire X"
    ],
    required: true,
    default: 'numeric_target'
  },

  category: {
    type: String,
    enum: ['financial', 'professional', 'learning', 'personal', 'health'],
    required: true,
    index: true
  },

  // ==================== PÉRIODICITÉ (wireframe) ====================
  period_type: {
    type: String,
    enum: ['annual', 'quarterly', 'monthly', 'weekly', 'daily', 'custom'],
    required: true,
    index: true
  },

  // Wireframe: "2026", "Q1 2026", "Janvier 2026", "Semaine 1"
  period_label: {
    type: String,
    required: true,
    trim: true
  },

  year: {
    type: Number,
    required: true,
    index: true
  },

  // Pour quarterly/monthly/weekly
  quarter: {
    type: Number,
    min: 1,
    max: 4,
    index: true
  },

  month: {
    type: Number,
    min: 1,
    max: 12,
    index: true
  },

  week: {
    type: Number,
    min: 1,
    max: 53,
    index: true
  },

  // ==================== PROGRESSION (différent par type) ====================

  // Pour numeric_target ("12 livres", "4000 commits")
  target_count: {
    type: Number,
    min: 1,
    default: null
  },

  current_count: {
    type: Number,
    min: 0,
    default: 0
  },

  // Pour numeric_progress ("Lire Atomic Habits" - 145/350 pages)
  target_value: {
    type: Number,
    min: 1,
    default: null
  },

  current_value: {
    type: Number,
    min: 0,
    default: 0
  },

  unit: {
    type: String,
    trim: true,
    maxlength: 20 // "livres", "commits", "HTG", "pages"
  },

  // Pour steps ("Acheter Xbox")
  steps: [{
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completed_at: {
      type: Date,
      default: null
    },
    order: {
      type: Number,
      required: true,
      min: 0
    },
    metadata: {
      // Pour wireframe: "Économiser l'argent nécessaire" → amount: 600$
      amount: Number,
      currency: String,
      deadline: Date,
      notes: String
    }
  }],

  // Stats pour type steps
  steps_completed: {
    type: Number,
    default: 0,
    min: 0
  },

  steps_total: {
    type: Number,
    default: 0,
    min: 0
  },

  // ==================== DATES ====================
  start_date: {
    type: Date,
    default: null
  },

  deadline: {
    type: Date,
    index: true,
    default: null
  },

  completed_at: {
    type: Date,
    default: null
  },

  // ==================== INTÉGRATIONS (wireframe: "Connecté avec...") ====================
  integrations: {
    github_commits: {
      enabled: {
        type: Boolean,
        default: false
      },
      repo_filter: String, // "mhc32/*" pour tous vos repos
      auto_sync: {
        type: Boolean,
        default: true
      },
      last_sync: Date
    },

    rise_finance: {
      enabled: {
        type: Boolean,
        default: false
      },
      account_id: String,
      category: String, // "savings", "budget", "investment"
      auto_sync: {
        type: Boolean,
        default: true
      },
      last_sync: Date,
      rise_goal_id: String // ID correspondant dans Rise
    },

    project_link: {
      project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
      },
      auto_progress: {
        type: Boolean,
        default: false
      }
    }
  },

  // ==================== MÉTADONNÉES SPÉCIFIQUES ====================
  metadata: {
    // Pour "Lire 12 livres" (type: numeric_target)
    books: [{
      title: String,
      author: String,
      status: {
        type: String,
        enum: ['planned', 'reading', 'completed', 'paused'],
        default: 'planned'
      },
      pages_total: Number,
      pages_read: Number,
      current: Boolean, // Livre en cours de lecture
      started_date: Date,
      completed_date: Date
    }],

    // Pour "Économiser 700k HTG" (type: financial_target)
    financial: {
      monthly_target: Number, // 58,333 HTG
      currency: String,
      rise_account_id: String,
      rise_account_name: String
    },

    // Pour "4000 commits GitHub"
    commits: {
      daily_target: Number, // 11 commits/jour
      weekly_target: Number, // 77 commits/semaine
      monthly_target: Number, // 333 commits/mois
      best_day: {
        count: Number,
        date: Date
      },
      current_streak: Number // jours consécutifs avec commits
    }
  },

  // ==================== POUR LE DASHBOARD ====================
  display_config: {
    show_in_annual: {
      type: Boolean,
      default: true
    },
    show_in_quarterly: {
      type: Boolean,
      default: false
    },
    show_in_monthly: {
      type: Boolean,
      default: false
    },
    show_in_weekly: {
      type: Boolean,
      default: false
    },
    show_in_daily: {
      type: Boolean,
      default: false
    },
    show_in_focus: {
      type: Boolean,
      default: false // Pour focus du jour
    },
    color: {
      type: String,
      default: '#3B82F6' // Bleu par défaut
    },
    icon: {
      type: String,
      default: '🎯'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  },

  // ==================== STATUT (wireframe: "On Track", "At Risk") ====================
  status: {
    type: String,
    enum: ['not_started', 'on_track', 'at_risk', 'behind', 'completed'],
    default: 'not_started',
    index: true
  },

  progress_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  completed: {
    type: Boolean,
    default: false,
    index: true
  },

  // ==================== LIENS ====================
  linked_tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],

  linked_projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],

  linked_habit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    default: null
  },

  // Pour hiérarchie (remplace parent_annual_id)
  parent_goal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    default: null
  },

  children_goal_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  }],

  // ==================== NOTES ====================
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },

  tags: [{
    type: String,
    trim: true
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEX ====================
GoalSchema.index({ user: 1, year: 1, period_type: 1 });
GoalSchema.index({ user: 1, category: 1, status: 1 });
GoalSchema.index({ user: 1, deadline: 1 });
GoalSchema.index({ user: 1, completed: 1 });
GoalSchema.index({ user: 1, 'integrations.github_commits.enabled': 1 });
GoalSchema.index({ user: 1, 'integrations.rise_finance.enabled': 1 });

// ==================== VIRTUALS ====================
GoalSchema.virtual('days_left').get(function() {
  if (!this.deadline) return null;
  
  const now = new Date();
  const deadline = new Date(this.deadline);
  
  // Remettre à minuit pour calcul juste
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
});

GoalSchema.virtual('is_overdue').get(function() {
  if (!this.deadline) return false;
  
  const now = new Date();
  const deadline = new Date(this.deadline);
  
  return now > deadline && !this.completed;
});

GoalSchema.virtual('needs_attention').get(function() {
  // Objectif en retard ou à risque
  return this.is_overdue || this.status === 'at_risk' || this.status === 'behind';
});

// ==================== METHODS ====================
GoalSchema.methods.calculateProgress = function() {
  if (this.goal_type === 'numeric_target') {
    // "12 livres" - compteur simple
    if (!this.target_count || this.target_count === 0) return 0;
    const progress = (this.current_count / this.target_count) * 100;
    return Math.min(Math.round(progress * 100) / 100, 100);
  }
  
  if (this.goal_type === 'numeric_progress') {
    // "145/350 pages" - progression avec unité
    if (!this.target_value || this.target_value === 0) return 0;
    const progress = (this.current_value / this.target_value) * 100;
    return Math.min(Math.round(progress * 100) / 100, 100);
  }
  
  if (this.goal_type === 'steps') {
    // "Acheter Xbox" - étapes
    if (!this.steps_total || this.steps_total === 0) return 0;
    const progress = (this.steps_completed / this.steps_total) * 100;
    return Math.min(Math.round(progress * 100) / 100, 100);
  }
  
  if (this.goal_type === 'financial_target') {
    // "700k HTG" - intégration Rise
    if (!this.target_value || this.target_value === 0) return 0;
    const progress = (this.current_value / this.target_value) * 100;
    return Math.min(Math.round(progress * 100) / 100, 100);
  }
  
  if (this.goal_type === 'simple_check') {
    // Tâche unique - 0% ou 100%
    return this.completed ? 100 : 0;
  }
  
  return 0;
};

GoalSchema.methods.calculateStatus = function() {
  if (this.completed || this.progress_percentage >= 100) {
    return 'completed';
  }
  
  if (this.progress_percentage === 0) {
    return 'not_started';
  }
  
  if (!this.deadline) {
    // Pas de deadline = on_track si progression > 0
    return this.progress_percentage > 0 ? 'on_track' : 'not_started';
  }
  
  // Calculer la progression attendue vs réelle
  const now = new Date();
  const start = this.start_date || this.createdAt;
  const deadline = new Date(this.deadline);
  
  if (now > deadline) {
    return 'behind';
  }
  
  const totalTime = deadline - start;
  const elapsedTime = now - start;
  
  if (totalTime <= 0) {
    return this.progress_percentage < 100 ? 'behind' : 'completed';
  }
  
  const expectedProgress = (elapsedTime / totalTime) * 100;
  
  if (this.progress_percentage >= expectedProgress) {
    return 'on_track';
  } else if (this.progress_percentage >= expectedProgress * 0.7) {
    return 'at_risk';
  } else {
    return 'behind';
  }
};

GoalSchema.methods.updateProgressAndStatus = function() {
  this.progress_percentage = this.calculateProgress();
  this.status = this.calculateStatus();
  
  // Auto-complete si progression à 100%
  if (this.progress_percentage >= 100 && !this.completed) {
    this.completed = true;
    this.completed_at = new Date();
    this.status = 'completed';
  }
  
  // Mettre à jour steps_completed pour type steps
  if (this.goal_type === 'steps' && this.steps && this.steps.length > 0) {
    this.steps_total = this.steps.length;
    this.steps_completed = this.steps.filter(step => step.completed).length;
  }
  
  return this;
};

GoalSchema.methods.completeStep = function(stepId) {
  if (this.goal_type !== 'steps') {
    throw new Error('This goal is not a steps type goal');
  }
  
  const step = this.steps.find(s => s.id === stepId);
  if (!step) {
    throw new Error(`Step with id ${stepId} not found`);
  }
  
  step.completed = !step.completed;
  step.completed_at = step.completed ? new Date() : null;
  
  this.updateProgressAndStatus();
  
  return {
    step,
    goal: this
  };
};

GoalSchema.methods.addBookProgress = function(bookTitle, pagesRead) {
  if (this.goal_type !== 'numeric_target' || this.unit !== 'books') {
    throw new Error('This goal is not a books reading goal');
  }
  
  const book = this.metadata.books.find(b => b.title === bookTitle);
  if (!book) {
    throw new Error(`Book "${bookTitle}" not found in goal`);
  }
  
  book.pages_read += pagesRead;
  
  // Si livre complété
  if (book.pages_read >= book.pages_total) {
    book.status = 'completed';
    book.completed_date = new Date();
    book.current = false;
    
    // Passer au livre suivant si disponible
    const nextBook = this.metadata.books.find(b => b.status === 'planned');
    if (nextBook) {
      nextBook.status = 'reading';
      nextBook.current = true;
      nextBook.started_date = new Date();
    }
    
    // Incrémenter le compteur de livres
    this.current_count += 1;
  }
  
  this.updateProgressAndStatus();
  
  return this;
};

// ==================== STATICS ====================
GoalSchema.statics.getFocusOfTheDay = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Objectifs avec deadline aujourd'hui
  const deadlineGoals = await this.find({
    user: userId,
    deadline: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Demain
    },
    completed: false,
    'display_config.show_in_focus': true
  }).sort({ 'display_config.priority': -1, deadline: 1 }).limit(3);
  
  // Objectifs quotidiens (period_type: 'daily')
  const dailyGoals = await this.find({
    user: userId,
    period_type: 'daily',
    period_label: today.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }),
    completed: false,
    'display_config.show_in_focus': true
  }).limit(2);
  
  return [...deadlineGoals, ...dailyGoals];
};

// ==================== MIDDLEWARE ====================
GoalSchema.pre('save', function(next) {
  // Auto-calculer quarter/month/week si year + period_type fournis
  if (this.year && this.period_type) {
    if (this.period_type === 'quarterly' && !this.quarter) {
      // Défaut: quarter courant
      const today = new Date();
      this.quarter = Math.floor((today.getMonth() + 3) / 3);
    }
    
    if (this.period_type === 'monthly' && !this.month) {
      // Défaut: mois courant
      this.month = new Date().getMonth() + 1;
      this.quarter = Math.ceil(this.month / 3);
    }
    
    if (this.period_type === 'weekly' && !this.week) {
      // Défaut: semaine courante (ISO)
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      const week1 = new Date(date.getFullYear(), 0, 4);
      this.week = 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }
  }
  
  // Mettre à jour la progression et le statut
  this.updateProgressAndStatus();
  
  next();
});

const Goal = mongoose.model('Goal', GoalSchema);

module.exports = Goal;