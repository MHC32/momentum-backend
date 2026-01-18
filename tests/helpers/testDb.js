const User = require('../../src/models/User.model');
const Project = require('../../src/models/Project.model');
const Task = require('../../src/models/Task.model');
const Goal = require('../../src/models/Goal.model');

/**
 * Create a test user with default or custom values
 * @param {Object} overrides - Custom values to override defaults
 * @returns {Promise<Object>} Created user document
 */
const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123',
    xp: 0,
    level: 1,
    role: 'user',
    isActive: true,
    ...overrides
  };

  const user = await User.create(defaultUser);
  return user;
};

/**
 * Create a test project for a user
 * @param {String} userId - User ID who owns the project
 * @param {Object} overrides - Custom values to override defaults
 * @returns {Promise<Object>} Created project document
 */
const createTestProject = async (userId, overrides = {}) => {
  const defaultProject = {
    name: 'Test Project',
    description: 'A test project for testing purposes',
    type: 'dev',
    color: '#7BBDE8',
    status: 'active',
    priority: 'normal',
    progress: 0,
    user: userId,
    ...overrides
  };

  const project = await Project.create(defaultProject);
  return project;
};

/**
 * Create a test task for a user and optionally a project
 * @param {String} userId - User ID who owns the task
 * @param {String} projectId - Optional project ID to link the task to
 * @param {Object} overrides - Custom values to override defaults
 * @returns {Promise<Object>} Created task document
 */
const createTestTask = async (userId, projectId = null, overrides = {}) => {
  const defaultTask = {
    title: 'Test Task',
    description: 'A test task for testing purposes',
    type: 'dev',
    status: 'todo',
    priority: 'normal',
    progress: 0,
    completed: false,
    user: userId,
    project: projectId,
    ...overrides
  };

  const task = await Task.create(defaultTask);
  return task;
};

/**
 * Create a test goal for a user
 * @param {String} userId - User ID who owns the goal
 * @param {Object} overrides - Custom values to override defaults
 * @returns {Promise<Object>} Created goal document
 */
const createTestGoal = async (userId, overrides = {}) => {
  const currentYear = new Date().getFullYear();

  const defaultGoal = {
    user: userId,
    title: 'Test Goal',
    description: 'A test goal for testing purposes',
    type: 'simple',
    category: 'personal',
    level: 'annual',
    year: currentYear,
    status: 'not-started',
    completed: false,
    progress_percent: 0,
    priority: 'medium',
    color: '#3B82F6',
    icon: '🎯',
    ...overrides
  };

  const goal = await Goal.create(defaultGoal);
  return goal;
};

module.exports = {
  createTestUser,
  createTestProject,
  createTestTask,
  createTestGoal
};
