const Task = require('../models/Task.model');
const Project = require('../models/Project.model');
const Habit = require('../models/Habit.model');

// ==================== HELPERS ====================

const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Dimanche, 1 = Lundi, ...
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
};

const getWeekEnd = () => {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
};

const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

const getTomorrow = () => {
    const today = getToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
};

// @desc    Get Dashboard Data
// @route   GET /api/dashboard
// @access  Private
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();

        // ==================== FOCUS DU JOUR ====================

        const today = getToday();
        const tomorrow = getTomorrow();

        // 1. Tasks critiques
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
            .limit(2);

        // 2. Habitudes due today avec streak danger
        const habitsdue = await Habit.getDueToday(userId);
        const habitWithStreak = habitsdue.find(h => {
            if (!h.stats.lastCompleted) return false;

            const daysSinceComplete = Math.floor(
                (now - new Date(h.stats.lastCompleted)) / (1000 * 60 * 60 * 24)
            );
            return h.streak.current >= 10 && daysSinceComplete >= 3;
        });

        // Combiner tasks + habit
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
      // ==================== STATS ====================

const weekStart = getWeekStart();
            const weekEnd = getWeekEnd();
            const lastWeekStart = new Date(weekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const lastWeekEnd = new Date(weekEnd);
            lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

            // Commits cette semaine
            const tasksWithCommits = await Task.find({
                user: userId,
                'commits.0': { $exists: true }
            });

            let commitsThisWeek = 0;
            let commitsLastWeek = 0;

            for(const task of tasksWithCommits) {
                const weekCommits = task.commits.filter(c =>
                    c.timestamp >= weekStart && c.timestamp <= weekEnd
                );
                commitsThisWeek += weekCommits.length;

                const lastWeekCommits = task.commits.filter(c =>
                    c.timestamp >= lastWeekStart && c.timestamp <= lastWeekEnd
                );
                commitsLastWeek += lastWeekCommits.length;
            }

const commitsChange = commitsLastWeek > 0
                ? Math.round(((commitsThisWeek - commitsLastWeek) / commitsLastWeek) * 100)
                : (commitsThisWeek > 0 ? 100 : 0);

            // Tasks complétées cette semaine
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

            const tasksChange = tasksCompletedLastWeek > 0
                ? Math.round(((tasksCompletedThisWeek - tasksCompletedLastWeek) / tasksCompletedLastWeek) * 100)
                : (tasksCompletedThisWeek > 0 ? 100 : 0);

            // Projets actifs
            const projectsActive = await Project.countDocuments({
                user: userId,
                status: 'active'
            });

            // Productivité
            const totalTasks = await Task.countDocuments({
                user: userId,
                createdAt: { $lte: weekEnd }
            });

            const productivity = totalTasks > 0
                ? Math.round((tasksCompletedThisWeek / totalTasks) * 100)
                : 0;

            const stats = {
                commitsWeek: {
                    current: commitsThisWeek,
                    previous: commitsLastWeek,
                    change: commitsChange >= 0 ? `+${commitsChange}%` : `${commitsChange}%`,
                    trend: commitsChange >= 0 ? 'up' : 'down'
                },
                tasksCompleted: {
                    current: tasksCompletedThisWeek,
                    previous: tasksCompletedLastWeek,
                    change: tasksChange >= 0 ? `+${tasksChange}%` : `${tasksChange}%`,
                    trend: tasksChange >= 0 ? 'up' : 'down'
                },
                projectsActive: {
                    current: projectsActive,
                    previous: projectsActive, // Simplification
                    change: 'Stable',
                    trend: 'stable'
                },
                productivity: {
                    current: productivity,
                    previous: Math.max(0, productivity - 5), // Simulation
                    change: '+5%', // Simulation
                    trend: 'up'
                }
            };
        };

        // ==================== RESPONSE (temporaire) ====================

        res.status(200).json({
            success: true,
            data: {
                focus
            }
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur dashboard',
            error: error.message
        });
    }
};