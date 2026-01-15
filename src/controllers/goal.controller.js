const Goal = require('../models/Goal.model');
const GoalBreakdown = require('../models/GoalBreakdown.model');
const Task = require('../models/Task.model');
const Project = require('../models/Project.model');

// Helper pour émettre via Socket.IO
const emitGoalUpdate = (req, goal, type = 'goal-updated') => {
  const io = req.app.get('io');
  if (io && goal.user) {
    io.to(`user:${goal.user}`).emit(type, {
      goal: goal.toObject ? goal.toObject() : goal,
      type
    });
  }
};

// Helper pour logger l'activité
const logActivity = async (userId, activityType, entityType, entityId, details) => {
  try {
    // À implémenter quand ActivityLog.model sera créé
    console.log(`[ActivityLog] ${activityType}: ${entityType} ${entityId}`, details);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// ==================== CRÉATION ====================

/**
 * @desc    Create new goal
 * @route   POST /api/goals
 * @access  Private
 */
exports.createGoal = async (req, res) => {
  try {
    req.body.user = req.user.id;
    
    const goal = await Goal.create(req.body);
    
    // Générer les breakdowns si demandé
    if (req.body.auto_generate_breakdown && 
        (goal.goal_type === 'numeric_target' || goal.goal_type === 'financial_target' || goal.goal_type === 'numeric_progress') &&
        goal.period_type === 'annual') {
      
      try {
        await GoalBreakdown.generateBreakdown(goal._id, 'daily');
        console.log(`✅ Generated daily breakdowns for goal: ${goal.title}`);
      } catch (breakdownError) {
        console.error('Error generating breakdowns:', breakdownError.message);
        // Continuer même si breakdown échoue
      }
    }
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'goal_created',
      'goal',
      goal._id,
      { title: goal.title, type: goal.goal_type }
    );
    
    // Émettre via Socket.IO
    emitGoalUpdate(req, goal, 'goal-created');
    
    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: goal
    });
  } catch (error) {
    console.error('Create Goal Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating goal',
      error: error.message
    });
  }
};

// ==================== VUES HIÉRARCHIQUES ====================

/**
 * @desc    Get annual goals
 * @route   GET /api/goals/annual
 * @access  Private
 */
exports.getAnnualGoals = async (req, res) => {
  try {
    const { year, category } = req.query;
    
    const filter = {
      user: req.user.id,
      period_type: 'annual',
      year: parseInt(year) || new Date().getFullYear(),
      'display_config.show_in_annual': true
    };
    
    if (category && category !== 'null') {
      filter.category = category;
    }
    
    const goals = await Goal.find(filter)
      .sort({ 
        'display_config.priority': -1,
        createdAt: -1 
      });
    
    // Calculer les stats pour chaque goal
    const goalsWithStats = await Promise.all(
      goals.map(async (goal) => {
        await goal.updateProgressAndStatus();
        
        // Récupérer les breakdowns pour les stats
        const breakdowns = await GoalBreakdown.find({
          goal: goal._id,
          user: req.user.id
        });
        
        const dailyBreakdowns = breakdowns.filter(b => b.level === 'daily');
        const weeklyBreakdowns = breakdowns.filter(b => b.level === 'weekly');
        
        return {
          ...goal.toObject(),
          stats: {
            total_breakdowns: breakdowns.length,
            completed_breakdowns: breakdowns.filter(b => b.completed).length,
            daily_completion_rate: dailyBreakdowns.length > 0 ? 
              (dailyBreakdowns.filter(b => b.completed).length / dailyBreakdowns.length) * 100 : 0,
            weekly_completion_rate: weeklyBreakdowns.length > 0 ? 
              (weeklyBreakdowns.filter(b => b.completed).length / weeklyBreakdowns.length) * 100 : 0
          }
        };
      })
    );
    
    // Grouper par catégorie
    const goalsByCategory = goalsWithStats.reduce((acc, goal) => {
      if (!acc[goal.category]) {
        acc[goal.category] = [];
      }
      acc[goal.category].push(goal);
      return acc;
    }, {});
    
    res.status(200).json({
      success: true,
      count: goalsWithStats.length,
      data: {
        year: parseInt(year) || new Date().getFullYear(),
        goals: goalsWithStats,
        goalsByCategory,
        summary: {
          total: goalsWithStats.length,
          completed: goalsWithStats.filter(g => g.completed).length,
          in_progress: goalsWithStats.filter(g => !g.completed && g.progress_percentage > 0).length,
          not_started: goalsWithStats.filter(g => g.progress_percentage === 0).length
        }
      }
    });
  } catch (error) {
    console.error('Get Annual Goals Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching annual goals',
      error: error.message
    });
  }
};

/**
 * @desc    Get quarterly goals
 * @route   GET /api/goals/quarterly/:quarter
 * @access  Private
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
        message: 'Quarter must be between 1 and 4'
      });
    }
    
    // Objectifs trimestriels spécifiques
    const quarterlyGoals = await Goal.find({
      user: req.user.id,
      period_type: 'quarterly',
      quarter: quarterNum,
      year: yearNum,
      'display_config.show_in_quarterly': true
    }).sort({ 'display_config.priority': -1, deadline: 1 });
    
    // Objectifs annuels avec breakdowns pour ce trimestre
    const annualGoals = await Goal.find({
      user: req.user.id,
      period_type: 'annual',
      year: yearNum,
      'display_config.show_in_annual': true
    });
    
    // Récupérer les breakdowns trimestriels pour ces objectifs annuels
    const quarterlyBreakdowns = await GoalBreakdown.find({
      user: req.user.id,
      level: 'quarterly',
      quarter: quarterNum,
      year: yearNum
    }).populate('goal', 'title category unit');
    
    // Objectifs personnels pour ce trimestre
    const personalFilter = {
      user: req.user.id,
      category: 'personal',
      $or: [
        { period_type: 'quarterly', quarter: quarterNum, year: yearNum },
        {
          deadline: {
            $gte: new Date(yearNum, (quarterNum - 1) * 3, 1),
            $lte: new Date(yearNum, quarterNum * 3, 0, 23, 59, 59)
          }
        }
      ]
    };
    
    if (category && category !== 'null') {
      personalFilter.category = category;
    }
    
    const personalGoals = await Goal.find(personalFilter)
      .sort({ 'display_config.priority': -1, deadline: 1 });
    
    // Combiner tous les objectifs
    const allGoals = [...quarterlyGoals, ...personalGoals];
    
    // Mettre à jour la progression pour chaque goal
    for (const goal of allGoals) {
      await goal.updateProgressAndStatus();
    }
    
    // Dates du trimestre
    const quarterStart = new Date(yearNum, (quarterNum - 1) * 3, 1);
    const quarterEnd = new Date(yearNum, quarterNum * 3, 0, 23, 59, 59);
    
    res.status(200).json({
      success: true,
      count: allGoals.length,
      data: {
        quarter: quarterNum,
        year: yearNum,
        quarterStart: quarterStart.toISOString(),
        quarterEnd: quarterEnd.toISOString(),
        goals: allGoals,
        quarterlyBreakdowns,
        personalGoals,
        summary: {
          total: allGoals.length,
          from_annual: quarterlyBreakdowns.length,
          personal: personalGoals.length,
          completed: allGoals.filter(g => g.completed).length
        }
      }
    });
  } catch (error) {
    console.error('Get Quarterly Goals Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quarterly goals',
      error: error.message
    });
  }
};

/**
 * @desc    Get monthly goals
 * @route   GET /api/goals/monthly/:month
 * @access  Private
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
        message: 'Month must be between 1 and 12'
      });
    }
    
    // Objectifs mensuels spécifiques
    const monthlyGoals = await Goal.find({
      user: req.user.id,
      period_type: 'monthly',
      month: monthNum,
      year: yearNum,
      'display_config.show_in_monthly': true
    }).sort({ 'display_config.priority': -1, deadline: 1 });
    
    // Récupérer les breakdowns mensuels pour les objectifs annuels
    const monthlyBreakdowns = await GoalBreakdown.find({
      user: req.user.id,
      level: 'monthly',
      month: monthNum,
      year: yearNum
    }).populate('goal', 'title category unit');
    
    // Objectifs avec deadline ce mois
    const monthStart = new Date(yearNum, monthNum - 1, 1);
    const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);
    
    const deadlineGoals = await Goal.find({
      user: req.user.id,
      deadline: {
        $gte: monthStart,
        $lte: monthEnd
      },
      completed: false,
      'display_config.show_in_focus': true
    }).sort({ deadline: 1, 'display_config.priority': -1 });
    
    // Tâches du mois liées aux objectifs
    const tasks = await Task.find({
      user: req.user.id,
      deadline: {
        $gte: monthStart,
        $lte: monthEnd
      }
    }).select('_id title status project')
      .populate('project', 'name')
      .sort({ deadline: 1, priority: -1 });
    
    // Combiner
    const allGoals = [...monthlyGoals, ...deadlineGoals];
    
    // Mettre à jour la progression
    for (const goal of allGoals) {
      await goal.updateProgressAndStatus();
    }
    
    // Grouper les tâches par objectif
    const tasksByGoal = {};
    tasks.forEach(task => {
      // Chercher les objectifs qui ont cette tâche dans linked_tasks
      allGoals.forEach(goal => {
        if (goal.linked_tasks && goal.linked_tasks.some(id => id.equals(task._id))) {
          if (!tasksByGoal[goal._id]) {
            tasksByGoal[goal._id] = [];
          }
          tasksByGoal[goal._id].push(task);
        }
      });
    });
    
    res.status(200).json({
      success: true,
      count: allGoals.length,
      data: {
        month: monthNum,
        year: yearNum,
        monthName: new Date(yearNum, monthNum - 1).toLocaleDateString('fr-FR', { month: 'long' }),
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        goals: allGoals,
        monthlyBreakdowns,
        tasks,
        tasksByGoal,
        summary: {
          total: allGoals.length,
          monthly: monthlyGoals.length,
          deadlines: deadlineGoals.length,
          tasks: tasks.length,
          completed: allGoals.filter(g => g.completed).length
        }
      }
    });
  } catch (error) {
    console.error('Get Monthly Goals Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly goals',
      error: error.message
    });
  }
};

/**
 * @desc    Get weekly goals
 * @route   GET /api/goals/weekly/:week
 * @access  Private
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
        message: 'Week must be between 1 and 53'
      });
    }
    
    // Calculer les dates de la semaine (Lundi au Dimanche)
    const weekDates = GoalBreakdown.calculateWeekDates ?
      GoalBreakdown.calculateWeekDates(weekNum, yearNum) :
      calculateWeekDatesManual(weekNum, yearNum);
    
    // Objectifs hebdomadaires spécifiques
    const weeklyGoals = await Goal.find({
      user: req.user.id,
      period_type: 'weekly',
      week: weekNum,
      year: yearNum,
      'display_config.show_in_weekly': true
    }).sort({ 'display_config.priority': -1, deadline: 1 });
    
    // Récupérer les breakdowns quotidiens pour cette semaine
    const dailyBreakdowns = await GoalBreakdown.find({
      user: req.user.id,
      level: 'daily',
      week: weekNum,
      year: yearNum
    }).populate('goal', 'title category unit')
      .sort({ date: 1 });
    
    // Agréger par type d'objectif
    const goalsByType = {};
    
    dailyBreakdowns.forEach(breakdown => {
      const goal = breakdown.goal;
      if (!goal) return;
      
      const typeKey = goal.unit || goal.category || 'default';
      
      if (!goalsByType[typeKey]) {
        goalsByType[typeKey] = {
          title: getFriendlyTitle(typeKey),
          unit: goal.unit,
          weekly_target: 0,
          weekly_current: 0,
          daily_data: Array(7).fill(null)
        };
      }
      
      goalsByType[typeKey].weekly_target += breakdown.target_value;
      goalsByType[typeKey].weekly_current += breakdown.current_value;
      
      // Ajouter aux données quotidiennes
      const dayOfWeek = breakdown.date.getDay(); // 0=Dimanche, 1=Lundi...
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lundi=0, Dimanche=6
      
      if (goalsByType[typeKey].daily_data[adjustedDay]) {
        goalsByType[typeKey].daily_data[adjustedDay].value += breakdown.current_value;
        goalsByType[typeKey].daily_data[adjustedDay].completed = 
          goalsByType[typeKey].daily_data[adjustedDay].completed || breakdown.completed;
      } else {
        const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        goalsByType[typeKey].daily_data[adjustedDay] = {
          day: dayNames[adjustedDay],
          value: breakdown.current_value,
          completed: breakdown.completed,
          date: breakdown.date
        };
      }
    });
    
    // Objectifs avec deadline cette semaine
    const deadlineGoals = await Goal.find({
      user: req.user.id,
      deadline: {
        $gte: weekDates.weekStart,
        $lte: weekDates.weekEnd
      },
      completed: false,
      'display_config.show_in_focus': true
    }).sort({ deadline: 1 });
    
    // Focus du jour pour aujourd'hui
    const today = new Date();
    const focusGoals = await Goal.getFocusOfTheDay(req.user.id, today);
    
    // Combiner
    const allGoals = [...weeklyGoals, ...deadlineGoals, ...focusGoals];
    
    // Mettre à jour la progression
    for (const goal of allGoals) {
      await goal.updateProgressAndStatus();
    }
    
    res.status(200).json({
      success: true,
      count: allGoals.length,
      data: {
        week: weekNum,
        year: yearNum,
        weekStart: weekDates.weekStart.toISOString(),
        weekEnd: weekDates.weekEnd.toISOString(),
        goals: allGoals,
        goalsByType: Object.values(goalsByType),
        dailyBreakdowns,
        focusGoals,
        summary: {
          total: allGoals.length,
          weekly: weeklyGoals.length,
          deadlines: deadlineGoals.length,
          focus: focusGoals.length,
          completed: allGoals.filter(g => g.completed).length
        }
      }
    });
  } catch (error) {
    console.error('Get Weekly Goals Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly goals',
      error: error.message
    });
  }
};

/**
 * @desc    Get daily goals + focus of the day
 * @route   GET /api/goals/daily
 * @access  Private
 */
exports.getDailyGoals = async (req, res) => {
  try {
    const { date, category } = req.query;
    const dateObj = date ? new Date(date) : new Date();
    dateObj.setHours(0, 0, 0, 0);
    
    // Objectifs quotidiens spécifiques
    const dailyGoals = await Goal.find({
      user: req.user.id,
      period_type: 'daily',
      deadline: {
        $gte: dateObj,
        $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000)
      },
      'display_config.show_in_daily': true
    }).sort({ 'display_config.priority': -1 });
    
    // Focus du jour (objectifs prioritaires)
    const focusGoals = await Goal.getFocusOfTheDay(req.user.id, dateObj);
    
    // Breakdowns pour aujourd'hui
    const todayBreakdowns = await GoalBreakdown.find({
      user: req.user.id,
      level: 'daily',
      date: {
        $gte: dateObj,
        $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('goal', 'title category unit');
    
    // Objectifs avec deadline aujourd'hui
    const deadlineGoals = await Goal.find({
      user: req.user.id,
      deadline: {
        $gte: dateObj,
        $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000)
      },
      completed: false
    }).sort({ 'display_config.priority': -1 });
    
    // Tâches pour aujourd'hui liées aux objectifs
    const tasks = await Task.find({
      user: req.user.id,
      deadline: {
        $gte: dateObj,
        $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000)
      },
      status: { $ne: 'done' }
    }).select('_id title status priority project')
      .populate('project', 'name color')
      .sort({ priority: -1, deadline: 1 })
      .limit(5);
    
    // Combiner tous les objectifs
    const allGoals = [...dailyGoals, ...focusGoals, ...deadlineGoals];
    
    // Mettre à jour la progression
    for (const goal of allGoals) {
      await goal.updateProgressAndStatus();
    }
    
    // Calculer les stats du focus
    const completedFocus = focusGoals.filter(g => g.completed).length;
    const totalFocus = focusGoals.length;
    const focusPercentage = totalFocus > 0 ? Math.round((completedFocus / totalFocus) * 100) : 0;
    
    // Générer la description du focus
    let focusDescription = 'Aucun objectif prioritaire aujourd\'hui';
    if (totalFocus > 0) {
      if (totalFocus === 1) {
        focusDescription = `Termine "${focusGoals[0].title}"`;
      } else if (totalFocus <= 3) {
        const titles = focusGoals.map(g => `"${g.title}"`).join(', ');
        focusDescription = `Termine ${titles}`;
      } else {
        focusDescription = `Termine tes ${totalFocus} objectifs prioritaires`;
      }
    }
    
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
        focus: {
          goals: focusGoals,
          description: focusDescription,
          completed: completedFocus,
          total: totalFocus,
          percentage: focusPercentage
        },
        todayBreakdowns,
        tasks,
        summary: {
          total: allGoals.length,
          daily: dailyGoals.length,
          focus: focusGoals.length,
          deadlines: deadlineGoals.length,
          tasks: tasks.length,
          completed: allGoals.filter(g => g.completed).length
        }
      }
    });
  } catch (error) {
    console.error('Get Daily Goals Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily goals',
      error: error.message
    });
  }
};

/**
 * @desc    Get personal goals
 * @route   GET /api/goals/personal
 * @access  Private
 */
exports.getPersonalGoals = async (req, res) => {
  try {
    const { status, category } = req.query;
    
    const filter = {
      user: req.user.id,
      category: 'personal'
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
      .sort({ 
        'display_config.priority': -1,
        createdAt: -1 
      });
    
    // Mettre à jour la progression
    for (const goal of goals) {
      await goal.updateProgressAndStatus();
    }
    
    res.status(200).json({
      success: true,
      count: goals.length,
      data: {
        goals,
        summary: {
          total: goals.length,
          completed: goals.filter(g => g.completed).length,
          in_progress: goals.filter(g => !g.completed && g.progress_percentage > 0).length,
          not_started: goals.filter(g => g.progress_percentage === 0).length
        }
      }
    });
  } catch (error) {
    console.error('Get Personal Goals Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching personal goals',
      error: error.message
    });
  }
};

// ==================== CRUD DE BASE ====================

/**
 * @desc    Get goal by ID
 * @route   GET /api/goals/:id
 * @access  Private
 */
exports.getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    // Mettre à jour la progression
    await goal.updateProgressAndStatus();
    await goal.save();
    
    // Récupérer les breakdowns
    const breakdowns = await GoalBreakdown.find({
      goal: goal._id,
      user: req.user.id
    }).sort({ level: 1, date: 1 });
    
    // Récupérer les tâches liées
    const linkedTasks = await Task.find({
      _id: { $in: goal.linked_tasks }
    }).select('_id title status priority deadline')
      .populate('project', 'name color')
      .sort({ deadline: 1 });
    
    // Récupérer les projets liés
    const linkedProjects = await Project.find({
      _id: { $in: goal.linked_projects }
    }).select('_id name type progress');
    
    res.status(200).json({
      success: true,
      data: {
        goal,
        breakdowns,
        linkedTasks,
        linkedProjects,
        stats: {
          total_breakdowns: breakdowns.length,
          completed_breakdowns: breakdowns.filter(b => b.completed).length,
          linked_tasks: goal.linked_tasks.length,
          linked_projects: goal.linked_projects.length
        }
      }
    });
  } catch (error) {
    console.error('Get Goal By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching goal',
      error: error.message
    });
  }
};

/**
 * @desc    Update goal
 * @route   PUT /api/goals/:id
 * @access  Private
 */
exports.updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    const allowedUpdates = [
      'title',
      'description',
      'category',
      'goal_type',
      'period_type',
      'period_label',
      'year',
      'quarter',
      'month',
      'week',
      'target_count',
      'current_count',
      'target_value',
      'current_value',
      'unit',
      'steps',
      'start_date',
      'deadline',
      'integrations',
      'metadata',
      'display_config',
      'linked_tasks',
      'linked_projects',
      'linked_habit_id',
      'notes',
      'tags'
    ];
    
    // Filtrer les mises à jour autorisées
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        goal[key] = req.body[key];
      }
    });
    
    // Mise à jour spécifique pour steps
    if (req.body.steps) {
      goal.steps = req.body.steps;
      goal.steps_total = req.body.steps.length;
      goal.steps_completed = req.body.steps.filter(step => step.completed).length;
    }
    
    await goal.save();
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'goal_updated',
      'goal',
      goal._id,
      { title: goal.title, status: goal.status }
    );
    
    // Émettre via Socket.IO
    emitGoalUpdate(req, goal, 'goal-updated');
    
    res.status(200).json({
      success: true,
      message: 'Goal updated successfully',
      data: goal
    });
  } catch (error) {
    console.error('Update Goal Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating goal',
      error: error.message
    });
  }
};

/**
 * @desc    Delete goal
 * @route   DELETE /api/goals/:id
 * @access  Private
 */
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    // Supprimer tous les breakdowns associés
    await GoalBreakdown.deleteMany({
      goal: goal._id,
      user: req.user.id
    });
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'goal_deleted',
      'goal',
      goal._id,
      { title: goal.title, progress: goal.progress_percentage }
    );
    
    // Émettre via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('goal-deleted', {
        goalId: goal._id,
        type: 'goal-deleted'
      });
    }
    
    await goal.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Goal deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Delete Goal Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting goal',
      error: error.message
    });
  }
};

// ==================== PROGRESSION & BREAKDOWNS ====================

/**
 * @desc    Update goal progress
 * @route   PUT /api/goals/:id/progress
 * @access  Private
 */
exports.updateProgress = async (req, res) => {
  try {
    const { increment, value, breakdown_id, date } = req.body;
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    let amountChanged = 0;
    
    // Si un breakdown_id est fourni, mettre à jour via breakdown
    if (breakdown_id) {
      const result = await GoalBreakdown.propagateProgress(breakdown_id, increment || 0);
      amountChanged = increment || 0;
      
      // Logger l'activité
      await logActivity(
        req.user.id,
        'goal_progress_updated',
        'goal',
        goal._id,
        { 
          title: goal.title, 
          amount: amountChanged,
          via: 'breakdown' 
        }
      );
      
      // Émettre via Socket.IO
      emitGoalUpdate(req, result.goal, 'goal-progress-updated');
      
      res.status(200).json({
        success: true,
        message: 'Progress updated via breakdown',
        data: {
          goal: result.goal,
          breakdown: result.breakdown,
          amountChanged
        }
      });
      return;
    }
    
    // Sinon, mise à jour directe du goal
    if (increment !== undefined) {
      if (goal.goal_type === 'numeric_target') {
        goal.current_count = Math.min(goal.current_count + increment, goal.target_count);
        amountChanged = increment;
      } else if (goal.goal_type === 'numeric_progress' || goal.goal_type === 'financial_target') {
        goal.current_value = Math.min(goal.current_value + increment, goal.target_value);
        amountChanged = increment;
      }
    }
    
    if (value !== undefined) {
      if (goal.goal_type === 'numeric_target') {
        amountChanged = value - goal.current_count;
        goal.current_count = Math.min(value, goal.target_count);
      } else if (goal.goal_type === 'numeric_progress' || goal.goal_type === 'financial_target') {
        amountChanged = value - goal.current_value;
        goal.current_value = Math.min(value, goal.target_value);
      }
    }
    
    await goal.updateProgressAndStatus();
    await goal.save();
    
    // Si date fournie, trouver ou créer le breakdown correspondant
    if (date && amountChanged !== 0) {
      const breakdownDate = new Date(date);
      breakdownDate.setHours(0, 0, 0, 0);
      
      let breakdown = await GoalBreakdown.findOne({
        goal: goal._id,
        user: req.user.id,
        date: {
          $gte: breakdownDate,
          $lt: new Date(breakdownDate.getTime() + 24 * 60 * 60 * 1000)
        },
        level: 'daily'
      });
      
      if (!breakdown) {
        // Créer un breakdown pour cette date
        const dayOfYear = Math.floor((breakdownDate - new Date(breakdownDate.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        
        breakdown = await GoalBreakdown.create({
          goal: goal._id,
          user: req.user.id,
          level: 'daily',
          year: breakdownDate.getFullYear(),
          month: breakdownDate.getMonth() + 1,
          quarter: Math.ceil((breakdownDate.getMonth() + 1) / 3),
          week: GoalBreakdown.getWeekNumber ? GoalBreakdown.getWeekNumber(breakdownDate) : getWeekNumberManual(breakdownDate),
          day_of_year: dayOfYear,
          date: breakdownDate,
          label: breakdownDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
          target_value: goal.target_value ? Math.round(goal.target_value / 365) : 
                       goal.target_count ? Math.round(goal.target_count / 365) : 0,
          current_value: amountChanged > 0 ? amountChanged : 0,
          unit: goal.unit,
          is_auto_generated: true
        });
      } else {
        // Mettre à jour le breakdown existant
        await breakdown.addProgress(amountChanged);
        await breakdown.save();
      }
    }
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'goal_progress_updated',
      'goal',
      goal._id,
      { 
        title: goal.title, 
        amount: amountChanged,
        new_progress: goal.progress_percentage 
      }
    );
    
    // Émettre via Socket.IO
    emitGoalUpdate(req, goal, 'goal-progress-updated');
    
    res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        goal,
        amountChanged
      }
    });
  } catch (error) {
    console.error('Update Progress Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
};

/**
 * @desc    Complete a step in steps goal
 * @route   PUT /api/goals/:id/steps/:stepId/complete
 * @access  Private
 */
exports.completeStep = async (req, res) => {
  try {
    const { id, stepId } = req.params;
    
    const goal = await Goal.findOne({
      _id: id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    if (goal.goal_type !== 'steps') {
      return res.status(400).json({
        success: false,
        message: 'This goal is not a steps type goal'
      });
    }
    
    const result = goal.completeStep(stepId);
    await goal.save();
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'goal_step_completed',
      'goal',
      goal._id,
      { 
        title: goal.title, 
        step: result.step.title,
        completed: result.step.completed 
      }
    );
    
    // Émettre via Socket.IO
    emitGoalUpdate(req, goal, 'goal-step-completed');
    
    res.status(200).json({
      success: true,
      message: result.step.completed ? 'Step completed' : 'Step uncompleted',
      data: {
        goal,
        step: result.step
      }
    });
  } catch (error) {
    console.error('Complete Step Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing step',
      error: error.message
    });
  }
};

/**
 * @desc    Get goal with breakdowns
 * @route   GET /api/goals/:id/with-breakdowns
 * @access  Private
 */
exports.getGoalWithBreakdowns = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    // Récupérer tous les breakdowns
    const breakdowns = await GoalBreakdown.find({
      goal: goal._id,
      user: req.user.id
    }).sort({ level: 1, date: 1 });
    
    // Grouper par niveau
    const breakdownsByLevel = {
      annual: [],
      quarterly: [],
      monthly: [],
      weekly: [],
      daily: []
    };
    
    breakdowns.forEach(b => {
      if (breakdownsByLevel[b.level]) {
        breakdownsByLevel[b.level].push(b);
      }
    });
    
    // Calculer les stats
    const stats = {
      total_breakdowns: breakdowns.length,
      completed_breakdowns: breakdowns.filter(b => b.completed).length,
      overdue_breakdowns: breakdowns.filter(b => b.is_overdue).length,
      completion_rate: breakdowns.length > 0 ? 
        (breakdowns.filter(b => b.completed).length / breakdowns.length) * 100 : 0
    };
    
    res.status(200).json({
      success: true,
      data: {
        goal,
        breakdownsByLevel,
        stats
      }
    });
  } catch (error) {
    console.error('Get Goal With Breakdowns Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching goal with breakdowns',
      error: error.message
    });
  }
};

/**
 * @desc    Get daily breakdowns for a goal
 * @route   GET /api/goals/:id/breakdowns/daily
 * @access  Private
 */
exports.getDailyBreakdowns = async (req, res) => {
  try {
    const { start_date, end_date, week } = req.query;
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    let query = {
      goal: goal._id,
      user: req.user.id,
      level: 'daily'
    };
    
    if (start_date && end_date) {
      query.date = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }
    
    if (week) {
      const weekNum = parseInt(week);
      const year = new Date().getFullYear();
      query.week = weekNum;
      query.year = year;
    }
    
    const breakdowns = await GoalBreakdown.find(query)
      .sort({ date: 1 });
    
    // Formater pour le frontend (wireframe hebdomadaire)
    const weeklyData = formatBreakdownsForWeeklyView(breakdowns);
    
    res.status(200).json({
      success: true,
      data: {
        goal,
        breakdowns,
        weekly_view: weeklyData,
        stats: {
          total_days: breakdowns.length,
          completed_days: breakdowns.filter(b => b.completed).length,
          average_daily: breakdowns.length > 0 ? 
            breakdowns.reduce((sum, b) => sum + b.current_value, 0) / breakdowns.length : 0,
          total_progress: breakdowns.reduce((sum, b) => sum + b.current_value, 0),
          target_total: breakdowns.reduce((sum, b) => sum + b.target_value, 0)
        }
      }
    });
  } catch (error) {
    console.error('Get Daily Breakdowns Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily breakdowns',
      error: error.message
    });
  }
};

/**
 * @desc    Generate breakdowns for a goal
 * @route   POST /api/goals/:id/generate-breakdowns
 * @access  Private
 */
exports.generateBreakdowns = async (req, res) => {
  try {
    const { level } = req.body; // 'quarterly', 'monthly', 'weekly', 'daily'
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    if (goal.goal_type !== 'numeric_target' && goal.goal_type !== 'financial_target' && goal.goal_type !== 'numeric_progress') {
      return res.status(400).json({
        success: false,
        message: 'Only numeric goals can be broken down'
      });
    }
    
    const breakdownLevel = level || 'daily';
    const breakdowns = await GoalBreakdown.generateBreakdown(goal._id, breakdownLevel);
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'goal_breakdowns_generated',
      'goal',
      goal._id,
      { 
        title: goal.title, 
        level: breakdownLevel,
        count: breakdowns.length 
      }
    );
    
    res.status(200).json({
      success: true,
      message: `Generated ${breakdowns.length} ${breakdownLevel} breakdowns`,
      data: {
        goal,
        breakdowns,
        level: breakdownLevel,
        count: breakdowns.length
      }
    });
  } catch (error) {
    console.error('Generate Breakdowns Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating breakdowns',
      error: error.message
    });
  }
};

// ==================== STATISTIQUES ====================

/**
 * @desc    Get goals statistics
 * @route   GET /api/goals/stats
 * @access  Private
 */
exports.getGoalsStats = async (req, res) => {
  try {
    const { year, category } = req.query;
    
    const filter = { user: req.user.id };
    if (year) filter.year = parseInt(year);
    if (category && category !== 'null') filter.category = category;
    
    // Récupérer tous les goals
    const goals = await Goal.find(filter);
    
    // Calculer les stats par statut
    const statusCounts = goals.reduce((acc, goal) => {
      acc[goal.status] = (acc[goal.status] || 0) + 1;
      return acc;
    }, {});
    
    // Calculer les stats par catégorie
    const categoryStats = goals.reduce((acc, goal) => {
      if (!acc[goal.category]) {
        acc[goal.category] = {
          count: 0,
          total_progress: 0,
          completed: 0
        };
      }
      
      acc[goal.category].count += 1;
      acc[goal.category].total_progress += goal.progress_percentage;
      if (goal.completed) acc[goal.category].completed += 1;
      
      return acc;
    }, {});
    
    // Calculer la progression moyenne
    const totalProgress = goals.reduce((sum, goal) => sum + goal.progress_percentage, 0);
    const avgProgress = goals.length > 0 ? totalProgress / goals.length : 0;
    
    // Objectifs en retard
    const overdueGoals = goals.filter(goal => {
      if (!goal.deadline || goal.completed) return false;
      return new Date() > new Date(goal.deadline);
    });
    
    // Objectifs à risque (moins de 7 jours avant deadline)
    const atRiskGoals = goals.filter(goal => {
      if (!goal.deadline || goal.completed) return false;
      
      const now = new Date();
      const deadline = new Date(goal.deadline);
      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      
      return daysLeft > 0 && daysLeft <= 7 && goal.progress_percentage < 70;
    });
    
    res.status(200).json({
      success: true,
      data: {
        total_goals: goals.length,
        avg_progress: Math.round(avgProgress * 100) / 100,
        completed_goals: goals.filter(g => g.completed).length,
        in_progress_goals: goals.filter(g => !g.completed && g.progress_percentage > 0).length,
        not_started_goals: goals.filter(g => g.progress_percentage === 0).length,
        overdue_goals: overdueGoals.length,
        at_risk_goals: atRiskGoals.length,
        status_counts: statusCounts,
        category_stats: categoryStats,
        recent_completions: goals
          .filter(g => g.completed_at && new Date(g.completed_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
          .slice(0, 5)
          .map(g => ({
            title: g.title,
            completed_at: g.completed_at,
            category: g.category
          }))
      }
    });
  } catch (error) {
    console.error('Get Goals Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching goals statistics',
      error: error.message
    });
  }
};

// ==================== HELPERS ====================

function getFriendlyTitle(type) {
  const titles = {
    'commits': 'commits GitHub',
    'HTG': 'Épargne HTG',
    'USD': 'Épargne USD',
    'EUR': 'Épargne EUR',
    'pages': 'Pages lues',
    'books': 'Livres',
    'minutes': 'Minutes',
    'hours': 'Heures',
    'km': 'Kilomètres',
    'kg': 'Poids'
  };
  return titles[type] || type;
}

function calculateWeekDatesManual(weekNum, year) {
  const jan1 = new Date(year, 0, 1);
  const jan1DayOfWeek = jan1.getDay() || 7;
  
  const week1Start = new Date(year, 0, 1 + (8 - jan1DayOfWeek));
  const weekStart = new Date(week1Start);
  weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

function getWeekNumberManual(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatBreakdownsForWeeklyView(breakdowns) {
  const weeklyData = [];
  let currentWeek = null;
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  
  for (const breakdown of breakdowns) {
    const weekStart = getStartOfWeek(breakdown.date);
    const weekLabel = `Semaine ${breakdown.week}`;
    
    if (!currentWeek || currentWeek.week !== breakdown.week) {
      currentWeek = {
        week: breakdown.week,
        label: weekLabel,
        days: Array(7).fill(null).map((_, i) => ({
          day: i,
          day_name: dayNames[i],
          value: 0,
          completed: false,
          date: null,
          breakdown_id: null
        }))
      };
      weeklyData.push(currentWeek);
    }
    
    const dayOfWeek = breakdown.date.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    if (currentWeek.days[adjustedDay]) {
      currentWeek.days[adjustedDay] = {
        day: adjustedDay,
        day_name: dayNames[adjustedDay],
        value: breakdown.current_value,
        completed: breakdown.completed,
        date: breakdown.date,
        breakdown_id: breakdown._id,
        target: breakdown.target_value
      };
    }
  }
  
  return weeklyData;
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

module.exports = exports;