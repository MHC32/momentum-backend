const mongoose = require('mongoose');

const GoalBreakdownSchema = new mongoose.Schema({
  // ==================== LIENS ====================
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true,
    index: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ==================== NIVEAU HIÉRARCHIQUE ====================
  level: {
    type: String,
    enum: ['annual', 'quarterly', 'monthly', 'weekly', 'daily'],
    required: true,
    index: true
  },

  // ==================== IDENTIFICATION TEMPORELLE ====================
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

  // Date réelle pour ce breakdown
  date: {
    type: Date,
    required: true,
    index: true
  },

  // Label pour affichage
  label: {
    type: String,
    required: true,
    trim: true
  },

  // ==================== OBJECTIFS ====================
  target_value: {
    type: Number,
    required: true,
    min: 0
  },

  current_value: {
    type: Number,
    default: 0,
    min: 0
  },

  unit: {
    type: String,
    trim: true
  },

  // ==================== STATUT ====================
  completed: {
    type: Boolean,
    default: false,
    index: true
  },

  progress_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // ==================== LIENS HIÉRARCHIQUES ====================
  parent_breakdown_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoalBreakdown',
    default: null,
    index: true
  },

  children_breakdown_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoalBreakdown'
  }],

  // ==================== MÉTADONNÉES ====================
  is_auto_generated: {
    type: Boolean,
    default: false
  },

  notes: {
    type: String,
    trim: true
  },

  // ==================== POUR SYNC ====================
  last_updated: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

// ==================== INDEX ====================
GoalBreakdownSchema.index({ user: 1, goal: 1, level: 1 });
GoalBreakdownSchema.index({ user: 1, goal: 1, year: 1, level: 1 });
GoalBreakdownSchema.index({ user: 1, date: 1, completed: 1 });
GoalBreakdownSchema.index({ user: 1, goal: 1, parent_breakdown_id: 1 });

// ==================== VIRTUALS ====================
GoalBreakdownSchema.virtual('remaining_value').get(function() {
  return Math.max(this.target_value - this.current_value, 0);
});

GoalBreakdownSchema.virtual('is_overdue').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const breakdownDate = new Date(this.date);
  breakdownDate.setHours(0, 0, 0, 0);
  
  return today > breakdownDate && !this.completed;
});

// ==================== METHODS ====================
GoalBreakdownSchema.methods.updateProgress = function(newValue) {
  this.current_value = Math.min(Math.max(newValue, 0), this.target_value);
  this.progress_percentage = (this.current_value / this.target_value) * 100;
  this.completed = this.current_value >= this.target_value;
  this.last_updated = new Date();
  
  return this;
};

GoalBreakdownSchema.methods.addProgress = function(increment) {
  this.current_value = Math.min(this.current_value + increment, this.target_value);
  this.progress_percentage = (this.current_value / this.target_value) * 100;
  this.completed = this.current_value >= this.target_value;
  this.last_updated = new Date();
  
  return this;
};

// ==================== STATICS ====================
GoalBreakdownSchema.statics.generateBreakdown = async function(goalId, breakdownLevel = 'daily') {
  const Goal = mongoose.model('Goal');
  const goal = await Goal.findById(goalId);
  
  if (!goal) {
    throw new Error('Goal not found');
  }
  
  if (goal.goal_type !== 'numeric_target' && goal.goal_type !== 'financial_target' && goal.goal_type !== 'numeric_progress') {
    throw new Error('Only numeric goals can be broken down');
  }
  
  const breakdowns = [];
  const targetValue = goal.target_value || goal.target_count;
  const unit = goal.unit;
  
  // Générer les breakdowns selon le niveau demandé
  if (breakdownLevel === 'quarterly') {
    // 4 trimestres
    for (let q = 1; q <= 4; q++) {
      const quarterValue = Math.round(targetValue / 4);
      const quarterDate = new Date(goal.year, (q - 1) * 3, 15); // Milieu du trimestre
      
      const breakdown = await this.create({
        goal: goal._id,
        user: goal.user,
        level: 'quarterly',
        year: goal.year,
        quarter: q,
        date: quarterDate,
        label: `Q${q} ${goal.year}`,
        target_value: quarterValue,
        current_value: 0,
        unit: unit,
        is_auto_generated: true
      });
      
      breakdowns.push(breakdown);
    }
  } else if (breakdownLevel === 'monthly') {
    // 12 mois
    for (let m = 1; m <= 12; m++) {
      const monthValue = Math.round(targetValue / 12);
      const monthDate = new Date(goal.year, m - 1, 15); // Milieu du mois
      
      const breakdown = await this.create({
        goal: goal._id._id,
        user: goal.user,
        level: 'monthly',
        year: goal.year,
        month: m,
        quarter: Math.ceil(m / 3),
        date: monthDate,
        label: new Date(goal.year, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        target_value: monthValue,
        current_value: 0,
        unit: unit,
        is_auto_generated: true
      });
      
      breakdowns.push(breakdown);
    }
  } else if (breakdownLevel === 'daily') {
    // 365 jours (approximatif)
    const dailyValue = Math.round(targetValue / 365);
    
    for (let d = 1; d <= 365; d++) {
      const date = new Date(goal.year, 0, d);
      const month = date.getMonth() + 1;
      const week = this.getWeekNumber(date);
      
      const breakdown = await this.create({
        goal: goal._id,
        user: goal.user,
        level: 'daily',
        year: goal.year,
        month: month,
        quarter: Math.ceil(month / 3),
        week: week,
        day_of_year: d,
        date: date,
        label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
        target_value: dailyValue,
        current_value: 0,
        unit: unit,
        is_auto_generated: true
      });
      
      breakdowns.push(breakdown);
    }
  }
  
  return breakdowns;
};

GoalBreakdownSchema.statics.getWeekNumber = function(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

GoalBreakdownSchema.statics.propagateProgress = async function(breakdownId, increment) {
  const breakdown = await this.findById(breakdownId);
  
  if (!breakdown) {
    throw new Error('Breakdown not found');
  }
  
  // Mettre à jour ce breakdown
  await breakdown.addProgress(increment);
  await breakdown.save();
  
  // Mettre à jour le parent si existe
  if (breakdown.parent_breakdown_id) {
    const parent = await this.findById(breakdown.parent_breakdown_id);
    if (parent) {
      await parent.addProgress(increment);
      await parent.save();
      
      // Continuer la propagation
      await this.propagateProgress(parent._id, 0); // 0 car déjà ajouté
    }
  }
  
  // Mettre à jour le goal parent
  const Goal = mongoose.model('Goal');
  const goal = await Goal.findById(breakdown.goal);
  
  if (goal) {
    if (goal.goal_type === 'numeric_target') {
      goal.current_count = Math.min(goal.current_count + increment, goal.target_count);
    } else if (goal.goal_type === 'numeric_progress' || goal.goal_type === 'financial_target') {
      goal.current_value = Math.min(goal.current_value + increment, goal.target_value);
    }
    
    await goal.updateProgressAndStatus();
    await goal.save();
  }
  
  return {
    breakdown,
    goal
  };
};

const GoalBreakdown = mongoose.model('GoalBreakdown', GoalBreakdownSchema);

module.exports = GoalBreakdown;