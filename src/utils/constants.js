/**
 * Application-wide constants
 * Centralizes all enum values and configuration constants
 */

// ==================== TASK CONSTANTS ====================

const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done'
};

const TASK_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const TASK_TYPE = {
  DEV: 'dev',
  PERSONAL: 'personal',
  GOAL: 'goal',
  HABIT: 'habit'
};

// ==================== PROJECT CONSTANTS ====================

const PROJECT_TYPE = {
  DEV: 'dev',
  PERSONAL: 'personal',
  BOOK: 'book'
};

const PROJECT_STATUS = {
  ACTIVE: 'active',
  ON_HOLD: 'on-hold',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

// ==================== GOAL CONSTANTS ====================

const GOAL_TYPE = {
  NUMERIC: 'numeric',
  STEPS: 'steps',
  SIMPLE: 'simple'
};

const GOAL_LEVEL = {
  ANNUAL: 'annual',
  QUARTERLY: 'quarterly',
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
  DAILY: 'daily',
  NONE: 'none'
};

const GOAL_CATEGORY = {
  FINANCIAL: 'financial',
  PROFESSIONAL: 'professional',
  LEARNING: 'learning',
  PERSONAL: 'personal',
  HEALTH: 'health'
};

const GOAL_STATUS = {
  NOT_STARTED: 'not-started',
  ON_TRACK: 'on-track',
  AT_RISK: 'at-risk',
  BEHIND: 'behind',
  COMPLETED: 'completed'
};

const GOAL_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// ==================== INTEGRATION CONSTANTS ====================

const INTEGRATION_TYPE = {
  NONE: 'none',
  COMMITS: 'commits',
  BOOKS: 'books',
  RISE_SAVINGS: 'rise_savings',
  RISE_EXPENSES: 'rise_expenses'
};

// ==================== BADGE CONSTANTS ====================

const BADGE_TYPE = {
  // First achievements
  FIRST_TASK: 'first-task',
  FIRST_COMMIT: 'first-commit',
  FIRST_GOAL: 'first-goal',

  // Task achievements
  TASK_MASTER_10: 'task-master-10',
  TASK_MASTER_50: 'task-master-50',
  TASK_MASTER_100: 'task-master-100',

  // Commit achievements
  COMMIT_STREAK_7: 'commit-streak-7',
  COMMIT_STREAK_30: 'commit-streak-30',
  COMMIT_STREAK_100: 'commit-streak-100',
  CENTURY_COMMITS: 'century-commits',

  // Goal achievements
  GOAL_CRUSHER: 'goal-crusher',

  // Time-based achievements
  EARLY_BIRD: 'early-bird',
  NIGHT_OWL: 'night-owl',
  WEEKEND_WARRIOR: 'weekend-warrior',
  POMODORO_MASTER: 'pomodoro-master',

  // Project achievements
  PROJECT_STARTER: 'project-starter',
  PROJECT_FINISHER: 'project-finisher',
  MULTITASKER: 'multitasker',

  // Special achievements
  FOCUSED_MIND: 'focused-mind',
  HABIT_BUILDER: 'habit-builder',
  REVIEW_MASTER: 'review-master',
  SPEED_DEMON: 'speed-demon',
  PERFECTIONIST: 'perfectionist',
  EXPLORER: 'explorer'
};

const BADGE_CATEGORY = {
  TASKS: 'tasks',
  COMMITS: 'commits',
  GOALS: 'goals',
  HABITS: 'habits',
  TIME: 'time',
  SPECIAL: 'special'
};

const BADGE_RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
};

// ==================== ACTIVITY CONSTANTS ====================

const ACTIVITY_TYPE = {
  COMMIT: 'commit',
  TASK_COMPLETED: 'task-completed',
  GOAL_ACHIEVED: 'goal-achieved',
  POMODORO_COMPLETED: 'pomodoro-completed',
  HABIT_COMPLETED: 'habit-completed',
  BADGE_UNLOCKED: 'badge-unlocked',
  PROJECT_CREATED: 'project-created',
  COMMITS_GROUPED: 'commits-grouped'
};

// ==================== PAGINATION CONSTANTS ====================

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// ==================== XP REWARDS ====================

const XP_REWARDS = {
  TASK_COMPLETED: 50,
  TASK_HIGH_PRIORITY: 25,
  TASK_CRITICAL_PRIORITY: 50,
  GOAL_COMPLETED: 200,
  GOAL_MILESTONE: 100,
  COMMIT: 10,
  POMODORO_COMPLETED: 25,
  HABIT_COMPLETED: 30,
  PROJECT_COMPLETED: 300,
  BADGE_COMMON: 50,
  BADGE_RARE: 150,
  BADGE_EPIC: 300,
  BADGE_LEGENDARY: 500,
  DAILY_STREAK: 20,
  WEEKLY_REVIEW: 100
};

// ==================== USER CONSTANTS ====================

const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin'
};

// ==================== EXPORTS ====================

module.exports = {
  // Task
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_TYPE,

  // Project
  PROJECT_TYPE,
  PROJECT_STATUS,

  // Goal
  GOAL_TYPE,
  GOAL_LEVEL,
  GOAL_CATEGORY,
  GOAL_STATUS,
  GOAL_PRIORITY,

  // Integration
  INTEGRATION_TYPE,

  // Badge
  BADGE_TYPE,
  BADGE_CATEGORY,
  BADGE_RARITY,

  // Activity
  ACTIVITY_TYPE,

  // Pagination
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,

  // XP
  XP_REWARDS,

  // User
  USER_ROLE
};
