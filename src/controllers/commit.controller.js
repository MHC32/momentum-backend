const Commit = require('../models/Commit.model');
const Project = require('../models/Project.model');
const Goal = require('../models/Goal.model');
const mongoose = require('mongoose');

// ==================== STATS ====================

/**
 * Statistiques des commits par période
 * GET /api/commits/stats?year=2026
 */
exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const now = new Date();

    // Dates de référence
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Semaine ISO (Lun-Dim)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Semaine dernière pour comparaison
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    // Aggregations
    const [annualCount, monthlyCount, weeklyCount, dailyCount, lastWeekCount] = await Promise.all([
      Commit.aggregate([
        { $match: { user: userId, timestamp: { $gte: yearStart, $lte: yearEnd } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]),
      Commit.aggregate([
        { $match: { user: userId, timestamp: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]),
      Commit.aggregate([
        { $match: { user: userId, timestamp: { $gte: weekStart, $lte: weekEnd } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]),
      Commit.aggregate([
        { $match: { user: userId, timestamp: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]),
      Commit.aggregate([
        { $match: { user: userId, timestamp: { $gte: lastWeekStart, $lte: lastWeekEnd } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ])
    ]);

    const annual = annualCount[0]?.total || 0;
    const monthly = monthlyCount[0]?.total || 0;
    const weekly = weeklyCount[0]?.total || 0;
    const daily = dailyCount[0]?.total || 0;
    const lastWeek = lastWeekCount[0]?.total || 0;

    // Targets basés sur objectif annuel (chercher goal commits)
    const commitGoal = await Goal.findOne({
      user: userId,
      level: 'annual',
      year: year,
      unit: 'commits'
    });

    const annualTarget = commitGoal?.target_value || 4000;
    const daysInYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
    const dailyTarget = Math.ceil(annualTarget / daysInYear);
    const weeklyTarget = Math.ceil(annualTarget / 52);
    const monthlyTarget = Math.ceil(annualTarget / 12);

    // Jours passés dans l'année
    const dayOfYear = Math.floor((now - yearStart) / 86400000) + 1;

    // Trend semaine
    const weekTrend = weekly - lastWeek;
    const weekTrendPercent = lastWeek > 0 ? Math.round((weekTrend / lastWeek) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        annual: {
          year,
          target: annualTarget,
          current: annual,
          percentage: Math.round((annual / annualTarget) * 1000) / 10,
          trend: {
            value: weekTrend,
            label: weekTrend >= 0 ? `+${weekTrend} cette semaine` : `${weekTrend} cette semaine`,
            direction: weekTrend >= 0 ? 'up' : 'down'
          }
        },
        monthly: {
          month: now.getMonth() + 1,
          name: now.toLocaleDateString('fr-FR', { month: 'long' }),
          target: monthlyTarget,
          current: monthly,
          percentage: Math.round((monthly / monthlyTarget) * 1000) / 10,
          status: monthly >= (monthlyTarget * (now.getDate() / 30)) ? 'on-track' : 'behind'
        },
        weekly: {
          week: getWeekNumber(now),
          target: weeklyTarget,
          current: weekly,
          percentage: Math.round((weekly / weeklyTarget) * 1000) / 10,
          avgPerDay: Math.round((weekly / (dayOfWeek + 1)) * 10) / 10
        },
        daily: {
          date: now.toISOString().split('T')[0],
          target: dailyTarget,
          current: daily,
          exceeded: daily >= dailyTarget,
          remaining: Math.max(0, dailyTarget - daily)
        }
      }
    });

  } catch (error) {
    console.error('Erreur getStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
};

/**
 * Commits d'aujourd'hui groupés par session/heure
 * GET /api/commits/today
 */
exports.getToday = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const commits = await Commit.find({
      user: userId,
      timestamp: { $gte: todayStart, $lte: todayEnd }
    })
      .populate('project', 'name color icon')
      .sort({ timestamp: 1 });

    // Grouper par heure
    const sessions = [];
    let currentSession = null;

    commits.forEach(commit => {
      const hour = commit.timestamp.getHours();
      const minute = commit.timestamp.getMinutes();
      const timeLabel = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // Nouvelle session si plus de 30 min depuis la dernière
      if (!currentSession ||
          (commit.timestamp - currentSession.lastTimestamp) > 30 * 60 * 1000) {
        currentSession = {
          time: timeLabel,
          count: commit.count,
          project: commit.project,
          commits: [commit],
          lastTimestamp: commit.timestamp
        };
        sessions.push(currentSession);
      } else {
        currentSession.count += commit.count;
        currentSession.commits.push(commit);
        currentSession.lastTimestamp = commit.timestamp;
      }
    });

    // Nettoyer les sessions
    const cleanSessions = sessions.map(s => ({
      time: s.time,
      count: s.count,
      project: s.project ? {
        _id: s.project._id,
        name: s.project.name,
        color: s.project.color,
        icon: s.project.icon
      } : null,
      commitCount: s.commits.length
    }));

    const totalCount = commits.reduce((sum, c) => sum + c.count, 0);

    res.status(200).json({
      success: true,
      data: {
        date: now.toISOString().split('T')[0],
        dateFormatted: now.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }),
        total: totalCount,
        sessions: cleanSessions
      }
    });

  } catch (error) {
    console.error('Erreur getToday:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commits du jour',
      error: error.message
    });
  }
};

/**
 * Insights et tendances
 * GET /api/commits/insights?year=2026
 */
exports.getInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const now = new Date();

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    // Commits par jour
    const dailyCommits = await Commit.aggregate([
      {
        $match: {
          user: userId,
          timestamp: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: '$count' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Commits par heure
    const hourlyCommits = await Commit.aggregate([
      {
        $match: {
          user: userId,
          timestamp: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: '$count' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Commits par projet
    const projectCommits = await Commit.aggregate([
      {
        $match: {
          user: userId,
          timestamp: { $gte: yearStart, $lte: yearEnd },
          project: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$project',
          count: { $sum: '$count' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Populate projets
    const topProjects = await Project.populate(projectCommits, {
      path: '_id',
      select: 'name color icon'
    });

    // Calculs
    const totalCommits = dailyCommits.reduce((sum, d) => sum + d.count, 0);
    const daysWithCommits = dailyCommits.length;
    const bestDay = dailyCommits[0] || { _id: null, count: 0 };

    // Moyenne quotidienne (jours avec commits)
    const dailyAverage = daysWithCommits > 0
      ? Math.round((totalCommits / daysWithCommits) * 10) / 10
      : 0;

    // Heures de pointe
    const peakHours = hourlyCommits.slice(0, 3).map(h => h._id);
    let peakHoursLabel = 'N/A';
    if (peakHours.length >= 2) {
      const minHour = Math.min(...peakHours);
      const maxHour = Math.max(...peakHours);
      peakHoursLabel = `${minHour}h-${maxHour + 1}h`;
    }

    // Streak actuel
    let currentStreak = 0;
    const sortedDays = dailyCommits
      .map(d => d._id)
      .sort()
      .reverse();

    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (sortedDays.includes(today) || sortedDays.includes(yesterdayStr)) {
      let checkDate = sortedDays.includes(today) ? new Date(today) : yesterday;
      while (sortedDays.includes(checkDate.toISOString().split('T')[0])) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Projection annuelle
    const dayOfYear = Math.floor((now - yearStart) / 86400000) + 1;
    const projection = Math.round((totalCommits / dayOfYear) * 365);

    // Top projet
    const topProject = topProjects[0] ? {
      name: topProjects[0]._id?.name || 'Inconnu',
      count: topProjects[0].count,
      percentage: Math.round((topProjects[0].count / totalCommits) * 100)
    } : null;

    res.status(200).json({
      success: true,
      data: {
        dailyAverage,
        bestDay: {
          date: bestDay._id,
          count: bestDay.count
        },
        currentStreak,
        topProject,
        peakHours: peakHoursLabel,
        projection,
        totalCommits,
        daysWithCommits
      }
    });

  } catch (error) {
    console.error('Erreur getInsights:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des insights',
      error: error.message
    });
  }
};

// ==================== CRUD ====================

/**
 * Liste des commits paginée
 * GET /api/commits?page=1&limit=10&project=xxx
 */
exports.getCommits = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { user: userId };

    if (req.query.project) {
      filter.project = req.query.project;
    }
    if (req.query.startDate) {
      filter.timestamp = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
      filter.timestamp = {
        ...filter.timestamp,
        $lte: new Date(req.query.endDate)
      };
    }

    const [commits, total] = await Promise.all([
      Commit.find(filter)
        .populate('project', 'name color icon')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      Commit.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        commits,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur getCommits:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commits',
      error: error.message
    });
  }
};

/**
 * Créer un commit manuel
 * POST /api/commits
 */
exports.createCommit = async (req, res) => {
  try {
    const { project_id, count, message, timestamp } = req.body;

    const commitData = {
      user: req.user._id,
      count: count || 1,
      message: message || '',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      source: 'manual'
    };

    if (project_id) {
      const project = await Project.findOne({
        _id: project_id,
        user: req.user._id
      });
      if (project) {
        commitData.project = project._id;
      }
    }

    const commit = await Commit.create(commitData);

    // Populate pour la réponse
    await commit.populate('project', 'name color icon');

    // Mettre à jour le goal commits si existe
    await updateCommitGoal(req.user._id, commit.count);

    // Socket.IO
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('commit-created', { commit });
    }

    res.status(201).json({
      success: true,
      message: 'Commit enregistré',
      data: { commit }
    });

  } catch (error) {
    console.error('Erreur createCommit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du commit',
      error: error.message
    });
  }
};

/**
 * Obtenir un commit par ID
 * GET /api/commits/:id
 */
exports.getCommitById = async (req, res) => {
  try {
    const commit = await Commit.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('project', 'name color icon');

    if (!commit) {
      return res.status(404).json({
        success: false,
        message: 'Commit non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: { commit }
    });

  } catch (error) {
    console.error('Erreur getCommitById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du commit',
      error: error.message
    });
  }
};

/**
 * Mettre à jour un commit
 * PUT /api/commits/:id
 */
exports.updateCommit = async (req, res) => {
  try {
    const commit = await Commit.findOne({
      _id: req.params.id,
      user: req.user._id,
      source: 'manual' // Seulement les commits manuels
    });

    if (!commit) {
      return res.status(404).json({
        success: false,
        message: 'Commit non trouvé ou non modifiable'
      });
    }

    const oldCount = commit.count;

    if (req.body.count !== undefined) commit.count = req.body.count;
    if (req.body.message !== undefined) commit.message = req.body.message;
    if (req.body.project_id !== undefined) {
      commit.project = req.body.project_id || null;
    }

    await commit.save();
    await commit.populate('project', 'name color icon');

    // Mettre à jour goal si count changé
    if (oldCount !== commit.count) {
      await updateCommitGoal(req.user._id, commit.count - oldCount);
    }

    res.status(200).json({
      success: true,
      message: 'Commit mis à jour',
      data: { commit }
    });

  } catch (error) {
    console.error('Erreur updateCommit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du commit',
      error: error.message
    });
  }
};

/**
 * Supprimer un commit
 * DELETE /api/commits/:id
 */
exports.deleteCommit = async (req, res) => {
  try {
    const commit = await Commit.findOne({
      _id: req.params.id,
      user: req.user._id,
      source: 'manual'
    });

    if (!commit) {
      return res.status(404).json({
        success: false,
        message: 'Commit non trouvé ou non supprimable'
      });
    }

    const countToRemove = commit.count;
    await commit.deleteOne();

    // Mettre à jour goal
    await updateCommitGoal(req.user._id, -countToRemove);

    res.status(200).json({
      success: true,
      message: 'Commit supprimé'
    });

  } catch (error) {
    console.error('Erreur deleteCommit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du commit',
      error: error.message
    });
  }
};

// ==================== HELPERS ====================

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function updateCommitGoal(userId, increment) {
  try {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

    // Trouver le goal daily commits
    const dailyGoal = await Goal.findOne({
      user: userId,
      level: 'daily',
      day_of_year: dayOfYear,
      year: now.getFullYear(),
      unit: 'commits'
    });

    if (dailyGoal) {
      dailyGoal.current_value += increment;
      if (dailyGoal.current_value < 0) dailyGoal.current_value = 0;
      await dailyGoal.updateProgressAndStatus();

      // Propager vers parents
      if (dailyGoal.parent_annual_id) {
        await Goal.propagateProgressUp(dailyGoal._id, increment);
      }
    }
  } catch (error) {
    console.error('Erreur updateCommitGoal:', error);
  }
}

module.exports = exports;
