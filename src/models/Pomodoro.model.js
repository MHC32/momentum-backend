const mongoose = require('mongoose');

const PomodoroSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  
  type: {
    type: String,
    enum: ['work', 'short-break', 'long-break'],
    default: 'work'
  },
  
  duration: {
    type: Number,
    required: true,
    default: 1500 // 25 minutes en secondes
  },
  
  completed: {
    type: Boolean,
    default: false
  },
  
  interrupted: {
    type: Boolean,
    default: false
  },
  
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  completedAt: Date,
  
  notes: String
}, {
  timestamps: true
});

// Index
PomodoroSchema.index({ user: 1, startedAt: -1 });
PomodoroSchema.index({ user: 1, completed: 1 });

// Méthode statique : stats par période
PomodoroSchema.statics.getStats = async function(userId, startDate, endDate) {
  const pomodoros = await this.find({
    user: userId,
    startedAt: { $gte: startDate, $lte: endDate }
  });
  
  return {
    total: pomodoros.length,
    completed: pomodoros.filter(p => p.completed).length,
    interrupted: pomodoros.filter(p => p.interrupted).length,
    totalMinutes: pomodoros.reduce((acc, p) => acc + (p.duration / 60), 0)
  };
};

module.exports = mongoose.model('Pomodoro', PomodoroSchema);