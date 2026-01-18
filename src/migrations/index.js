const mongoose = require('mongoose');

const migrations = [
  require('./001-remove-task-git-commits'),
  require('./002-migrate-commits-to-collection')
];

/**
 * Run all pending migrations
 */
const runMigrations = async () => {
  console.log('Running migrations...');

  for (const migration of migrations) {
    try {
      await migration.up();
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  console.log('All migrations completed successfully');
};

module.exports = { runMigrations };
