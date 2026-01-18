const mongoose = require('mongoose');
const { INTEGRATION_TYPE } = require('../utils/constants');

const goalIntegrationSchema = new mongoose.Schema(
  {
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoalBase',
      required: true,
      unique: true,
      index: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    integration_type: {
      type: String,
      enum: Object.values(INTEGRATION_TYPE),
      required: true
    },

    // Auto-sync configuration
    auto_sync_enabled: {
      type: Boolean,
      default: true
    },

    last_synced_at: Date,

    sync_frequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily'],
      default: 'realtime'
    },

    // Integration-specific config
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Sync history (last 10 syncs)
    sync_history: [{
      timestamp: Date,
      items_synced: Number,
      status: {
        type: String,
        enum: ['success', 'partial', 'failed']
      },
      error_message: String
    }]
  },
  {
    timestamps: true
  }
);

// Indexes
goalIntegrationSchema.index({ user: 1, integration_type: 1 });
goalIntegrationSchema.index({ auto_sync_enabled: 1 });

/**
 * Record a sync operation in the history
 * @param {number} itemsSynced - Number of items synced
 * @param {string} status - 'success', 'partial', or 'failed'
 * @param {string|null} errorMessage - Error message if any
 */
goalIntegrationSchema.methods.recordSync = function(itemsSynced, status, errorMessage = null) {
  this.sync_history.unshift({
    timestamp: new Date(),
    items_synced: itemsSynced,
    status,
    error_message: errorMessage
  });

  // Keep only last 10 syncs
  this.sync_history = this.sync_history.slice(0, 10);

  this.last_synced_at = new Date();
};

module.exports = mongoose.model('GoalIntegration', goalIntegrationSchema);
