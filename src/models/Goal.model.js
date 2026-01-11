const mongoose = require('mongoose');

// ==================== SCHEMA PRINCIPAL ====================

const GoalSchema = new mongoose.Schema({
  // Propriétaire
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ==================== IDENTIFICATION ====================
  
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
  },

  // ==================== TYPE & CATÉGORIE ====================

  type: {
    type: String,
    enum: ['numeric', 'steps', 'simple'],
    required: true,
    default: 'simple'
  },

  category: {
    type: String,
    enum: ['financial', 'professional', 'learning', 'personal', 'health'],
    required: true,
    index: true
  },

  // ==================== HIÉRARCHIE ====================

  level: {
    type: String,
    enum: ['annual', 'quarterly', 'monthly', 'weekly', 'daily', 'none'],
    required: true,
    default: 'annual',
    index: true
  },

  // Pour décomposition automatique
  is_annual_breakdown: {
    type: Boolean,
    default: false,
    index: true
  },

  auto_decompose: {
    type: Boolean,
    default: false
  },

  // Liens hiérarchiques
  parent_goal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    default: null,
    index: true
  },

  parent_annual_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    default: null,
    index: true
  },

  children_goal_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  }],

  is_auto_generated: {
    type: Boolean,
    default: false
  },

  // ==================== OBJECTIFS PERSONNELS ====================

  is_personal: {
    type: Boolean,
    default: false,
    index: true
  },

  personal_duration_type: {
    type: String,
    enum: ['indefinite', 'this_quarter', 'this_month', 'this_week', 'none'],
    default: 'none'
  },

  // ==================== TEMPORALITÉ ====================

  year: {
    type: Number,
    required: true,
    index: true
  },

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

  day_of_year: {
    type: Number,
    min: 1,
    max: 366,
    index: true
  },

  deadline: {
    type: Date,
    index: true
  },

  // ==================== PROGRESSION (NUMERIC TYPE) ====================

  target_value: {
    type: Number,
    default: 0
  },

  current_value: {
    type: Number,
    default: 0
  },

  unit: {
    type: String,
    trim: true,
    maxlength: 20
  },

  // ==================== PROGRESSION (STEPS TYPE) ====================

  steps: [{
    id: String,
    title: String,
    completed: {
      type: Boolean,
      default: false
    },
    completed_at: Date
  }],

  total_steps: {
    type: Number,
    default: 0
  },

  completed_steps: {
    type: Number,
    default: 0
  },

  // ==================== STATUT & PROGRESSION ====================

  completed: {
    type: Boolean,
    default: false,
    index: true
  },

  progress_percent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  status: {
    type: String,
    enum: ['not-started', 'on-track', 'at-risk', 'behind', 'completed'],
    default: 'not-started',
    index: true
  },

  // ==================== AFFICHAGE ====================

  display_in_hierarchy: {
    type: Boolean,
    default: true,
    index: true
  },

  display_in_checklist: {
    type: Boolean,
    default: false,
    index: true
  },

  // ==================== VISUEL ====================

  color: {
    type: String,
    default: '#3B82F6'
  },

  icon: {
    type: String,
    default: '🎯'
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },

  // ==================== INTÉGRATIONS ====================

  integration_type: {
    type: String,
    enum: ['none', 'commits', 'books', 'rise_savings', 'rise_expenses'],
    default: 'none',
    index: true
  },

  commits_integration: {
    enabled: {
      type: Boolean,
      default: false
    },
    auto_sync: {
      type: Boolean,
      default: true
    },
    last_sync: Date
  },

  rise_integration: {
    enabled: {
      type: Boolean,
      default: false
    },
    account_id: String,
    category: String, // 'savings', 'clothing', 'electronics', etc.
    auto_link: {
      type: Boolean,
      default: true
    },
    last_sync: Date
  },

  // ==================== LIENS ====================

  linked_projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],

  linked_tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],

  // ==================== METADATA ====================

  tracking_mode: {
    type: String,
    enum: ['simple', 'detailed'],
    default: 'simple'
  },

  items: [mongoose.Schema.Types.Mixed], // Pour tracking détaillé

  notes: {
    type: String,
    maxlength: 2000
  }

}, {
  timestamps: true
});

// ==================== INDEX COMPOSÉS ====================

GoalSchema.index({ user: 1, year: 1, level: 1 });
GoalSchema.index({ user: 1, is_personal: 1 });
GoalSchema.index({ user: 1, deadline: 1 });
GoalSchema.index({ user: 1, parent_annual_id: 1 });
GoalSchema.index({ user: 1, display_in_hierarchy: 1, level: 1 });
GoalSchema.index({ user: 1, display_in_checklist: 1 });

// ==================== MÉTHODES D'INSTANCE ====================

/**
 * Calculer la progression pour un objectif numérique
 */
GoalSchema.methods.calculateProgress = function() {
  if (this.type === 'numeric') {
    if (this.target_value <= 0) return 0;
    const progress = (this.current_value / this.target_value) * 100;
    return Math.min(Math.round(progress * 100) / 100, 100);
  }
  
  if (this.type === 'steps') {
    if (this.total_steps <= 0) return 0;
    return Math.round((this.completed_steps / this.total_steps) * 100);
  }
  
  if (this.type === 'simple') {
    return this.completed ? 100 : 0;
  }
  
  return 0;
};

/**
 * Calculer le statut basé sur progression et deadline
 */
GoalSchema.methods.calculateStatus = function() {
  if (this.completed || this.progress_percent >= 100) {
    return 'completed';
  }

  if (this.progress_percent === 0) {
    return 'not-started';
  }

  if (!this.deadline) {
    return this.progress_percent > 0 ? 'on-track' : 'not-started';
  }

  const now = new Date();
  const deadline = new Date(this.deadline);
  const timeElapsed = now - this.createdAt;
  const totalTime = deadline - this.createdAt;

  if (totalTime <= 0) {
    return this.progress_percent < 100 ? 'behind' : 'completed';
  }

  const expectedProgress = (timeElapsed / totalTime) * 100;

  if (this.progress_percent >= expectedProgress) {
    return 'on-track';
  } else if (this.progress_percent >= expectedProgress * 0.8) {
    return 'at-risk';
  } else {
    return 'behind';
  }
};

/**
 * Mettre à jour progression et statut
 */
GoalSchema.methods.updateProgressAndStatus = async function() {
  this.progress_percent = this.calculateProgress();
  this.status = this.calculateStatus();
  
  if (this.progress_percent >= 100) {
    this.completed = true;
  }
  
  await this.save();
  return this;
};

// ==================== MÉTHODES STATIQUES ====================

/**
 * Décomposer automatiquement un objectif annuel numérique
 */
GoalSchema.statics.autoBreakdown = async function(annualGoalId) {
  const annualGoal = await this.findById(annualGoalId);
  
  if (!annualGoal) {
    throw new Error('Objectif annuel non trouvé');
  }

  if (annualGoal.type !== 'numeric') {
    throw new Error('Seuls les objectifs numériques peuvent être décomposés automatiquement');
  }

  if (annualGoal.level !== 'annual') {
    throw new Error('Seuls les objectifs annuels peuvent être décomposés');
  }

  const breakdown = {
    quarterly: [],
    monthly: [],
    weekly: [],
    daily: []
  };

  // Marquer comme décomposé
  annualGoal.is_annual_breakdown = true;
  await annualGoal.save();

  // Créer les objectifs trimestriels (4)
  for (let q = 1; q <= 4; q++) {
    const quarterlyGoal = await this.create({
      user: annualGoal.user,
      title: `${annualGoal.title} - Q${q}`,
      description: `${q}er trimestre - 25% de ${annualGoal.target_value} ${annualGoal.unit}`,
      type: 'numeric',
      category: annualGoal.category,
      level: 'quarterly',
      year: annualGoal.year,
      quarter: q,
      target_value: Math.round(annualGoal.target_value / 4),
      current_value: 0,
      unit: annualGoal.unit,
      parent_goal_id: annualGoal._id,
      parent_annual_id: annualGoal._id,
      is_auto_generated: true,
      is_annual_breakdown: false,
      display_in_hierarchy: true,
      display_in_checklist: false,
      color: annualGoal.color,
      icon: annualGoal.icon,
      priority: annualGoal.priority,
      integration_type: annualGoal.integration_type,
      commits_integration: annualGoal.commits_integration,
      rise_integration: annualGoal.rise_integration
    });

    breakdown.quarterly.push(quarterlyGoal._id);
    annualGoal.children_goal_ids.push(quarterlyGoal._id);
  }

  // Créer les objectifs mensuels (12)
  for (let m = 1; m <= 12; m++) {
    const quarter = Math.ceil(m / 3);
    const monthlyGoal = await this.create({
      user: annualGoal.user,
      title: `${annualGoal.title} - Mois ${m}`,
      description: `Mois ${m} - ${Math.round(annualGoal.target_value / 12)} ${annualGoal.unit}`,
      type: 'numeric',
      category: annualGoal.category,
      level: 'monthly',
      year: annualGoal.year,
      quarter: quarter,
      month: m,
      target_value: Math.round(annualGoal.target_value / 12),
      current_value: 0,
      unit: annualGoal.unit,
      parent_goal_id: annualGoal._id,
      parent_annual_id: annualGoal._id,
      is_auto_generated: true,
      is_annual_breakdown: false,
      display_in_hierarchy: true,
      display_in_checklist: false,
      color: annualGoal.color,
      icon: annualGoal.icon,
      priority: annualGoal.priority,
      integration_type: annualGoal.integration_type,
      commits_integration: annualGoal.commits_integration,
      rise_integration: annualGoal.rise_integration
    });

    breakdown.monthly.push(monthlyGoal._id);
    annualGoal.children_goal_ids.push(monthlyGoal._id);
  }

  // Créer les objectifs hebdomadaires (52)
  for (let w = 1; w <= 52; w++) {
    const month = Math.ceil(w / 4.33);
    const weeklyGoal = await this.create({
      user: annualGoal.user,
      title: `${annualGoal.title} - Semaine ${w}`,
      description: `Semaine ${w} - ${Math.round(annualGoal.target_value / 52)} ${annualGoal.unit}`,
      type: 'numeric',
      category: annualGoal.category,
      level: 'weekly',
      year: annualGoal.year,
      month: month <= 12 ? month : 12,
      week: w,
      target_value: Math.round(annualGoal.target_value / 52),
      current_value: 0,
      unit: annualGoal.unit,
      parent_goal_id: annualGoal._id,
      parent_annual_id: annualGoal._id,
      is_auto_generated: true,
      is_annual_breakdown: false,
      display_in_hierarchy: true,
      display_in_checklist: false,
      color: annualGoal.color,
      icon: annualGoal.icon,
      priority: annualGoal.priority,
      integration_type: annualGoal.integration_type,
      commits_integration: annualGoal.commits_integration,
      rise_integration: annualGoal.rise_integration
    });

    breakdown.weekly.push(weeklyGoal._id);
    annualGoal.children_goal_ids.push(weeklyGoal._id);
  }

  // Créer l'objectif quotidien (réutilisable chaque jour)
  const dailyGoal = await this.create({
    user: annualGoal.user,
    title: `${annualGoal.title} - Quotidien`,
    description: `Objectif quotidien - ~${Math.round(annualGoal.target_value / 365)} ${annualGoal.unit}/jour`,
    type: 'numeric',
    category: annualGoal.category,
    level: 'daily',
    year: annualGoal.year,
    target_value: Math.round(annualGoal.target_value / 365),
    current_value: 0,
    unit: annualGoal.unit,
    parent_goal_id: annualGoal._id,
    parent_annual_id: annualGoal._id,
    is_auto_generated: true,
    is_annual_breakdown: false,
    display_in_hierarchy: true,
    display_in_checklist: true,
    color: annualGoal.color,
    icon: annualGoal.icon,
    priority: annualGoal.priority,
    integration_type: annualGoal.integration_type,
    commits_integration: annualGoal.commits_integration,
    rise_integration: annualGoal.rise_integration
  });

  breakdown.daily.push(dailyGoal._id);
  annualGoal.children_goal_ids.push(dailyGoal._id);

  await annualGoal.save();

  return breakdown;
};

/**
 * Propager la progression vers le haut (enfant → parent)
 */
GoalSchema.statics.propagateProgressUp = async function(childGoalId, amountChanged) {
  const childGoal = await this.findById(childGoalId);
  
  if (!childGoal || !childGoal.parent_goal_id) {
    return;
  }

  const parentGoal = await this.findById(childGoal.parent_goal_id);
  
  if (!parentGoal) {
    return;
  }

  if (parentGoal.type === 'numeric') {
    parentGoal.current_value += amountChanged;
    
    if (parentGoal.current_value > parentGoal.target_value) {
      parentGoal.current_value = parentGoal.target_value;
    }
    
    if (parentGoal.current_value < 0) {
      parentGoal.current_value = 0;
    }

    await parentGoal.updateProgressAndStatus();

    // Continuer vers le parent suivant si existe
    if (parentGoal.parent_goal_id) {
      await this.propagateProgressUp(parentGoal._id, amountChanged);
    }
  }
};

/**
 * Recalculer depuis les enfants (parent ← enfants)
 */
GoalSchema.statics.recalculateFromChildren = async function(parentGoalId) {
  const parentGoal = await this.findById(parentGoalId).populate('children_goal_ids');
  
  if (!parentGoal || parentGoal.children_goal_ids.length === 0) {
    return;
  }

  if (parentGoal.type === 'numeric') {
    const totalFromChildren = parentGoal.children_goal_ids.reduce((sum, child) => {
      return sum + (child.current_value || 0);
    }, 0);

    parentGoal.current_value = Math.min(totalFromChildren, parentGoal.target_value);
    await parentGoal.updateProgressAndStatus();
  }
};

/**
 * Obtenir les objectifs du "Focus du jour"
 */
GoalSchema.statics.getFocusOfTheDay = async function(userId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Trouver tous les objectifs avec deadline aujourd'hui
  const goalsWithDeadlineToday = await this.find({
    user: userId,
    deadline: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    completed: false,
    $or: [
      { display_in_hierarchy: true },
      { display_in_checklist: true }
    ]
  }).sort({ priority: -1, createdAt: 1 });

  return goalsWithDeadlineToday;
};

// ==================== HOOKS ====================

// Avant la sauvegarde
GoalSchema.pre('save', function(next) {
  // Auto-calculer quarter, month si année fournie
  if (this.level === 'quarterly' && this.quarter) {
    // Déjà défini
  } else if (this.level === 'monthly' && this.month) {
    this.quarter = Math.ceil(this.month / 3);
  }

  // Auto-calculer progress et status si modifiés
  if (this.isModified('current_value') || this.isModified('target_value')) {
    this.progress_percent = this.calculateProgress();
    this.status = this.calculateStatus();
  }

  // Auto-calculer completed_steps pour type steps
  if (this.type === 'steps' && this.steps) {
    this.total_steps = this.steps.length;
    this.completed_steps = this.steps.filter(s => s.completed).length;
  }

  next();
});

const Goal = mongoose.model('Goal', GoalSchema);

module.exports = Goal;