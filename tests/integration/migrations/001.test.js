const mongoose = require('mongoose');
const Task = require('../../../src/models/Task.model');
const { createTestUser, createTestProject } = require('../../helpers/testDb');

describe('Migration 001: Remove Task gitCommits', () => {
  it('should remove gitCommits field from existing tasks', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user._id);

    // Create task with old schema (directly insert to bypass model validation)
    const taskData = {
      title: 'Old Task',
      user: user._id,
      project: project._id,
      gitCommits: [
        { message: 'feat: test', timestamp: new Date(), hash: 'abc123' }
      ]
    };

    const collection = mongoose.connection.collection('tasks');
    const result = await collection.insertOne(taskData);

    // Verify old field exists
    const oldTask = await collection.findOne({ _id: result.insertedId });
    expect(oldTask.gitCommits).toBeDefined();
    expect(oldTask.gitCommits.length).toBe(1);

    // Run migration
    const migration = require('../../../src/migrations/001-remove-task-git-commits');
    await migration.up();

    // Verify field removed
    const migratedTask = await collection.findOne({ _id: result.insertedId });
    expect(migratedTask.gitCommits).toBeUndefined();
  });

  it('should be idempotent - running twice should not cause errors', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user._id);

    // Create task with old schema
    const taskData = {
      title: 'Idempotent Test Task',
      user: user._id,
      project: project._id,
      gitCommits: [
        { message: 'feat: idempotent test', timestamp: new Date(), hash: 'xyz789' }
      ]
    };

    const collection = mongoose.connection.collection('tasks');
    const result = await collection.insertOne(taskData);

    // Run migration first time
    const migration = require('../../../src/migrations/001-remove-task-git-commits');
    await migration.up();

    // Verify field removed
    let migratedTask = await collection.findOne({ _id: result.insertedId });
    expect(migratedTask.gitCommits).toBeUndefined();

    // Run migration second time (should not error)
    await expect(migration.up()).resolves.toBeDefined();

    // Verify still no gitCommits field
    migratedTask = await collection.findOne({ _id: result.insertedId });
    expect(migratedTask.gitCommits).toBeUndefined();
  });

  it('should handle tasks without gitCommits field gracefully', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user._id);

    // Create task without gitCommits field (new schema)
    const taskData = {
      title: 'New Task',
      user: user._id,
      project: project._id
    };

    const collection = mongoose.connection.collection('tasks');
    const result = await collection.insertOne(taskData);

    // Verify no gitCommits field
    const newTask = await collection.findOne({ _id: result.insertedId });
    expect(newTask.gitCommits).toBeUndefined();

    // Run migration (should not error)
    const migration = require('../../../src/migrations/001-remove-task-git-commits');
    await expect(migration.up()).resolves.toBeDefined();

    // Verify still no gitCommits field
    const stillNewTask = await collection.findOne({ _id: result.insertedId });
    expect(stillNewTask.gitCommits).toBeUndefined();
  });
});
