const { validationResult } = require('express-validator');
const {
  createTaskValidator,
  updateTaskValidator,
  taskIdValidator,
  updateTaskStatusValidator
} = require('../../src/validators/task.validator');
const {
  createProjectValidator,
  updateProjectValidator,
  projectIdValidator
} = require('../../src/validators/project.validator');
const {
  createGoalValidator,
  updateGoalValidator,
  updateGoalProgressValidator,
  goalIdValidator,
  quarterValidator,
  monthValidator,
  weekValidator
} = require('../../src/validators/goal.validator');
const {
  registerValidator,
  loginValidator,
  updateDetailsValidator,
  updatePasswordValidator
} = require('../../src/validators/auth.validator');

/**
 * Helper function to run validators and get errors
 */
const runValidators = async (validators, req) => {
  for (let validator of validators) {
    await validator.run(req);
  }
  return validationResult(req);
};

/**
 * Create a mock Express request object
 */
const mockRequest = (body = {}, params = {}, query = {}) => ({
  body,
  params,
  query,
  cookies: {},
  headers: {},
  get: function(name) { return this.headers[name]; },
  header: function(name) { return this.headers[name]; }
});

describe('Validator Integration Tests', () => {
  describe('Task Validators', () => {
    it('should reject task creation with invalid data', async () => {
      const req = mockRequest({ title: '', priority: 'invalid' });
      const result = await runValidators(createTaskValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      expect(result.array().length).toBeGreaterThan(0);
    });

    it('should accept task creation with valid data', async () => {
      const req = mockRequest({
        title: 'Valid Task',
        priority: 'high',
        status: 'todo'
      });
      const result = await runValidators(createTaskValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject task update with invalid task ID', async () => {
      const req = mockRequest({ title: 'Updated Task' }, { id: 'invalid-id' });
      const result = await runValidators(updateTaskValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.msg.includes('valid MongoDB ID'))).toBe(true);
    });

    it('should reject task status update with invalid status', async () => {
      const req = mockRequest(
        { status: 'invalid-status' },
        { id: '507f1f77bcf86cd799439011' }
      );
      const result = await runValidators(updateTaskStatusValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'status')).toBe(true);
    });

    it('should accept valid task ID', async () => {
      const req = mockRequest({}, { id: '507f1f77bcf86cd799439011' });
      const result = await runValidators(taskIdValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('Project Validators', () => {
    it('should reject project creation with missing name', async () => {
      const req = mockRequest({ type: 'dev' });
      const result = await runValidators(createProjectValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'name')).toBe(true);
    });

    it('should accept project creation with valid data', async () => {
      const req = mockRequest({
        name: 'Valid Project',
        type: 'dev'
      });
      const result = await runValidators(createProjectValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject project update with invalid color format', async () => {
      const req = mockRequest(
        { color: 'invalid-color' },
        { id: '507f1f77bcf86cd799439011' }
      );
      const result = await runValidators(updateProjectValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'color')).toBe(true);
    });

    it('should accept valid project ID', async () => {
      const req = mockRequest({}, { id: '507f1f77bcf86cd799439011' });
      const result = await runValidators(projectIdValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('Goal Validators', () => {
    it('should reject goal creation with missing required fields', async () => {
      const req = mockRequest({ title: 'Test Goal' });
      const result = await runValidators(createGoalValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'type' || err.path === 'category')).toBe(true);
    });

    it('should accept goal creation with valid data', async () => {
      const req = mockRequest({
        title: 'Valid Goal',
        type: 'simple',
        category: 'personal'
      });
      const result = await runValidators(createGoalValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject quarterly goals with invalid quarter', async () => {
      const req = mockRequest({}, { quarter: '5' });
      const result = await runValidators(quarterValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'quarter')).toBe(true);
    });

    it('should accept valid quarter', async () => {
      const req = mockRequest({}, { quarter: '2' });
      const result = await runValidators(quarterValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject monthly goals with invalid month', async () => {
      const req = mockRequest({}, { month: '13' });
      const result = await runValidators(monthValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'month')).toBe(true);
    });

    it('should accept valid month', async () => {
      const req = mockRequest({}, { month: '6' });
      const result = await runValidators(monthValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject weekly goals with invalid week', async () => {
      const req = mockRequest({}, { week: '54' });
      const result = await runValidators(weekValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'week')).toBe(true);
    });

    it('should accept valid week', async () => {
      const req = mockRequest({}, { week: '30' });
      const result = await runValidators(weekValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should accept valid goal ID', async () => {
      const req = mockRequest({}, { id: '507f1f77bcf86cd799439011' });
      const result = await runValidators(goalIdValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should accept goal update with valid data', async () => {
      const req = mockRequest(
        { title: 'Updated Goal', current_value: 50 },
        { id: '507f1f77bcf86cd799439011' }
      );
      const result = await runValidators(updateGoalValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should accept goal progress update with valid data', async () => {
      const req = mockRequest(
        { current_value: 75 },
        { id: '507f1f77bcf86cd799439011' }
      );
      const result = await runValidators(updateGoalProgressValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('Auth Validators', () => {
    it('should reject weak password on registration', async () => {
      const req = mockRequest({
        name: 'Test User',
        email: 'newtest@example.com',
        password: 'weak'
      });
      const result = await runValidators(registerValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err =>
        err.path === 'password' && (
          err.msg.includes('8 characters') ||
          err.msg.includes('uppercase') ||
          err.msg.includes('lowercase') ||
          err.msg.includes('number')
        )
      )).toBe(true);
    });

    it('should reject password without uppercase letter', async () => {
      const req = mockRequest({
        name: 'Test User',
        email: 'newtest2@example.com',
        password: 'lowercase123'
      });
      const result = await runValidators(registerValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'password')).toBe(true);
    });

    it('should reject password without number', async () => {
      const req = mockRequest({
        name: 'Test User',
        email: 'newtest3@example.com',
        password: 'NoNumbers'
      });
      const result = await runValidators(registerValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'password')).toBe(true);
    });

    it('should reject password without lowercase letter', async () => {
      const req = mockRequest({
        name: 'Test User',
        email: 'newtest4@example.com',
        password: 'NOLOWERCASE123'
      });
      const result = await runValidators(registerValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'password')).toBe(true);
    });

    it('should accept strong password on registration', async () => {
      const req = mockRequest({
        name: 'Test User',
        email: 'newuser@example.com',
        password: 'Strong123'
      });
      const result = await runValidators(registerValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const req = mockRequest({
        name: 'Test User',
        email: 'invalid-email',
        password: 'Strong123'
      });
      const result = await runValidators(registerValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'email')).toBe(true);
    });

    it('should reject login with missing password', async () => {
      const req = mockRequest({
        email: 'test@example.com'
      });
      const result = await runValidators(loginValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'password')).toBe(true);
    });

    it('should accept valid login credentials', async () => {
      const req = mockRequest({
        email: 'test@example.com',
        password: 'anypassword'
      });
      const result = await runValidators(loginValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should accept valid update details', async () => {
      const req = mockRequest({
        name: 'Updated Name',
        email: 'updated@example.com'
      });
      const result = await runValidators(updateDetailsValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should accept valid password update', async () => {
      const req = mockRequest({
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456'
      });
      const result = await runValidators(updatePasswordValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(true);
    });

    it('should reject weak new password on update', async () => {
      const req = mockRequest({
        currentPassword: 'OldPass123',
        newPassword: 'weak'
      });
      const result = await runValidators(updatePasswordValidator.slice(0, -1), req);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'newPassword')).toBe(true);
    });
  });
});
