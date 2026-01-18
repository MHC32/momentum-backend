const mongoose = require('mongoose');

/**
 * Migration: Migrate embedded commits array to separate Commit collection
 * Reason: Remove dual commit tracking system - use only Commit model
 */
const up = async () => {
  const db = mongoose.connection.db;
  const tasksCollection = db.collection('tasks');
  const commitsCollection = db.collection('commits');

  console.log('Starting migration: Migrate embedded commits to Commit collection...');

  // Find all tasks with embedded commits array
  const tasksWithCommits = await tasksCollection.find({
    commits: { $exists: true, $type: 'array', $ne: [] }
  }).toArray();

  console.log(`Found ${tasksWithCommits.length} tasks with embedded commits`);

  let totalCommitsMigrated = 0;

  // Process each task
  for (const task of tasksWithCommits) {
    if (!task.commits || task.commits.length === 0) {
      continue;
    }

    for (const commit of task.commits) {
      // Check if commit already exists (for idempotency)
      const existingCommit = await commitsCollection.findOne({
        hash: commit.hash,
        task: task._id
      });

      if (existingCommit) {
        console.log(`Commit ${commit.hash} already exists for task ${task._id}, skipping`);
        continue;
      }

      // Create new Commit document
      const commitDoc = {
        user: task.user,
        project: task.project || undefined, // Only include if exists
        task: task._id,
        hash: commit.hash,
        message: commit.message,
        author: commit.author,
        url: commit.url,
        repo: commit.repo,
        timestamp: commit.timestamp || new Date(),
        source: 'github',
        count: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove undefined fields
      Object.keys(commitDoc).forEach(key => {
        if (commitDoc[key] === undefined) {
          delete commitDoc[key];
        }
      });

      await commitsCollection.insertOne(commitDoc);
      totalCommitsMigrated++;
    }
  }

  console.log(`Migrated ${totalCommitsMigrated} commits to Commit collection`);

  // Remove commits field from all tasks (including empty arrays)
  const removeResult = await tasksCollection.updateMany(
    { commits: { $exists: true } },
    { $unset: { commits: "" } }
  );

  console.log(`Removed commits field from ${removeResult.modifiedCount} tasks`);
  console.log('Migration complete!');

  return {
    tasksMigrated: tasksWithCommits.length,
    commitsMigrated: totalCommitsMigrated,
    tasksUpdated: removeResult.modifiedCount
  };
};

/**
 * Rollback migration (not recommended, data structure has changed)
 */
const down = async () => {
  console.log('Warning: Cannot restore embedded commits from Commit collection');
  console.log('Data has been migrated to a different structure');
  console.log('Manual intervention required if rollback is necessary');
  return { acknowledged: true, modifiedCount: 0 };
};

module.exports = { up, down };
