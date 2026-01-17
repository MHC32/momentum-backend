// ==================== IMPORTS ====================

const Task = require('../models/Task.model');
const Project = require('../models/Project.model');
const Habit = require('../models/Habit.model');
const Commit = require('../models/Commit.model'); // 🆕 AJOUTER

// ==================== HELPER FUNCTIONS ====================

/**
 * Obtenir le début de la semaine (lundi 00:00:00)
 */
const getWeekStart = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * Obtenir la fin de la semaine (dimanche 23:59:59)
 */
const getWeekEnd = () => {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

/**
 * Obtenir le début de la semaine dernière
 */
const getLastWeekStart = () => {
  const weekStart = getWeekStart();
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  return lastWeekStart;
};

/**
 * Obtenir la fin de la semaine dernière
 */
const getLastWeekEnd = () => {
  const weekEnd = getWeekEnd();
  const lastWeekEnd = new Date(weekEnd);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
  return lastWeekEnd;
};

/**
 * Obtenir le début de la journée (00:00:00)
 */
const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Obtenir la fin de la journée (23:59:59)
 */
const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Calculer pourcentage de changement
 */
const calculateChange = (current, previous) => {
  if (previous === 0) {
    return {
      value: current > 0 ? 100 : 0,
      formatted: current > 0 ? '+100%' : '0%',
      trend: current > 0 ? 'up' : 'stable'
    };
  }
  
  const change = ((current - previous) / previous) * 100;
  const roundedChange = Math.round(change);
  
  return {
    value: roundedChange,
    formatted: roundedChange >= 0 ? `+${roundedChange}%` : `${roundedChange}%`,
    trend: roundedChange > 0 ? 'up' : roundedChange < 0 ? 'down' : 'stable'
  };
};

/**
 * Calculer pourcentage de progression
 */
const calculateProgress = (completed, total) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

/**
 * Formater timestamp relatif
 */
const getRelativeTime = (timestamp) => {
  const now = new Date();
  const diffMs = now - new Date(timestamp);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'À l\'instant';
  } else if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays === 1) {
    const time = new Date(timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `Hier ${time}`;
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else {
    return new Date(timestamp).toLocaleDateString('fr-FR');
  }
};

// ==================== MAIN CONTROLLER ====================

/**
 * @desc    Get Dashboard Data
 * @route   GET /api/dashboard
 * @access  Private
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    
    // ==================== FOCUS DU JOUR ====================
    
    const today = getStartOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 1. Tâches critiques (deadline aujourd'hui OU priority urgent/high)
    const focusTasks = await Task.find({
      user: userId,
      status: { $ne: 'done' },
      $or: [
        // Deadline aujourd'hui
        { 
          deadline: { $gte: today, $lt: tomorrow }
        },
        // Ou priority urgent/high dans les 7 prochains jours
        { 
          priority: { $in: ['critical', 'high'] },
          deadline: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        }
      ]
    })
      .populate('project', 'name color')
      .sort({ priority: -1, deadline: 1 })
      .limit(2);
    
    // 2. Habitudes non faites avec streak > 10 et pas fait depuis 3 jours
    let habitWithStreak = null;
    
    try {
      const habits = await Habit.find({
        user: userId,
        archived: false
      });
      
      habitWithStreak = habits.find(h => {
        if (!h.stats.lastCompleted) return false;
        
        const daysSinceComplete = Math.floor(
          (now - new Date(h.stats.lastCompleted)) / (1000 * 60 * 60 * 24)
        );
        
        return h.streak.current >= 10 && daysSinceComplete >= 3;
      });
    } catch (error) {
      // Si Habit model n'existe pas encore, on continue sans
      console.log('Habit model not available yet');
    }
    
    // 3. Construire la liste focus
    const focusItems = [
      ...focusTasks.map(t => ({
        _id: t._id,
        taskId: t.taskId,
        title: t.title,
        status: t.status,
        priority: t.priority,
        type: t.type,
        deadline: t.deadline,
        project: t.project,
        commitsCount: t.commits?.length || 0,
        estimatedTime: t.estimatedTime
      }))
    ];
    
    if (habitWithStreak) {
      const daysSince = Math.floor(
        (now - new Date(habitWithStreak.stats.lastCompleted)) / (1000 * 60 * 60 * 24)
      );
      
      focusItems.push({
        _id: habitWithStreak._id,
        title: `${habitWithStreak.title} (pas fait depuis ${daysSince} jours)`,
        type: 'habit',
        priority: 'high',
        streak: habitWithStreak.streak,
        daysWithoutCompletion: daysSince
      });
    }
    
    const focus = {
      title: 'Focus du Jour',
      description: `${focusItems.length} tâche${focusItems.length > 1 ? 's' : ''} critique${focusItems.length > 1 ? 's' : ''} à accomplir aujourd'hui`,
      tasks: focusItems.slice(0, 3)
    };
    
    // ==================== STATS ====================
    
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    const lastWeekStart = getLastWeekStart();
    const lastWeekEnd = getLastWeekEnd();
    
    // 1. Commits cette semaine (depuis Commit model)
    const commitsThisWeek = await Commit.countDocuments({
      user: userId,
      timestamp: { $gte: weekStart, $lte: weekEnd }
    });
    
    const commitsLastWeek = await Commit.countDocuments({
      user: userId,
      timestamp: { $gte: lastWeekStart, $lte: lastWeekEnd }
    });
    
    const commitsChange = calculateChange(commitsThisWeek, commitsLastWeek);
    
    // 2. Tâches complétées cette semaine
    const tasksCompletedThisWeek = await Task.countDocuments({
      user: userId,
      status: 'done',
      completedAt: { $gte: weekStart, $lte: weekEnd }
    });
    
    const tasksCompletedLastWeek = await Task.countDocuments({
      user: userId,
      status: 'done',
      completedAt: { $gte: lastWeekStart, $lte: lastWeekEnd }
    });
    
    const tasksChange = calculateChange(tasksCompletedThisWeek, tasksCompletedLastWeek);
    
    // 3. Projets actifs
    const projectsActive = await Project.countDocuments({
      user: userId,
      status: 'active'
    });
    
    const projectsActiveLast = projectsActive; // Simplification pour MVP
    
    // 4. Productivité (tasks done / tasks total cette semaine)
    const tasksTotal = await Task.countDocuments({
      user: userId,
      createdAt: { $lte: weekEnd }
    });
    
    const productivity = calculateProgress(tasksCompletedThisWeek, tasksTotal);
    const productivityLast = Math.max(0, productivity - 5); // Simulation
    const productivityChange = calculateChange(productivity, productivityLast);
    
    const stats = {
      commitsWeek: {
        current: commitsThisWeek,
        previous: commitsLastWeek,
        change: commitsChange.formatted,
        trend: commitsChange.trend
      },
      tasksCompleted: {
        current: tasksCompletedThisWeek,
        previous: tasksCompletedLastWeek,
        change: tasksChange.formatted,
        trend: tasksChange.trend
      },
      projectsActive: {
        current: projectsActive,
        previous: projectsActiveLast,
        change: 'Stable',
        trend: 'stable'
      },
      productivity: {
        current: productivity,
        previous: productivityLast,
        change: productivityChange.formatted,
        trend: productivityChange.trend
      }
    };
    
    // ==================== PROJETS ACTIFS ====================
    
    const projectsData = await Project.find({
      user: userId,
      status: 'active'
    }).limit(5);
    
    const projects = await Promise.all(
      projectsData.map(async (project) => {
        const tasks = await Task.find({ project: project._id });
        const taskCount = tasks.length;
        const completedCount = tasks.filter(t => t.status === 'done').length;
        
        // Compter commits depuis Commit model
        const commitCount = await Commit.countDocuments({ 
          project: project._id 
        });
        
        const progress = calculateProgress(completedCount, taskCount);
        
        return {
          _id: project._id,
          name: project.name,
          icon: project.icon || project.name.charAt(0).toUpperCase(),
          color: project.color,
          type: project.type,
          progress,
          taskCount,
          commitCount,
          tasks: {
            total: taskCount,
            done: completedCount,
            inProgress: tasks.filter(t => t.status === 'in-progress').length,
            todo: tasks.filter(t => t.status === 'todo').length
          }
        };
      })
    );
    
    // ==================== ACTIVITÉ RÉCENTE ====================
    
    const recentActivity = [];
    
    // Recent commits depuis Commit model
    const recentCommits = await Commit.find({ 
      user: userId
    })
      .populate('project', 'name color')
      .populate('task', 'title taskId')
      .sort({ timestamp: -1 })
      .limit(10);
    
    recentCommits.forEach(commit => {
      recentActivity.push({
        type: 'commit',
        timestamp: commit.timestamp,
        icon: '💻',
        title: `Commit sur ${commit.project?.name || 'Projet'}`,
        description: commit.message || `${commit.count} commit${commit.count > 1 ? 's' : ''}`,
        project: commit.project
      });
    });
    
    // Recent completed tasks
    const completedTasks = await Task.find({ 
      user: userId,
      status: 'done',
      completedAt: { $exists: true }
    })
      .populate('project', 'name color')
      .sort({ completedAt: -1 })
      .limit(5);
    
    completedTasks.forEach(task => {
      recentActivity.push({
        type: 'task-completed',
        timestamp: task.completedAt,
        icon: '✓',
        title: 'Tâche complétée',
        description: `[${task.taskId}] ${task.title}`,
        project: task.project
      });
    });
    
    // Sort by timestamp
    recentActivity.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Add relative timestamp
    recentActivity.forEach(activity => {
      activity.timestampRelative = getRelativeTime(activity.timestamp);
    });
    
    // ==================== RESPONSE ====================
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          name: req.user.name,
          avatar: req.user.avatar || null
        },
        focus,
        stats,
        projects,
        recentActivity: recentActivity.slice(0, 10)
      }
    });
    
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du dashboard',
      error: error.message
    });
  }
};

/**
 * @desc    Get Focus Tasks Only
 * @route   GET /api/dashboard/focus
 * @access  Private
 */
exports.getFocusTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const today = getStartOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const focusTasks = await Task.find({
      user: userId,
      status: { $ne: 'done' },
      $or: [
        { deadline: { $gte: today, $lt: tomorrow } },
        { 
          priority: { $in: ['critical', 'high'] },
          deadline: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        }
      ]
    })
      .populate('project', 'name color')
      .sort({ priority: -1, deadline: 1 })
      .limit(3);
    
    res.status(200).json({
      success: true,
      count: focusTasks.length,
      data: focusTasks
    });
    
  } catch (error) {
    console.error('Focus Tasks Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches focus',
      error: error.message
    });
  }
};

/**
 * @desc    Get Recent Activity Only
 * @route   GET /api/dashboard/activity
 * @access  Private
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    
    const recentActivity = [];
    
    // Recent commits
    const recentTasksWithCommits = await Task.find({ 
      user: userId,
      'commits.0': { $exists: true }
    })
      .populate('project', 'name color')
      .limit(10);
    
    recentTasksWithCommits.forEach(task => {
      if (task.commits && task.commits.length > 0) {
        const sortedCommits = [...task.commits].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        sortedCommits.slice(0, 3).forEach(commit => {
          recentActivity.push({
            type: 'commit',
            timestamp: commit.timestamp,
            icon: '💻',
            title: `Commit sur ${task.project?.name || 'Unknown'}`,
            description: commit.message || 'No message',
            project: task.project
          });
        });
      }
    });
    
    // Recent completed tasks
    const completedTasks = await Task.find({ 
      user: userId,
      status: 'done',
      completedAt: { $exists: true }
    })
      .populate('project', 'name color')
      .sort({ completedAt: -1 })
      .limit(5);
    
    completedTasks.forEach(task => {
      recentActivity.push({
        type: 'task-completed',
        timestamp: task.completedAt,
        icon: '✓',
        title: 'Tâche complétée',
        description: `[${task.taskId}] ${task.title}`,
        project: task.project
      });
    });
    
    // Sort and add relative time
    recentActivity.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    recentActivity.forEach(activity => {
      activity.timestampRelative = getRelativeTime(activity.timestamp);
    });
    
    res.status(200).json({
      success: true,
      count: recentActivity.slice(0, limit).length,
      data: recentActivity.slice(0, limit)
    });
    
  } catch (error) {
    console.error('Recent Activity Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'activité récente',
      error: error.message
    });
  }
};