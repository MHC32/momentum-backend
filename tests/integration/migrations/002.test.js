const mongoose = require('mongoose');
const Task = require('../../../src/models/Task.model');
const Commit = require('../../../src/models/Commit.model');
const { createTestUser, createTestProject } = require('../../helpers/testDb');

describe('Migration 002: Migrate Embedded Commits to Commit Collection', () => {
  it('should migrate embedded commits array to Commit documents', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user._id);

    // Create task with old schema (embedded commits array)
    const taskData = {
      title: 'Task with Commits',
      user: user._id,
      project: project._id,
      commits: [
        {
          message: 'feat: initial commit',
          hash: 'abc123',
          timestamp: new Date('2024-01-15T10:00:00'),
          author: 'Test Author',
          url: 'https://github.com/test/repo/commit/abc123',
          repo: 'test-repo'
        },
        {
          message: 'fix: bug fix',
          hash: 'def456',
          timestamp: new Date('2024-01-16T11:00:00'),
          author: 'Test Author',
          url: 'https://github.com/test/repo/commit/def456',
          repo: 'test-repo'
        }
      ]
    };

    const collection = mongoose.connection.collection('tasks');
    const result = await collection.insertOne(taskData);

    // Verify old embedded commits exist
    const oldTask = await collection.findOne({ _id: result.insertedId });
    expect(oldTask.commits).toBeDefined();
    expect(oldTask.commits.length).toBe(2);

    // Verify no Commit documents exist yet
    const commitsBefore = await Commit.countDocuments({ task: result.insertedId });
    expect(commitsBefore).toBe(0);

    // Run migration
    const migration = require('../../../src/migrations/002-migrate-commits-to-collection');
    await migration.up();

    // Verify Commit documents were created
    const commitsAfter = await Commit.find({ task: result.insertedId }).sort({ timestamp: 1 });
    expect(commitsAfter.length).toBe(2);

    // Verify first commit
    expect(commitsAfter[0].hash).toBe('abc123');
    expect(commitsAfter[0].message).toBe('feat: initial commit');
    expect(commitsAfter[0].author).toBe('Test Author');
    expect(commitsAfter[0].url).toBe('https://github.com/test/repo/commit/abc123');
    expect(commitsAfter[0].repo).toBe('test-repo');
    expect(commitsAfter[0].task.toString()).toBe(result.insertedId.toString());
    expect(commitsAfter[0].user.toString()).toBe(user._id.toString());
    expect(commitsAfter[0].project.toString()).toBe(project._id.toString());

    // Verify second commit
    expect(commitsAfter[1].hash).toBe('def456');
    expect(commitsAfter[1].message).toBe('fix: bug fix');

    // Verify commits field removed from task
    const migratedTask = await collection.findOne({ _id: result.insertedId });
    expect(migratedTask.commits).toBeUndefined();
  });

  it('should be idempotent - running twice should not duplicate commits', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user._id);

    // Create task with embedded commits
    const taskData = {
      title: 'Idempotent Test Task',
      user: user._id,
      project: project._id,
      commits: [
        {
          message: 'feat: test',
          hash: 'xyz789',
          timestamp: new Date(),
          author: 'Test Author',
          url: 'https://github.com/test/repo/commit/xyz789',
          repo: 'test-repo'
        }
      ]
    };

    const collection = mongoose.connection.collection('tasks');
    const result = await collection.insertOne(taskData);

    // Run migration first time
    const migration = require('../../../src/migrations/002-migrate-commits-to-collection');
    await migration.up();

    // Verify commits created
    const commitsFirstRun = await Commit.countDocuments({ task: result.insertedId });
    expect(commitsFirstRun).toBe(1);

    // Run migration second time
    await migration.up();

    // Verify no duplicate commits created
    const commitsSecondRun = await Commit.countDocuments({ task: result.insertedId });
    expect(commitsSecondRun).toBe(1);
  });

  it('should handle tasks without commits field gracefully', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user._id);

    // Create task without commits field
    const taskData = {
      title: 'Task Without Commits',
      user: user._id,
      project: project._id
    };

    const collection = mongoose.connection.collection('tasks');
    const result = await collection.insertOne(taskData);

    // Run migration
    const migration = require('../../../src/migrations/002-migrate-commits-to-collection');
    await expect(migration.up()).resolves.toBeDefined();

    // Verify no commits created
    const commits = await Commit.countDocuments({ task: result.insertedId });
    expect(commits).toBe(0);
  });

  it('should handle tasks with empty commits array', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user._id);

    // Create task with empty commits array
    const taskData = {
      title: 'Task With Empty Commits',
      user: user._id,
      project: project._id,
      commits: []
    };

    const collection = mongoose.connection.collection('tasks');
    const result = await collection.insertOne(taskData);

    // Run migration
    const migration = require('../../../src/migrations/002-migrate-commits-to-collection');
    await migration.up();

    // Verify no commits created
    const commits = await Commit.countDocuments({ task: result.insertedId });
    expect(commits).toBe(0);

    // Verify commits field removed
    const migratedTask = await collection.findOne({ _id: result.insertedId });
    expect(migratedTask.commits).toBeUndefined();
  });

  it('should handle tasks without project', async () => {
    const user = await createTestUser();

    // Create task without project but with commits
    const taskData = {
      title: 'Task Without Project',
      user: user._id,
      project: null,
      commits: [
        {
          message: 'feat: no project',
          hash: 'noproject123',
          timestamp: new Date(),
          author: 'Test Author'
        }
      ]
    };

    const collection = mongoose.connection.collection('tasks');
    const result = await collection.insertOne(taskData);

    // Run migration
    const migration = require('../../../src/migrations/002-migrate-commits-to-collection');
    await migration.up();

    // Verify commit created without project reference
    const commits = await Commit.find({ task: result.insertedId });
    expect(commits.length).toBe(1);
    expect(commits[0].hash).toBe('noproject123');
    expect(commits[0].project).toBeUndefined();
  });
});
