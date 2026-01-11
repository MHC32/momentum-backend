const Goal = require('../models/Goal.model');
const Project = require('../models/Project.model');
const Task = require('../models/Task.model');

// ==================== CRUD DE BASE ====================

/**
 * Créer un nouvel objectif
 * POST /api/goals
 */
exports.createGoal = async (req, res) => {
  try {
    const goalData = {
      ...req.body,
      user: req.user._id
    };

    // Créer l'objectif
    const goal = await Goal.create(goalData);

    // Si breakdown_auto est activé et que c'est un objectif numérique
    if (goal.breakdown_auto && goal.type === 'numeric' && goal.level !== 'daily' && goal.level !== 'none') {
      try {
        const breakdownResult = await Goal.autoBreakdown(goal._id);
        
        // Émettre via Socket.IO
        if (req.io) {
          req.io.to(`user:${req.user._id}`).emit('goal-created', {
            goal,
            breakdown: breakdownResult
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Objectif créé avec décomposition automatique',
          data: {
            goal,
            breakdown: breakdownResult
          }
        });
      } catch (breakdownError) {
        console.error('Erreur décomposition:', breakdownError);
        // L'objectif est créé, mais la décomposition a échoué
        return res.status(201).json({
          success: true,
          message: 'Objectif créé mais décomposition échouée',
          data: { goal },
          warning: breakdownError.message
        });
      }
    }

    // Émettre via Socket.IO
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('goal-created', { goal });
    }

    res.status(201).json({
      success: true,
      message: 'Objectif créé avec succès',
      data: { goal }
    });

  } catch (error) {
    console.error('Erreur createGoal:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'objectif',
      error: error.message
    });
  }
};

/**
 * Obtenir tous les objectifs avec filtres
 * GET /api/goals
 */
exports.getGoals = async (req, res) => {
  try {
    const {
      level,
      category,
      status,
      year,
      quarter,
      month,
      week,
      display_in_hierarchy,
      display_in_checklist,
      parent_goal_id,
      include_children
    } = req.query;

    // Construire le filtre
    const filter = { user: req.user._id };

    if (level) filter.level = level;
    
    // ✅ FIX : Ne pas ajouter category si elle est null ou la string "null"
    if (category && category !== 'null') {
      filter.category = category;
    }
    
    if (status) filter.status = status;
    if (year) filter.year = parseInt(year);
    if (quarter) filter.quarter = parseInt(quarter);
    if (month) filter.month = parseInt(month);
    if (week) filter.week = parseInt(week);
    
    if (display_in_hierarchy !== undefined) {
      filter.display_in_hierarchy = display_in_hierarchy === 'true';
    }
    
    if (display_in_checklist !== undefined) {
      filter.display_in_checklist = display_in_checklist === 'true';
    }

    if (parent_goal_id !== undefined) {
      filter.parent_goal_id = parent_goal_id === 'null' ? null : parent_goal_id;
    }

    // Requête avec population optionnelle
    let query = Goal.find(filter).sort({ createdAt: -1 });

    if (include_children === 'true') {
      query = query.populate('children_goal_ids');
    }

    const goals = await query;

    // Recalculer progress et status pour chaque objectif
    for (const goal of goals) {
      goal.progress_percent = goal.calculateProgress();
      goal.status = goal.calculateStatus();
    }

    res.status(200).json({
      success: true,
      count: goals.length,
      data: { goals }
    });

  } catch (error) {
    console.error('Erreur getGoals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des objectifs',
      error: error.message
    });
  }
};

/**
 * Obtenir un objectif par ID
 * GET /api/goals/:id
 */
exports.getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('children_goal_ids')
      .populate('parent_goal_id')
      .populate('linked_projects');

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Objectif non trouvé'
      });
    }

    // Recalculer progress et status
    goal.progress_percent = goal.calculateProgress();
    goal.status = goal.calculateStatus();

    res.status(200).json({
      success: true,
      data: { goal }
    });

  } catch (error) {
    console.error('Erreur getGoalById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'objectif',
      error: error.message
    });
  }
};

/**
 * Mettre à jour un objectif
 * PUT /api/goals/:id
 */
exports.updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Objectif non trouvé'
      });
    }

    // Champs autorisés à être modifiés
    const allowedUpdates = [
      'title',
      'description',
      'target_value',
      'unit',
      'deadline',
      'color',
      'icon',
      'priority',
      'display_in_hierarchy',
      'display_in_checklist',
      'steps'
    ];

    // Appliquer les mises à jour
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        goal[field] = req.body[field];
      }
    });

    await goal.save();

    // Émettre via Socket.IO
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('goal-updated', { goal });
    }

    res.status(200).json({
      success: true,
      message: 'Objectif mis à jour avec succès',
      data: { goal }
    });

  } catch (error) {
    console.error('Erreur updateGoal:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'objectif',
      error: error.message
    });
  }
};

/**
 * Supprimer un objectif
 * DELETE /api/goals/:id
 */
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Objectif non trouvé'
      });
    }

    // Si breakdown_auto est activé, supprimer tous les enfants
    if (goal.breakdown_auto && goal.children_goal_ids.length > 0) {
      await Goal.deleteMany({
        _id: { $in: goal.children_goal_ids }
      });
    }

    await goal.deleteOne();

    // Émettre via Socket.IO
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('goal-deleted', { 
        goalId: req.params.id 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Objectif supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur deleteGoal:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'objectif',
      error: error.message
    });
  }
};

// ==================== PROGRESSION ====================

/**
 * Mettre à jour la progression d'un objectif
 * PUT /api/goals/:id/progress
 */
exports.updateProgress = async (req, res) => {
  try {
    const { increment, value } = req.body;

    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Objectif non trouvé'
      });
    }

    if (goal.type !== 'numeric') {
      return res.status(400).json({
        success: false,
        message: 'Seuls les objectifs numériques peuvent être mis à jour ainsi'
      });
    }

    let amountChanged = 0;

    // Mise à jour par incrément
    if (increment !== undefined) {
      goal.current_value += increment;
      amountChanged = increment;
    }
    
    // Mise à jour par valeur absolue
    if (value !== undefined) {
      amountChanged = value - goal.current_value;
      goal.current_value = value;
    }

    // S'assurer que current_value ne dépasse pas target_value
    if (goal.current_value > goal.target_value) {
      goal.current_value = goal.target_value;
    }

    // S'assurer que current_value n'est pas négatif
    if (goal.current_value < 0) {
      goal.current_value = 0;
    }

    await goal.updateProgressAndStatus();

    // Propager vers le parent (système hybride)
    if (amountChanged !== 0) {
      await Goal.propagateProgressUp(goal._id, amountChanged);
    }

    // Émettre via Socket.IO
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('goal-progress-updated', { 
        goal,
        amountChanged
      });
    }

    res.status(200).json({
      success: true,
      message: 'Progression mise à jour avec succès',
      data: { 
        goal,
        amountChanged
      }
    });

  } catch (error) {
    console.error('Erreur updateProgress:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la progression',
      error: error.message
    });
  }
};

/**
 * Compléter une étape d'un objectif
 * PUT /api/goals/:id/steps/:stepId/complete
 */
exports.completeStep = async (req, res) => {
  try {
    const { id, stepId } = req.params;

    const goal = await Goal.findOne({
      _id: id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Objectif non trouvé'
      });
    }

    if (goal.type !== 'steps') {
      return res.status(400).json({
        success: false,
        message: 'Cet objectif n\'a pas d\'étapes'
      });
    }

    // Trouver l'étape
    const step = goal.steps.find(s => s.id === stepId);

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Étape non trouvée'
      });
    }

    // Toggle l'état de completion
    step.completed = !step.completed;
    step.completed_at = step.completed ? new Date() : null;

    // Recalculer completed_steps
    goal.completed_steps = goal.steps.filter(s => s.completed).length;

    await goal.updateProgressAndStatus();

    // Émettre via Socket.IO
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('goal-step-completed', { 
        goal,
        stepId,
        completed: step.completed
      });
    }

    res.status(200).json({
      success: true,
      message: step.completed ? 'Étape complétée' : 'Étape décompletée',
      data: { goal }
    });

  } catch (error) {
    console.error('Erreur completeStep:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la complétion de l\'étape',
      error: error.message
    });
  }
};

// ==================== INTÉGRATIONS ====================

/**
 * Synchroniser l'objectif commits avec les commits des tasks
 * POST /api/goals/sync-commits
 */
exports.syncCommitsGoal = async (req, res) => {
  try {
    // Trouver l'objectif avec commits_integration activée
    const goal = await Goal.findOne({
      user: req.user._id,
      'commits_integration.enabled': true,
      level: { $in: ['annual', 'monthly', 'daily'] }
    }).sort({ level: 1 }); // Prendre le plus haut niveau (annual)

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Aucun objectif avec intégration commits trouvé'
      });
    }

    // Compter tous les commits depuis toutes les tasks de l'utilisateur
    const tasks = await Task.find({
      user: req.user._id,
      'commits.0': { $exists: true }
    });

    const totalCommits = tasks.reduce((sum, task) => {
      return sum + (task.commits ? task.commits.length : 0);
    }, 0);

    // Mettre à jour l'objectif
    const previousValue = goal.current_value;
    goal.current_value = totalCommits;
    await goal.updateProgressAndStatus();

    // Propager vers les enfants si nécessaire
    const amountChanged = totalCommits - previousValue;
    if (amountChanged !== 0) {
      await Goal.propagateProgressUp(goal._id, amountChanged);
    }

    // Émettre via Socket.IO
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('goal-commits-synced', { 
        goal,
        totalCommits,
        amountChanged
      });
    }

    res.status(200).json({
      success: true,
      message: 'Objectif commits synchronisé',
      data: { 
        goal,
        totalCommits,
        amountChanged
      }
    });

  } catch (error) {
    console.error('Erreur syncCommitsGoal:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la synchronisation des commits',
      error: error.message
    });
  }
};

/**
 * Synchroniser l'objectif livres avec un projet terminé
 * POST /api/goals/sync-book/:projectId
 */
exports.syncBookGoal = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Trouver le projet
    const project = await Project.findOne({
      _id: projectId,
      user: req.user._id,
      type: 'book'
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet livre non trouvé'
      });
    }

    // Vérifier si le projet est complété à 100%
    if (project.progress < 100) {
      return res.status(400).json({
        success: false,
        message: 'Le projet n\'est pas encore terminé'
      });
    }

    // Trouver l'objectif d'apprentissage (livres)
    const goal = await Goal.findOne({
      user: req.user._id,
      category: 'learning',
      type: 'numeric',
      unit: 'livres'
    }).sort({ level: 1 }); // Prendre le plus haut niveau (annual)

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Aucun objectif livres trouvé'
      });
    }

    // Incrémenter l'objectif
    goal.current_value += 1;
    await goal.updateProgressAndStatus();

    // Propager
    await Goal.propagateProgressUp(goal._id, 1);

    // Émettre via Socket.IO
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('book-completed', { 
        goal,
        project,
        bookTitle: project.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Livre complété et objectif mis à jour',
      data: { 
        goal,
        project
      }
    });

  } catch (error) {
    console.error('Erreur syncBookGoal:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la synchronisation du livre',
      error: error.message
    });
  }
};

/**
 * Recalculer la progression d'un objectif depuis ses enfants
 * POST /api/goals/:id/recalculate
 */
exports.recalculateFromChildren = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Objectif non trouvé'
      });
    }

    await Goal.recalculateFromChildren(goal._id);

    // Recharger l'objectif mis à jour
    const updatedGoal = await Goal.findById(goal._id);

    // Émettre via Socket.IO
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('goal-recalculated', { 
        goal: updatedGoal
      });
    }

    res.status(200).json({
      success: true,
      message: 'Objectif recalculé avec succès',
      data: { goal: updatedGoal }
    });

  } catch (error) {
    console.error('Erreur recalculateFromChildren:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du recalcul',
      error: error.message
    });
  }
};

// ==================== STATS & ANALYTICS ====================

/**
 * Obtenir les statistiques des objectifs
 * GET /api/goals/stats
 */
exports.getGoalsStats = async (req, res) => {
  try {
    const { year, category } = req.query;

    const filter = { user: req.user._id };
    if (year) filter.year = parseInt(year);
    if (category && category !== 'null') filter.category = category;

    // Compter par statut
    const statusCounts = await Goal.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Compter par catégorie
    const categoryCounts = await Goal.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progress_percent' }
        }
      }
    ]);

    // Progression globale
    const goals = await Goal.find(filter);
    const totalProgress = goals.reduce((sum, goal) => sum + goal.progress_percent, 0);
    const avgProgress = goals.length > 0 ? totalProgress / goals.length : 0;

    res.status(200).json({
      success: true,
      data: {
        totalGoals: goals.length,
        avgProgress: Math.round(avgProgress * 100) / 100,
        statusCounts,
        categoryCounts
      }
    });

  } catch (error) {
    console.error('Erreur getGoalsStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
};

// ==================== FONCTIONS INTERNES (pour webhooks) ====================

/**
 * Synchroniser l'objectif commits (version interne pour webhooks)
 * Utilisée par webhook.controller.js
 */
exports.syncCommitsGoalInternal = async (userId, io) => {
  try {
    const goal = await Goal.findOne({
      user: userId,
      'commits_integration.enabled': true,
      level: { $in: ['annual', 'monthly', 'daily'] }
    }).sort({ level: 1 });

    if (!goal) return null;

    const tasks = await Task.find({
      user: userId,
      'commits.0': { $exists: true }
    });

    const totalCommits = tasks.reduce((sum, task) => {
      return sum + (task.commits ? task.commits.length : 0);
    }, 0);

    const previousValue = goal.current_value;
    goal.current_value = totalCommits;
    await goal.updateProgressAndStatus();

    const amountChanged = totalCommits - previousValue;
    if (amountChanged !== 0) {
      await Goal.propagateProgressUp(goal._id, amountChanged);
    }

    if (io) {
      io.to(`user:${userId}`).emit('goal-commits-synced', { 
        goal,
        totalCommits,
        amountChanged
      });
    }

    return { goal, totalCommits, amountChanged };
  } catch (error) {
    console.error('Erreur syncCommitsGoalInternal:', error);
    return null;
  }
};

/**
 * Synchroniser l'objectif livres (version interne pour task.controller.js)
 * Utilisée par task.controller.js quand un projet book est complété
 */
exports.syncBookGoalInternal = async (projectId, userId, io) => {
  try {
    const project = await Project.findOne({
      _id: projectId,
      user: userId,
      type: 'book'
    });

    if (!project || project.progress < 100) {
      return null;
    }

    const goal = await Goal.findOne({
      user: userId,
      category: 'learning',
      type: 'numeric',
      unit: 'livres'
    }).sort({ level: 1 });

    if (!goal) return null;

    goal.current_value += 1;
    await goal.updateProgressAndStatus();
    await Goal.propagateProgressUp(goal._id, 1);

    if (io) {
      io.to(`user:${userId}`).emit('book-completed', { 
        goal,
        project,
        bookTitle: project.name
      });
    }

    return { goal, project };
  } catch (error) {
    console.error('Erreur syncBookGoalInternal:', error);
    return null;
  }
};

module.exports = exports;