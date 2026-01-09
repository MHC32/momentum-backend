const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  // ==================== IDENTIFICATION ====================
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Niveau hiérarchique
  level: {
    type: String,
    enum: ['annual', 'quarterly', 'monthly', 'weekly', 'daily', 'none'],
    required: true,
    default: 'none'
  },
  
  // Catégorie
  category: {
    type: String,
    enum: ['financial', 'professional', 'learning', 'personal', 'health'],
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

  // ==================== TYPE ET PROGRESSION ====================
  
  // Type d'objectif
  type: {
    type: String,
    enum: ['numeric', 'steps', 'simple'],
    required: true,
    default: 'numeric'
  },
  
  // Pour type 'numeric'
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
    default: ''
  },
  
  // Pour type 'steps'
  steps: [{
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
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
  
  // Pour type 'simple'
  completed: {
    type: Boolean,
    default: false
  },
  
  completed_at: {
    type: Date
  },

  // ==================== HIÉRARCHIE ====================
  
  parent_goal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    default: null
  },
  
  children_goal_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  }],
  
  breakdown_auto: {
    type: Boolean,
    default: false
  },

  // ==================== TRACKING MODE ====================
  
  tracking_mode: {
    type: String,
    enum: ['simple', 'detailed', 'project-based'],
    default: 'simple'
  },
  
  // Pour tracking_mode 'detailed' (livres)
  items: [{
    id: String,
    title: String,
    total_pages: Number,
    current_page: Number,
    completed: Boolean,
    completed_at: Date
  }],
  
  // Pour tracking_mode 'project-based'
  linked_projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],

  // ==================== INTÉGRATIONS ====================
  
  // Intégration Rise (économies)
  rise_integration: {
    enabled: {
      type: Boolean,
      default: false
    },
    account_id: String,
    category: String
  },
  
  // Intégration Commits
  commits_integration: {
    enabled: {
      type: Boolean,
      default: false
    },
    auto_sync: {
      type: Boolean,
      default: true
    }
  },

  // ==================== MÉTADONNÉES TEMPORELLES ====================
  
  year: {
    type: Number
  },
  
  quarter: {
    type: Number,
    min: 1,
    max: 4
  },
  
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  
  week: {
    type: Number,
    min: 1,
    max: 53
  },
  
  date: {
    type: Date
  },
  
  deadline: {
    type: Date
  },

  // ==================== STATUT ====================
  
  status: {
    type: String,
    enum: ['on-track', 'at-risk', 'behind', 'completed', 'pending'],
    default: 'pending'
  },
  
  progress_percent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // ==================== UI/UX ====================
  
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
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  // ==================== AFFICHAGE DUAL ====================
  
  display_in_hierarchy: {
    type: Boolean,
    default: true
  },
  
  display_in_checklist: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// ==================== INDEXES ====================

goalSchema.index({ user: 1, level: 1, category: 1 });
goalSchema.index({ user: 1, year: 1 });
goalSchema.index({ user: 1, date: 1 });
goalSchema.index({ parent_goal_id: 1 });
goalSchema.index({ user: 1, display_in_hierarchy: 1 });
goalSchema.index({ user: 1, display_in_checklist: 1 });

// ==================== MÉTHODES D'INSTANCE ====================

/**
 * Calcule la progression de l'objectif
 * @returns {Number} Pourcentage de progression (0-100)
 */
goalSchema.methods.calculateProgress = function() {
  if (this.type === 'numeric') {
    // Si on a une valeur stockée, on la calcule directement
    if (this.target_value > 0) {
      const progress = (this.current_value / this.target_value) * 100;
      return Math.min(Math.round(progress * 100) / 100, 100);
    }
    
    // Sinon, on fait la somme des enfants
    if (this.children_goal_ids.length > 0) {
      // Cette partie sera calculée via populate et agrégation
      return this.progress_percent;
    }
    
    return 0;
  }
  
  if (this.type === 'steps') {
    if (this.total_steps === 0) return 0;
    return Math.round((this.completed_steps / this.total_steps) * 100);
  }
  
  if (this.type === 'simple') {
    return this.completed ? 100 : 0;
  }
  
  return 0;
};

/**
 * Calcule le statut de l'objectif (on-track, at-risk, behind)
 * @returns {String} Statut calculé
 */
goalSchema.methods.calculateStatus = function() {
  // Si complété, retourner 'completed'
  if (this.completed || this.progress_percent >= 100) {
    return 'completed';
  }
  
  // Si pas de deadline, retourner 'pending'
  if (!this.deadline) {
    return 'pending';
  }
  
  // Calculer le pourcentage de temps écoulé
  const now = new Date();
  const start = this.createdAt;
  const end = this.deadline;
  
  if (now >= end) {
    // Deadline dépassée
    return this.progress_percent >= 100 ? 'completed' : 'behind';
  }
  
  const totalTime = end - start;
  const elapsedTime = now - start;
  const timePercent = (elapsedTime / totalTime) * 100;
  
  const progressPercent = this.progress_percent;
  
  // Déterminer le statut
  if (progressPercent >= timePercent) {
    return 'on-track';
  } else if (progressPercent >= timePercent - 10) {
    // Si on est à moins de 10% du temps écoulé
    return 'at-risk';
  } else {
    return 'behind';
  }
};

/**
 * Met à jour le statut et le pourcentage de progression
 */
goalSchema.methods.updateProgressAndStatus = async function() {
  this.progress_percent = this.calculateProgress();
  this.status = this.calculateStatus();
  
  // Si complété, mettre à jour completed et completed_at
  if (this.progress_percent >= 100 && !this.completed) {
    this.completed = true;
    this.completed_at = new Date();
  }
  
  await this.save();
};

// ==================== MÉTHODES STATIQUES ====================

/**
 * Décomposition automatique d'un objectif en sous-objectifs
 * @param {String} goalId - ID de l'objectif à décomposer
 * @returns {Object} Résultat de la décomposition avec les IDs créés
 */
goalSchema.statics.autoBreakdown = async function(goalId) {
  const Goal = this;
  const parentGoal = await Goal.findById(goalId);
  
  if (!parentGoal) {
    throw new Error('Objectif parent non trouvé');
  }
  
  if (parentGoal.level === 'daily' || parentGoal.level === 'none') {
    throw new Error('Impossible de décomposer un objectif quotidien ou sans niveau');
  }
  
  if (parentGoal.type !== 'numeric') {
    throw new Error('Seuls les objectifs numériques peuvent être décomposés automatiquement');
  }
  
  const result = {
    parent: parentGoal._id,
    children: []
  };
  
  // Définir les niveaux de décomposition
  const levelHierarchy = {
    annual: { next: 'quarterly', count: 4, getName: (i) => `T${i + 1} ${parentGoal.year}` },
    quarterly: { next: 'monthly', count: 3, getName: (i, q) => {
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const monthIndex = (q - 1) * 3 + i;
      return monthNames[monthIndex];
    }},
    monthly: { next: 'weekly', count: 4, getName: (i, month) => `Semaine ${i + 1}` },
    weekly: { next: 'daily', count: 7, getName: (i) => {
      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      return days[i];
    }}
  };
  
  const config = levelHierarchy[parentGoal.level];
  if (!config) {
    throw new Error('Niveau de décomposition invalide');
  }
  
  // Calculer la valeur cible pour chaque enfant
  const childTargetValue = parentGoal.target_value / config.count;
  
  // Créer les sous-objectifs
  const childrenPromises = [];
  
  for (let i = 0; i < config.count; i++) {
    const childData = {
      user: parentGoal.user,
      level: config.next,
      category: parentGoal.category,
      title: `${parentGoal.title} - ${config.getName(i, parentGoal.quarter || parentGoal.month)}`,
      description: parentGoal.description,
      type: 'numeric',
      target_value: Math.round(childTargetValue * 100) / 100,
      current_value: 0,
      unit: parentGoal.unit,
      parent_goal_id: parentGoal._id,
      breakdown_auto: true,
      year: parentGoal.year,
      color: parentGoal.color,
      icon: parentGoal.icon,
      priority: parentGoal.priority,
      display_in_hierarchy: parentGoal.display_in_hierarchy,
      display_in_checklist: false
    };
    
    // Ajouter les métadonnées temporelles spécifiques
    if (config.next === 'quarterly') {
      childData.quarter = i + 1;
    } else if (config.next === 'monthly') {
      childData.month = (parentGoal.quarter - 1) * 3 + i + 1;
      childData.quarter = parentGoal.quarter;
    } else if (config.next === 'weekly') {
      childData.week = (parentGoal.month - 1) * 4 + i + 1;
      childData.month = parentGoal.month;
      childData.quarter = parentGoal.quarter;
    } else if (config.next === 'daily') {
      // Pour daily, on devra calculer la date exacte
      childData.week = parentGoal.week;
      childData.month = parentGoal.month;
      childData.quarter = parentGoal.quarter;
    }
    
    // Définir deadline si le parent en a une
    if (parentGoal.deadline) {
      const parentStart = parentGoal.createdAt;
      const parentEnd = parentGoal.deadline;
      const totalDuration = parentEnd - parentStart;
      const childDuration = totalDuration / config.count;
      
      childData.deadline = new Date(parentStart.getTime() + (childDuration * (i + 1)));
    }
    
    childrenPromises.push(Goal.create(childData));
  }
  
  const children = await Promise.all(childrenPromises);
  
  // Mettre à jour le parent avec les IDs des enfants
  parentGoal.children_goal_ids = children.map(child => child._id);
  await parentGoal.save();
  
  result.children = children.map(child => ({
    id: child._id,
    level: child.level,
    title: child.title,
    target_value: child.target_value
  }));
  
  return result;
};

/**
 * Propage la progression vers le parent (système hybride)
 * @param {String} goalId - ID de l'objectif qui a progressé
 * @param {Number} amount - Montant à propager
 */
goalSchema.statics.propagateProgressUp = async function(goalId, amount) {
  const Goal = this;
  const goal = await Goal.findById(goalId);
  
  if (!goal || !goal.parent_goal_id) {
    return; // Pas de parent, arrêter la propagation
  }
  
  // Système hybride : on stocke la progression pour daily, monthly, annual
  if (goal.level === 'daily') {
    // Update le mensuel parent
    const monthlyGoal = await Goal.findById(goal.parent_goal_id);
    if (monthlyGoal) {
      monthlyGoal.current_value += amount;
      await monthlyGoal.updateProgressAndStatus();
      
      // Update l'annuel si disponible
      if (monthlyGoal.parent_goal_id) {
        const quarterlyGoal = await Goal.findById(monthlyGoal.parent_goal_id);
        if (quarterlyGoal && quarterlyGoal.parent_goal_id) {
          const annualGoal = await Goal.findById(quarterlyGoal.parent_goal_id);
          if (annualGoal) {
            annualGoal.current_value += amount;
            await annualGoal.updateProgressAndStatus();
          }
        }
      }
    }
  }
};

/**
 * Recalcule la progression d'un objectif en agrégeant ses enfants
 * @param {String} goalId - ID de l'objectif
 */
goalSchema.statics.recalculateFromChildren = async function(goalId) {
  const Goal = this;
  const goal = await Goal.findById(goalId).populate('children_goal_ids');
  
  if (!goal || goal.children_goal_ids.length === 0) {
    return;
  }
  
  // Si l'objectif a des enfants et que breakdown_auto est actif
  if (goal.breakdown_auto && goal.type === 'numeric') {
    // Calculer la somme des current_value des enfants
    const totalChildrenValue = goal.children_goal_ids.reduce((sum, child) => {
      return sum + (child.current_value || 0);
    }, 0);
    
    goal.current_value = totalChildrenValue;
    await goal.updateProgressAndStatus();
  }
};

// ==================== HOOKS ====================

// Hook pre-save pour calculer total_steps si steps est fourni
goalSchema.pre('save', function(next) {
  if (this.type === 'steps' && this.steps.length > 0) {
    this.total_steps = this.steps.length;
    this.completed_steps = this.steps.filter(step => step.completed).length;
  }
  next();
});

// Hook post-save pour mettre à jour le statut
goalSchema.post('save', async function(doc) {
  if (doc.type === 'numeric' || doc.type === 'steps') {
    doc.progress_percent = doc.calculateProgress();
    doc.status = doc.calculateStatus();
    
    // Pas de save() ici pour éviter boucle infinie
    // On met à jour directement sans trigger les hooks
    await this.constructor.updateOne(
      { _id: doc._id },
      { 
        $set: { 
          progress_percent: doc.progress_percent,
          status: doc.status
        }
      }
    );
  }
});

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;