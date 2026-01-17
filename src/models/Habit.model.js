const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    maxlength: 1000
  },
  
  icon: {
    type: String,
    default: '🎯'
  },
  
  goal: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  goalType: {
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    default: 'daily'
  },
  
  calendar: [{
    date: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['done', 'skip', 'missed'],
      required: true
    },
    notes: {
      type: String,
      maxlength: 500
    }
  }],
  
  streak: {
    current: {
      type: Number,
      default: 0
    },
    record: {
      type: Number,
      default: 0
    }
  },
  
  stats: {
    totalCompleted: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    lastCompleted: Date
  },
  
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index
HabitSchema.index({ user: 1, archived: 1 });

// Calculer streak
HabitSchema.methods.calculateStreak = function() {
  if (!this.calendar || this.calendar.length === 0) {
    return 0;
  }
  
  // Filtrer seulement les 'done'
  const sortedDone = this.calendar
    .filter(c => c.status === 'done')
    .sort((a, b) => b.date - a.date); // Plus récent en premier
  
  if (sortedDone.length === 0) {
    return 0;
  }
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  for (const entry of sortedDone) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    
    // Calculer différence en jours
    const diffDays = Math.floor((currentDate - entryDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === streak) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
};

module.exports = mongoose.model('Habit', HabitSchema);