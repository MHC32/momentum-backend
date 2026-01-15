const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  // ==================== IDENTIFICATION ====================
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },

  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [100, 'Habit name cannot exceed 100 characters']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  category: {
    type: String,
    enum: ['learning', 'health', 'productivity', 'finance', 'personal'],
    required: true,
    default: 'personal'
  },

  icon: {
    type: String,
    default: '📚' // Emoji par défaut
  },

  color: {
    type: String,
    default: '#7BBDE8' // Momentum light blue
  },

  // ==================== FRÉQUENCE ====================
  frequency: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      required: true,
      default: 'daily'
    },

    // Pour "2x par semaine"
    times_per_week: {
      type: Number,
      min: 1,
      max: 7,
      default: null
    },

    // Jours spécifiques (0=Dimanche, 1=Lundi, etc.)
    specific_days: [{
      type: Number,
      min: 0,
      max: 6
    }],

    // Dates spécifiques du mois (1-31)
    specific_dates: [{
      type: Number,
      min: 1,
      max: 31
    }],

    // Durée cible en minutes
    target_duration: {
      type: Number,
      min: 1,
      default: null // ex: 30 minutes
    }
  },

  // ==================== TRACKING ====================
  streak: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    last_completed: {
      type: Date,
      default: null
    },
    started_at: {
      type: Date,
      default: null
    }
  },

  // Historique des complétions
  completion_history: [{
    date: {
      type: Date,
      required: true
    },
    completed: {
      type: Boolean,
      default: true
    },
    duration: {
      type: Number, // en minutes
      default: null
    },
    notes: {
      type: String,
      trim: true
    },
    skipped: {
      type: Boolean,
      default: false
    },
    skipped_reason: {
      type: String,
      trim: true
    }
  }],

  // ==================== POUR "COURS D'ANGLAIS" ====================
  learning_tracking: {
    // Pour wireframe: "Leçon 12 - Past continuous tense"
    current_lesson: {
      type: String,
      trim: true
    },
    current_topic: {
      type: String,
      trim: true
    },
    total_lessons: {
      type: Number,
      min: 1,
      default: null
    },
    completed_lessons: {
      type: Number,
      default: 0,
      min: 0
    },

    lesson_history: [{
      date: {
        type: Date,
        required: true
      },
      lesson_number: {
        type: String,
        required: true
      },
      topic: {
        type: String,
        trim: true
      },
      notes: {
        type: String,
        trim: true
      },
      duration: {
        type: Number // en minutes
      }
    }]
  },

  // ==================== RÈGLES & ALERTES ====================
  rules: {
    // Wireframe: "Attention! Tu as manqué 3 jours consécutifs"
    reset_after_missed_days: {
      type: Number,
      min: 1,
      default: 3
    },
    warn_before_reset: {
      type: Boolean,
      default: true
    },
    warning_days_before: {
      type: Number,
      min: 1,
      default: 1
    },
    allow_skip: {
      type: Boolean,
      default: true
    },
    max_skips_per_month: {
      type: Number,
      default: 4
    },
    require_notes: {
      type: Boolean,
      default: false
    },
    minimum_duration: {
      type: Number, // minutes
      default: null
    }
  },

  // ==================== RAPPELS ====================
  reminders: {
    enabled: {
      type: Boolean,
      default: false
    },
    time: {
      type: String, // Format "HH:MM"
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    days_before: {
      type: Number,
      default: 0
    },
    notification_type: {
      type: String,
      enum: ['push', 'email', 'both'],
      default: 'push'
    }
  },

  // ==================== STATISTIQUES ====================
  stats: {
    total_completions: {
      type: Number,
      default: 0
    },
    total_skips: {
      type: Number,
      default: 0
    },
    average_duration: {
      type: Number,
      default: null
    },
    completion_rate: {
      type: Number, // Pourcentage
      min: 0,
      max: 100,
      default: 0
    },
    best_streak: {
      type: Number,
      default: 0
    },
    last_calculated: {
      type: Date,
      default: null
    }
  },

  // ==================== CONFIGURATION ====================
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },

  is_archived: {
    type: Boolean,
    default: false,
    index: true
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // ==================== LIENS ====================
  linked_goal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    default: null
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
HabitSchema.index({ user: 1, is_active: 1 });
HabitSchema.index({ user: 1, category: 1 });
HabitSchema.index({ user: 1, 'streak.last_completed': 1 });
HabitSchema.index({ user: 1, createdAt: -1 });

// ==================== VIRTUALS ====================
HabitSchema.virtual('is_due_today').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Vérifier si l'habitude est due aujourd'hui selon sa fréquence
  if (this.frequency.type === 'daily') {
    return true;
  }
  
  if (this.frequency.type === 'weekly' && this.frequency.specific_days) {
    const todayDayOfWeek = today.getDay(); // 0=Dimanche, 1=Lundi...
    return this.frequency.specific_days.includes(todayDayOfWeek);
  }
  
  if (this.frequency.type === 'monthly' && this.frequency.specific_dates) {
    const todayDate = today.getDate();
    return this.frequency.specific_dates.includes(todayDate);
  }
  
  return false;
});

HabitSchema.virtual('completed_today').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.completion_history.some(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= today && entryDate < tomorrow && entry.completed;
  });
});

HabitSchema.virtual('missed_days').get(function() {
  if (!this.streak.last_completed) return 0;
  
  const lastCompleted = new Date(this.streak.last_completed);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastCompleted.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((today - lastCompleted) / (1000 * 60 * 60 * 24));
  return diffDays - 1; // -1 car hier est déjà "manqué" si pas fait
});

// ==================== METHODS ====================
HabitSchema.methods.markAsCompleted = function(duration = null, notes = '') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Vérifier si déjà complété aujourd'hui
  const alreadyCompleted = this.completion_history.some(entry => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime() && entry.completed;
  });
  
  if (alreadyCompleted) {
    throw new Error('Habit already completed today');
  }
  
  // Ajouter à l'historique
  this.completion_history.push({
    date: new Date(),
    completed: true,
    duration: duration || this.frequency.target_duration,
    notes: notes.trim()
  });
  
  // Mettre à jour le streak
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  if (this.streak.last_completed) {
    const lastCompleted = new Date(this.streak.last_completed);
    lastCompleted.setHours(0, 0, 0, 0);
    
    if (lastCompleted.getTime() === yesterday.getTime()) {
      // Streak continue
      this.streak.current += 1;
    } else {
      // Nouveau streak
      this.streak.current = 1;
      this.streak.started_at = new Date();
    }
  } else {
    // Premier streak
    this.streak.current = 1;
    this.streak.started_at = new Date();
  }
  
  // Mettre à jour le plus long streak
  if (this.streak.current > this.streak.longest) {
    this.streak.longest = this.streak.current;
  }
  
  this.streak.last_completed = new Date();
  
  // Mettre à jour les stats
  this.stats.total_completions += 1;
  
  return this;
};

HabitSchema.methods.markAsSkipped = function(reason = '') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Ajouter un skip à l'historique
  this.completion_history.push({
    date: new Date(),
    completed: false,
    skipped: true,
    skipped_reason: reason.trim()
  });
  
  // Réinitialiser le streak si règles le demandent
  if (this.rules.reset_after_missed_days === 1) {
    this.streak.current = 0;
    this.streak.started_at = null;
  }
  
  this.stats.total_skips += 1;
  
  return this;
};

HabitSchema.methods.calculateStats = function() {
  if (this.completion_history.length === 0) {
    this.stats.completion_rate = 0;
    this.stats.average_duration = null;
    return;
  }
  
  // Calculer le taux de complétion des 30 derniers jours
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentCompletions = this.completion_history.filter(entry => {
    return new Date(entry.date) >= thirtyDaysAgo && entry.completed;
  });
  
  const recentEntries = this.completion_history.filter(entry => {
    return new Date(entry.date) >= thirtyDaysAgo;
  });
  
  if (recentEntries.length > 0) {
    this.stats.completion_rate = Math.round((recentCompletions.length / recentEntries.length) * 100);
  }
  
  // Calculer la durée moyenne
  const completedWithDuration = recentCompletions.filter(entry => entry.duration);
  if (completedWithDuration.length > 0) {
    const totalDuration = completedWithDuration.reduce((sum, entry) => sum + entry.duration, 0);
    this.stats.average_duration = Math.round(totalDuration / completedWithDuration.length);
  }
  
  this.stats.last_calculated = new Date();
  
  return this.stats;
};

// ==================== MIDDLEWARE ====================
HabitSchema.pre('save', function(next) {
  // Calculer les stats avant sauvegarde
  if (this.isModified('completion_history') || !this.stats.last_calculated) {
    this.calculateStats();
  }
  
  // Mettre à jour completed_lessons si learning_tracking modifié
  if (this.isModified('learning_tracking.lesson_history')) {
    this.learning_tracking.completed_lessons = this.learning_tracking.lesson_history.length;
  }
  
  next();
});

const Habit = mongoose.model('Habit', HabitSchema);

module.exports = Habit;