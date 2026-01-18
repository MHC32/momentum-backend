const mongoose = require('mongoose');

/**
 * Migration: Remove gitCommits embedded array from Task model
 * Reason: Using separate Commit model for better data integrity
 */
const up = async () => {
  const db = mongoose.connection.db;
  const collection = db.collection('tasks');

  console.log('Starting migration: Remove Task.gitCommits...');

  // Remove gitCommits field from all tasks
  const result = await collection.updateMany(
    { gitCommits: { $exists: true } },
    { $unset: { gitCommits: "" } }
  );

  console.log(`Migration complete: ${result.modifiedCount} tasks updated`);
  return result;
};

/**
 * Rollback migration (not recommended, data will be lost)
 */
const down = async () => {
  console.log('Warning: Cannot restore deleted gitCommits data');
  console.log('This migration is not reversible without backup');
  return { acknowledged: true, modifiedCount: 0 };
};

module.exports = { up, down };
