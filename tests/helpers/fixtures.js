const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for testing
 * @param {String} userId - User ID to encode in the token
 * @returns {String} JWT token
 */
const generateAuthToken = (userId) => {
  const token = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
  return token;
};

/**
 * Valid task creation payload
 */
const validTaskPayload = {
  title: 'Implement user authentication',
  description: 'Add JWT-based authentication to the API',
  type: 'dev',
  status: 'todo',
  priority: 'high',
  tags: ['backend', 'authentication'],
  estimatedTime: 240 // 4 hours in minutes
};

/**
 * Valid project creation payload
 */
const validProjectPayload = {
  name: 'E-Commerce Platform',
  description: 'Build a complete e-commerce platform with payment integration',
  type: 'dev',
  status: 'active',
  priority: 'high',
  color: '#7BBDE8',
  icon: '🛒'
};

/**
 * Valid goal creation payload
 */
const validGoalPayload = {
  title: 'Complete 100 coding commits',
  description: 'Maintain consistent coding practice by completing 100 commits this year',
  type: 'numeric',
  category: 'professional',
  level: 'annual',
  year: new Date().getFullYear(),
  target_value: 100,
  current_value: 0,
  unit: 'commits',
  priority: 'high',
  color: '#3B82F6',
  icon: '💻'
};

/**
 * Valid book project payload
 */
const validBookProjectPayload = {
  name: 'Clean Code by Robert Martin',
  description: 'Read and practice principles from Clean Code',
  type: 'book',
  book_pages: 464,
  book_author: 'Robert C. Martin',
  book_isbn: '978-0132350884',
  status: 'active',
  priority: 'normal',
  color: '#10B981',
  icon: '📚'
};

/**
 * Valid user registration payload
 */
const validUserPayload = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  password: 'SecurePass123'
};

/**
 * Invalid payloads for validation testing
 */
const invalidPayloads = {
  task: {
    missingTitle: {
      description: 'Task without title',
      type: 'dev'
    },
    invalidType: {
      title: 'Invalid task',
      type: 'invalid-type'
    },
    invalidStatus: {
      title: 'Invalid status task',
      status: 'invalid-status'
    }
  },
  project: {
    missingName: {
      description: 'Project without name',
      type: 'dev'
    },
    invalidType: {
      name: 'Invalid project',
      type: 'invalid-type'
    }
  },
  goal: {
    missingTitle: {
      type: 'simple',
      category: 'personal'
    },
    invalidCategory: {
      title: 'Invalid goal',
      category: 'invalid-category'
    }
  }
};

module.exports = {
  generateAuthToken,
  validTaskPayload,
  validProjectPayload,
  validGoalPayload,
  validBookProjectPayload,
  validUserPayload,
  invalidPayloads
};
