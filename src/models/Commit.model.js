const mongoose = require('mongoose');

const CommitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    index: true
  },
  
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    index: true
  },
  
  count: {
    type: Number,
    default: 1,
    min: 1
  },
  
  message: String,
  hash: String,
  author: String,
  url: String,
  repo: String,
  
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  source: {
    type: String,
    enum: ['manual', 'github'],
    default: 'manual'
  }
}, {
  timestamps: true
});

// Index composés pour queries rapides
CommitSchema.index({ user: 1, timestamp: -1 });
CommitSchema.index({ user: 1, project: 1, timestamp: -1 });
CommitSchema.index({ user: 1, task: 1, timestamp: -1 });

// Méthode statique : compter commits par période
CommitSchema.statics.countByPeriod = async function(userId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' }
      }
    }
  ]);
  
  return result[0]?.total || 0;
};

module.exports = mongoose.model('Commit', CommitSchema);