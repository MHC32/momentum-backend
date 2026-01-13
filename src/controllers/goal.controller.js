const Goal = require('../models/Goal.model');
const Task = require('../models/Task.model');

// ==================== CRÉATION ====================

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

    // Si objectif annuel numérique avec auto_decompose
    if (goal.auto_decompose && goal.type === 'numeric' && goal.level === 'annual') {
      try {
        const breakdown = await Goal.autoBreakdown(goal._id);
        
        // Émettre via Socket.IO
        if (req.io) {
          req.io.to(`user:${req.user._id}`).emit('goal-created', {
            goal,
            breakdown
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Objectif créé avec décomposition automatique',
          data: {
            goal,
            breakdown
          }
        });
      } catch (breakdownError) {
        console.error('Erreur décomposition:', breakdownError);
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

// ==================== VUE ANNUEL ====================

/**
 * Obtenir tous les objectifs annuels
 * GET /api/goals/annual
 */
exports.getAnnualGoals = async (req, res) => {
  try {
    const { year, category } = req.query;
    
    const filter = {
      user: req.user._id,
      level: 'annual',
      year: parseInt(year) || new Date().getFullYear(),
      display_in_hierarchy: true
    };

    if (category && category !== 'null') {
      filter.category = category;
    }

    const goals = await Goal.find(filter)
      .sort({ category: 1, priority: -1, createdAt: 1 });

    // Recalculer progress et status
    for (const goal of goals) {
      goal.progress_percent = goal.calculateProgress();
      goal.status = goal.calculateStatus();
    }

    // Grouper par catégorie
    const goalsByCategory = goals.reduce((acc, goal) => {
      if (!acc[goal.category]) {
        acc[goal.category] = [];
      }
      acc[goal.category].push(goal);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: goals.length,
      data: {
        goals,
        goalsByCategory
      }
    });

  } catch (error) {
    console.error('Erreur getAnnualGoals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des objectifs annuels',
      error: error.message
    });
  }
};

// ==================== VUE TRIMESTRIEL 🆕 MODIFIÉ ====================

/**
 * Obtenir les objectifs d'un trimestre
 * GET /api/goals/quarterly/:quarter
 * 
 * 🆕 MODIFICATIONS:
 * - Populate parent_annual_id pour contexte
 * - Ajouter hierarchyContext calculé
 */
exports.getQuarterlyGoals = async (req, res) => {
  try {
    const { quarter } = req.params;
    const { year, category } = req.query;
    
    const quarterNum = parseInt(quarter);
    const yearNum = parseInt(year) || new Date().getFullYear();

    if (quarterNum < 1 || quarterNum > 4) {
      return res.status(400).json({
        success: false,
        message: 'Le trimestre doit être entre 1 et 4'
      });
    }

    // 1. Objectifs trimestriels décomposés
    const breakdownFilter = {
      user: req.user._id,
      level: 'quarterly',
      quarter: quarterNum,
      year: yearNum,
      parent_annual_id: { $ne: null }
    };

    if (category && category !== 'null') {
      breakdownFilter.category = category;
    }

    // 🆕 Populate parent_annual_id pour obtenir info de l'annual
    const breakdownGoals = await Goal.find(breakdownFilter)
      .populate('parent_annual_id', 'title target_value unit')
      .sort({ category: 1, priority: -1 });

    // 🆕 Ajouter hierarchyContext calculé
    breakdownGoals.forEach(goal => {
      if (goal.parent_annual_id) {
        const percent = Math.round((goal.target_value / goal.parent_annual_id.target_value) * 100);
        goal._doc.hierarchyContext = `Q${goal.quarter} - ${percent}% de ${goal.parent_annual_id.target_value} ${goal.parent_annual_id.unit}`;
      }
    });

    // 2. Objectifs personnels pour ce trimestre
    const personalFilter = {
      user: req.user._id,
      is_personal: true,
      $or: [
        { personal_duration_type: 'this_quarter', quarter: quarterNum },
        { 
          deadline: {
            $gte: new Date(yearNum, (quarterNum - 1) * 3, 1),
            $lte: new Date(yearNum, quarterNum * 3, 0, 23, 59, 59)
          }
        }
      ],
      year: yearNum
    };

    if (category && category !== 'null') {
      personalFilter.category = category;
    }

    const personalGoals = await Goal.find(personalFilter)
      .sort({ priority: -1, deadline: 1 });

    // Combiner
    const allGoals = [...breakdownGoals, ...personalGoals];

    // Recalculer progress
    for (const goal of allGoals) {
      goal.progress_percent = goal.calculateProgress();
      goal.status = goal.calculateStatus();
    }

    // Grouper par catégorie
    const goalsByCategory = allGoals.reduce((acc, goal) => {
      if (!acc[goal.category]) {
        acc[goal.category] = [];
      }
      acc[goal.category].push(goal);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: allGoals.length,
      data: {
        quarter: quarterNum,
        year: yearNum,
        goals: allGoals,
        goalsByCategory,
        breakdown: breakdownGoals.length,
        personal: personalGoals.length
      }
    });

  } catch (error) {
    console.error('Erreur getQuarterlyGoals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des objectifs trimestriels',
      error: error.message
    });
  }
};

// ==================== VUE MENSUEL 🆕 MODIFIÉ ====================

/**
 * Obtenir les objectifs d'un mois
 * GET /api/goals/monthly/:month
 * 
 * 🆕 MODIFICATIONS:
 * - Populate parent_annual_id pour contexte
 * - Ajouter hierarchyContext avec flèche ↑
 * - Filtrer linked_tasks pour chaque goal
 */
exports.getMonthlyGoals = async (req, res) => {
  try {
    const { month } = req.params;
    const { year, category } = req.query;
    
    const monthNum = parseInt(month);
    const yearNum = parseInt(year) || new Date().getFullYear();

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Le mois doit être entre 1 et 12'
      });
    }

    // 1. Objectifs mensuels décomposés
    const breakdownFilter = {
      user: req.user._id,
      level: 'monthly',
      month: monthNum,
      year: yearNum,
      parent_annual_id: { $ne: null }
    };

    if (category && category !== 'null') {
      breakdownFilter.category = category;
    }

    // 🆕 Populate parent_annual_id
    const breakdownGoals = await Goal.find(breakdownFilter)
      .populate('parent_annual_id', 'title target_value unit')
      .sort({ category: 1, priority: -1 });

    // 🆕 Ajouter hierarchyContext avec flèche ↑
    breakdownGoals.forEach(goal => {
      if (goal.parent_annual_id) {
        goal._doc.hierarchyContext = `${goal.parent_annual_id.target_value} ${goal.parent_annual_id.unit} annuels`;
      }
    });

    // 2. Objectifs personnels avec deadline ce mois
    const startOfMonth = new Date(yearNum, monthNum - 1, 1);
    const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59);

    const personalFilter = {
      user: req.user._id,
      is_personal: true,
      $or: [
        { personal_duration_type: 'this_month', month: monthNum },
        {
          deadline: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      ],
      year: yearNum
    };

    if (category && category !== 'null') {
      personalFilter.category = category;
    }

    const personalGoals = await Goal.find(personalFilter)
      .sort({ priority: -1, deadline: 1 });

    // 3. Tâches du mois
    const tasks = await Task.find({
      user: req.user._id,
      deadline: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    }).select('_id title')
      .sort({ deadline: 1, priority: -1 });

    // Combiner
    const allGoals = [...breakdownGoals, ...personalGoals];

    // 🆕 FILTRER linked_tasks pour chaque goal
    allGoals.forEach(goal => {
      if (goal.linked_tasks && goal.linked_tasks.length > 0) {
        const linkedTasksPopulated = tasks
          .filter(t => goal.linked_tasks.some(id => id.equals(t._id)))
          .map(t => ({
            id: t._id,
            name: t.title
          }));
        
        goal._doc.linkedTasksPopulated = linkedTasksPopulated;
      } else {
        goal._doc.linkedTasksPopulated = [];
      }
    });

    // Recalculer progress
    for (const goal of allGoals) {
      goal.progress_percent = goal.calculateProgress();
      goal.status = goal.calculateStatus();
    }

    // Grouper par catégorie
    const goalsByCategory = allGoals.reduce((acc, goal) => {
      if (!acc[goal.category]) {
        acc[goal.category] = [];
      }
      acc[goal.category].push(goal);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: allGoals.length,
      data: {
        month: monthNum,
        year: yearNum,
        monthName: new Date(yearNum, monthNum - 1).toLocaleDateString('fr-FR', { month: 'long' }),
        goals: allGoals,
        goalsByCategory,
        tasks, // Toutes les tasks du mois
        breakdown: breakdownGoals.length,
        personal: personalGoals.length,
        tasksCount: tasks.length
      }
    });

  } catch (error) {
    console.error('Erreur getMonthlyGoals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des objectifs mensuels',
      error: error.message
    });
  }
};

// ==================== VUE HEBDOMADAIRE 🆕 MODIFIÉ ====================

/**
 * Obtenir les objectifs d'une semaine
 * GET /api/goals/weekly/:week
 * 
 * 🆕 MODIFICATIONS:
 * - Récupérer les 7 daily goals de la semaine
 * - Construire le breakdown pour DailyBreakdownGrid
 */
exports.getWeeklyGoals = async (req, res) => {
  try {
    const { week } = req.params;
    const { year, category } = req.query;
    
    const weekNum = parseInt(week);
    const yearNum = parseInt(year) || new Date().getFullYear();

    if (weekNum < 1 || weekNum > 53) {
      return res.status(400).json({
        success: false,
        message: 'La semaine doit être entre 1 et 53'
      });
    }

    // Calculer les dates de la semaine
    const { weekStart, weekEnd } = Goal.calculateWeekDates(weekNum, yearNum);
    
    // 1. Objectifs hebdomadaires décomposés
    const breakdownFilter = {
      user: req.user._id,
      level: 'weekly',
      week: weekNum,
      year: yearNum,
      parent_annual_id: { $ne: null }
    };

    if (category && category !== 'null') {
      breakdownFilter.category = category;
    }

    const breakdownGoals = await Goal.find(breakdownFilter)
      .sort({ category: 1, priority: -1 });

    // 🆕 2. Récupérer les 7 daily goals de cette semaine
    const dailyGoals = await Goal.find({
      user: req.user._id,
      level: 'daily',
      week: weekNum,
      year: yearNum,
      parent_annual_id: { $ne: null }
    }).sort({ day_of_year: 1 });

    // 🆕 3. Construire le dailyData pour le frontend
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const today = new Date();
    const todayDayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);

    const dailyData = dailyGoals.map(goal => {
      const dayDate = new Date(yearNum, 0, goal.day_of_year);
      const dayOfWeek = dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1; // Lun=0, Dim=6
      
      return {
        day: dayNames[dayOfWeek],
        value: goal.current_value,
        isCompleted: goal.completed,
        isToday: goal.day_of_year === todayDayOfYear,
        goal_id: goal._id
      };
    });

    // 4. Ajouter dailyData à chaque breakdownGoal
    breakdownGoals.forEach(goal => {
      goal._doc.dailyData = dailyData;
    });

    // 5. Objectifs personnels pour cette semaine
    const personalFilter = {
      user: req.user._id,
      is_personal: true,
      $or: [
        { personal_duration_type: 'this_week', week: weekNum },
        {
          deadline: {
            $gte: weekStart,
            $lte: weekEnd
          }
        }
      ],
      year: yearNum
    };

    if (category && category !== 'null') {
      personalFilter.category = category;
    }

    const personalGoals = await Goal.find(personalFilter)
      .sort({ priority: -1, deadline: 1 });

    // Combiner
    const allGoals = [...breakdownGoals, ...personalGoals];

    // Recalculer progress
    for (const goal of allGoals) {
      goal.progress_percent = goal.calculateProgress();
      goal.status = goal.calculateStatus();
    }

    // Grouper par catégorie
    const goalsByCategory = allGoals.reduce((acc, goal) => {
      if (!acc[goal.category]) {
        acc[goal.category] = [];
      }
      acc[goal.category].push(goal);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: allGoals.length,
      data: {
        week: weekNum,
        year: yearNum,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        goals: allGoals,
        goalsByCategory,
        breakdown: breakdownGoals.length,
        personal: personalGoals.length
      }
    });

  } catch (error) {
    console.error('Erreur getWeeklyGoals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des objectifs hebdomadaires',
      error: error.message
    });
  }
};

// ==================== VUE QUOTIDIEN 🆕 MODIFIÉ ====================

/**
 * Obtenir les objectifs quotidiens + Focus du jour
 * GET /api/goals/daily?date=2026-01-11
 * 
 * 🆕 MODIFICATIONS:
 * - Ajouter focusDescription généré
 */
exports.getDailyGoals = async (req, res) => {
  try {
    const { date, category } = req.query;
    const dateObj = date ? new Date(date) : new Date();
    
    dateObj.setHours(0, 0, 0, 0);

    const dayOfYear = Math.floor((dateObj - new Date(dateObj.getFullYear(), 0, 0)) / 86400000);
    const yearNum = dateObj.getFullYear();

    // 1. Objectifs quotidiens décomposés pour ce jour
    const breakdownFilter = {
      user: req.user._id,
      level: 'daily',
      day_of_year: dayOfYear,
      year: yearNum,
      parent_annual_id: { $ne: null }
    };

    if (category && category !== 'null') {
      breakdownFilter.category = category;
    }

    const breakdownGoals = await Goal.find(breakdownFilter)
      .sort({ category: 1, priority: -1 });

    // 2. Focus du jour
    const focusGoals = await Goal.getFocusOfTheDay(req.user._id, dateObj);

    const completedCount = focusGoals.filter(g => g.completed).length;
    const totalCount = focusGoals.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // 🆕 3. Générer focusDescription
    let focusDescription = 'Aucun objectif prioritaire aujourd\'hui';
    if (totalCount > 0) {
      if (totalCount === 1) {
        focusDescription = `Termine ${focusGoals[0].title}`;
      } else {
        focusDescription = `Termine tes ${totalCount} objectifs prioritaires du jour`;
      }
    }

    // 3. Objectifs personnels pour aujourd'hui
    const startOfDay = new Date(dateObj);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const personalFilter = {
      user: req.user._id,
      is_personal: true,
      deadline: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };

    if (category && category !== 'null') {
      personalFilter.category = category;
    }

    const personalGoals = await Goal.find(personalFilter)
      .sort({ priority: -1, createdAt: 1 });

    // Combiner
    const allGoals = [...breakdownGoals, ...focusGoals, ...personalGoals];

    // Recalculer progress
    for (const goal of allGoals) {
      goal.progress_percent = goal.calculateProgress();
      goal.status = goal.calculateStatus();
    }

    // Grouper par catégorie
    const goalsByCategory = allGoals.reduce((acc, goal) => {
      if (!acc[goal.category]) {
        acc[goal.category] = [];
      }
      acc[goal.category].push(goal);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: allGoals.length,
      data: {
        date: dateObj.toISOString(),
        dateFormatted: dateObj.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        }),
        goals: allGoals,
        goalsByCategory,
        focus: {
          goals: focusGoals,
          description: focusDescription, // 🆕 Description générée
          completedCount,
          totalCount,
          percentage
        },
        breakdown: breakdownGoals.length,
        personal: personalGoals.length
      }
    });

  } catch (error) {
    console.error('Erreur getDailyGoals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des objectifs quotidiens',
      error: error.message
    });
  }
};

// ==================== OBJECTIFS PERSONNELS ====================

/**
 * Obtenir les objectifs personnels
 * GET /api/goals/personal
 */
exports.getPersonalGoals = async (req, res) => {
  try {
    const { status, category } = req.query;
    
    const filter = {
      user: req.user._id,
      is_personal: true
    };

    if (status === 'ongoing') {
      filter.completed = false;
    } else if (status === 'completed') {
      filter.completed = true;
    }

    if (category && category !== 'null') {
      filter.category = category;
    }

    const goals = await Goal.find(filter)
      .sort({ priority: -1, createdAt: -1 });

    // Recalculer progress
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
    console.error('Erreur getPersonalGoals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des objectifs personnels',
      error: error.message
    });
  }
};

// ==================== CRUD DE BASE (inchangé) ====================

exports.getGoalById = async (req, res) => {
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

    const allowedUpdates = [
      'title',
      'description',
      'target_value',
      'current_value',
      'unit',
      'deadline',
      'color',
      'icon',
      'priority',
      'display_in_hierarchy',
      'display_in_checklist',
      'steps',
      'completed',
      'notes'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        goal[field] = req.body[field];
      }
    });

    await goal.save();

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

    // Si décomposé, supprimer tous les enfants
    if (goal.is_annual_breakdown && goal.children_goal_ids.length > 0) {
      await Goal.deleteMany({
        _id: { $in: goal.children_goal_ids }
      });
    }

    await goal.deleteOne();

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
 * Mettre à jour la progression (avec propagation)
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

    if (increment !== undefined) {
      goal.current_value += increment;
      amountChanged = increment;
    }
    
    if (value !== undefined) {
      amountChanged = value - goal.current_value;
      goal.current_value = value;
    }

    if (goal.current_value > goal.target_value) {
      goal.current_value = goal.target_value;
    }

    if (goal.current_value < 0) {
      goal.current_value = 0;
    }

    await goal.updateProgressAndStatus();

    // Propager vers les parents (incluant recalcul Weekly/Monthly)
    if (amountChanged !== 0 && goal.parent_annual_id) {
      await Goal.propagateProgressUp(goal._id, amountChanged);
    }

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

    const step = goal.steps.find(s => s.id === stepId);

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Étape non trouvée'
      });
    }

    step.completed = !step.completed;
    step.completed_at = step.completed ? new Date() : null;

    goal.completed_steps = goal.steps.filter(s => s.completed).length;

    await goal.updateProgressAndStatus();

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

// ==================== STATS ====================

exports.getGoalsStats = async (req, res) => {
  try {
    const { year, category } = req.query;

    const filter = { user: req.user._id };
    if (year) filter.year = parseInt(year);
    if (category && category !== 'null') filter.category = category;

    const statusCounts = await Goal.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

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

module.exports = exports;