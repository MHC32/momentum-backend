const Habit = require('../models/Habit.model');
const ActivityLog = require('../models/ActivityLog.model'); // À créer après

// Helper pour émettre via Socket.IO
const emitHabitUpdate = (req, habit, type = 'habit-updated') => {
  const io = req.app.get('io');
  if (io && habit.user) {
    io.to(`user:${habit.user}`).emit(type, {
      habit: habit.toObject ? habit.toObject() : habit,
      type
    });
  }
};

// Helper pour logger l'activité
const logActivity = async (userId, activityType, entityType, entityId, details) => {
  try {
    // À implémenter quand ActivityLog.model sera créé
    console.log(`[ActivityLog] ${activityType}: ${entityType} ${entityId}`);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// ==================== CRUD ====================

// @desc    Get all habits for user
// @route   GET /api/habits
// @access  Private
exports.getHabits = async (req, res) => {
  try {
    const { category, status, due_today } = req.query;
    
    let query = { user: req.user.id };
    
    if (category) query.category = category;
    
    if (status === 'active') {
      query.is_active = true;
      query.is_archived = false;
    } else if (status === 'archived') {
      query.is_archived = true;
    } else if (status === 'inactive') {
      query.is_active = false;
    }
    
    const habits = await Habit.find(query)
      .sort({ 
        priority: -1,
        'streak.current': -1,
        createdAt: -1 
      });
    
    // Filtrer les habitudes dues aujourd'hui si demandé
    let filteredHabits = habits;
    if (due_today === 'true') {
      filteredHabits = habits.filter(habit => habit.is_due_today);
    }
    
    res.status(200).json({
      success: true,
      count: filteredHabits.length,
      data: filteredHabits
    });
  } catch (error) {
    console.error('Get Habits Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching habits',
      error: error.message
    });
  }
};

// @desc    Get single habit
// @route   GET /api/habits/:id
// @access  Private
exports.getHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }
    
    // Calculer les stats à jour
    await habit.calculateStats();
    await habit.save();
    
    res.status(200).json({
      success: true,
      data: habit
    });
  } catch (error) {
    console.error('Get Habit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching habit',
      error: error.message
    });
  }
};

// @desc    Create new habit
// @route   POST /api/habits
// @access  Private
exports.createHabit = async (req, res) => {
  try {
    // S'assurer que l'utilisateur est ajouté
    req.body.user = req.user.id;
    
    // Validation de la fréquence
    if (req.body.frequency) {
      const { type, times_per_week, specific_days, specific_dates } = req.body.frequency;
      
      if (type === 'weekly' && times_per_week) {
        // Si times_per_week est défini, on génère specific_days automatiquement
        if (!specific_days || specific_days.length === 0) {
          // Par défaut: répartir sur la semaine
          const days = [];
          for (let i = 0; i < times_per_week; i++) {
            days.push((i * 2) % 7); // Ex: 0, 2, 4 pour 3x/semaine
          }
          req.body.frequency.specific_days = days;
        }
      }
    }
    
    const habit = await Habit.create(req.body);
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'habit_created',
      'habit',
      habit._id,
      { name: habit.name, category: habit.category }
    );
    
    // Émettre via Socket.IO
    emitHabitUpdate(req, habit, 'habit-created');
    
    res.status(201).json({
      success: true,
      message: 'Habit created successfully',
      data: habit
    });
  } catch (error) {
    console.error('Create Habit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating habit',
      error: error.message
    });
  }
};

// @desc    Update habit
// @route   PUT /api/habits/:id
// @access  Private
exports.updateHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }
    
    const allowedUpdates = [
      'name', 'description', 'category', 'icon', 'color',
      'frequency', 'rules', 'reminders', 'priority',
      'learning_tracking.current_lesson', 'learning_tracking.current_topic',
      'is_active', 'tags'
    ];
    
    // Filtrer les mises à jour autorisées
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        habit[key] = req.body[key];
      }
    });
    
    // Mise à jour spécifique pour learning_tracking
    if (req.body.learning_tracking) {
      habit.learning_tracking = {
        ...habit.learning_tracking,
        ...req.body.learning_tracking
      };
    }
    
    await habit.save();
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'habit_updated',
      'habit',
      habit._id,
      { name: habit.name }
    );
    
    // Émettre via Socket.IO
    emitHabitUpdate(req, habit, 'habit-updated');
    
    res.status(200).json({
      success: true,
      message: 'Habit updated successfully',
      data: habit
    });
  } catch (error) {
    console.error('Update Habit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating habit',
      error: error.message
    });
  }
};

// @desc    Delete habit
// @route   DELETE /api/habits/:id
// @access  Private
exports.deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }
    
    // Logger l'activité avant suppression
    await logActivity(
      req.user.id,
      'habit_deleted',
      'habit',
      habit._id,
      { name: habit.name, streak: habit.streak.current }
    );
    
    // Émettre via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('habit-deleted', {
        habitId: habit._id,
        type: 'habit-deleted'
      });
    }
    
    await habit.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Habit deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Delete Habit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting habit',
      error: error.message
    });
  }
};

// ==================== ACTIONS SPÉCIFIQUES ====================

// @desc    Mark habit as completed for today
// @route   POST /api/habits/:id/complete
// @access  Private
exports.completeHabit = async (req, res) => {
  try {
    const { duration, notes, lesson_notes } = req.body;
    
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }
    
    // Vérifier si l'habitude est active
    if (!habit.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete an inactive habit'
      });
    }
    
    // Marquer comme complété
    habit.markAsCompleted(duration, notes);
    
    // Si c'est un cours avec des notes de leçon
    if (lesson_notes && habit.category === 'learning') {
      habit.learning_tracking.lesson_history.push({
        date: new Date(),
        lesson_number: habit.learning_tracking.current_lesson || 'Unnamed',
        topic: habit.learning_tracking.current_topic || '',
        notes: lesson_notes,
        duration: duration || habit.frequency.target_duration
      });
      
      habit.learning_tracking.completed_lessons += 1;
    }
    
    await habit.save();
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'habit_completed',
      'habit',
      habit._id,
      { 
        name: habit.name, 
        streak: habit.streak.current,
        duration: duration 
      }
    );
    
    // Émettre via Socket.IO
    emitHabitUpdate(req, habit, 'habit-completed');
    
    res.status(200).json({
      success: true,
      message: `Habit completed! Streak: ${habit.streak.current} days 🔥`,
      data: {
        habit,
        streak: habit.streak.current,
        missed_days: habit.missed_days
      }
    });
  } catch (error) {
    console.error('Complete Habit Error:', error);
    
    if (error.message === 'Habit already completed today') {
      return res.status(400).json({
        success: false,
        message: 'Habit already completed today'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error completing habit',
      error: error.message
    });
  }
};

// @desc    Mark habit as skipped for today
// @route   POST /api/habits/:id/skip
// @access  Private
exports.skipHabit = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }
    
    // Vérifier si déjà fait aujourd'hui
    if (habit.completed_today) {
      return res.status(400).json({
        success: false,
        message: 'Habit already completed today, cannot skip'
      });
    }
    
    // Marquer comme skip
    habit.markAsSkipped(reason);
    await habit.save();
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'habit_skipped',
      'habit',
      habit._id,
      { name: habit.name, reason: reason }
    );
    
    // Émettre via Socket.IO
    emitHabitUpdate(req, habit, 'habit-skipped');
    
    res.status(200).json({
      success: true,
      message: 'Habit skipped',
      data: {
        habit,
        streak: habit.streak.current,
        skips_this_month: habit.stats.total_skips
      }
    });
  } catch (error) {
    console.error('Skip Habit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error skipping habit',
      error: error.message
    });
  }
};

// @desc    Add lesson notes to learning habit
// @route   POST /api/habits/:id/lesson
// @access  Private
exports.addLessonNotes = async (req, res) => {
  try {
    const { lesson_number, topic, notes, duration } = req.body;
    
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user.id,
      category: 'learning'
    });
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Learning habit not found'
      });
    }
    
    // Ajouter à l'historique des leçons
    habit.learning_tracking.lesson_history.push({
      date: new Date(),
      lesson_number,
      topic,
      notes,
      duration
    });
    
    // Mettre à jour la leçon en cours
    habit.learning_tracking.current_lesson = lesson_number;
    habit.learning_tracking.current_topic = topic;
    habit.learning_tracking.completed_lessons += 1;
    
    await habit.save();
    
    // Logger l'activité
    await logActivity(
      req.user.id,
      'lesson_added',
      'habit',
      habit._id,
      { lesson: lesson_number, topic: topic }
    );
    
    res.status(200).json({
      success: true,
      message: 'Lesson notes added successfully',
      data: habit
    });
  } catch (error) {
    console.error('Add Lesson Notes Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding lesson notes',
      error: error.message
    });
  }
};

// @desc    Get habit statistics
// @route   GET /api/habits/:id/stats
// @access  Private
exports.getHabitStats = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }
    
    // Calculer les stats
    await habit.calculateStats();
    await habit.save();
    
    // Préparer les données pour graphiques
    const last30Days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const completions = habit.completion_history.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= date && entryDate < nextDay;
      });
      
      last30Days.push({
        date: date.toISOString().split('T')[0],
        completed: completions.some(c => c.completed),
        skipped: completions.some(c => c.skipped),
        duration: completions.find(c => c.duration)?.duration || 0
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        habit: habit,
        stats: habit.stats,
        streak: habit.streak,
        last30Days: last30Days,
        completion_rate: habit.stats.completion_rate,
        average_duration: habit.stats.average_duration,
        warning: habit.missed_days >= habit.rules.reset_after_missed_days - habit.rules.warning_days_before 
          ? `Streak will reset in ${habit.rules.reset_after_missed_days - habit.missed_days} days if not completed`
          : null
      }
    });
  } catch (error) {
    console.error('Get Habit Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching habit statistics',
      error: error.message
    });
  }
};

// @desc    Get habits due today
// @route   GET /api/habits/today/due
// @access  Private
exports.getHabitsDueToday = async (req, res) => {
  try {
    const habits = await Habit.find({
      user: req.user.id,
      is_active: true,
      is_archived: false
    });
    
    // Filtrer les habitudes dues aujourd'hui
    const today = new Date();
    const dueToday = habits.filter(habit => habit.is_due_today);
    
    // Séparer complétées vs non complétées
    const completed = dueToday.filter(habit => habit.completed_today);
    const pending = dueToday.filter(habit => !habit.completed_today);
    
    res.status(200).json({
      success: true,
      data: {
        due_today: dueToday.length,
        completed: completed.length,
        pending: pending.length,
        habits: {
          all_due: dueToday,
          completed,
          pending
        },
        streaks_at_risk: pending.filter(h => h.missed_days >= h.rules.reset_after_missed_days - 1).length
      }
    });
  } catch (error) {
    console.error('Get Habits Due Today Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching habits due today',
      error: error.message
    });
  }
};

// @desc    Archive habit
// @route   POST /api/habits/:id/archive
// @access  Private
exports.archiveHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }
    
    habit.is_archived = true;
    habit.is_active = false;
    await habit.save();
    
    res.status(200).json({
      success: true,
      message: 'Habit archived successfully',
      data: habit
    });
  } catch (error) {
    console.error('Archive Habit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving habit',
      error: error.message
    });
  }
};

// @desc    Unarchive habit
// @route   POST /api/habits/:id/unarchive
// @access  Private
exports.unarchiveHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }
    
    habit.is_archived = false;
    habit.is_active = true;
    await habit.save();
    
    res.status(200).json({
      success: true,
      message: 'Habit unarchived successfully',
      data: habit
    });
  } catch (error) {
    console.error('Unarchive Habit Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unarchiving habit',
      error: error.message
    });
  }
};

module.exports = exports;