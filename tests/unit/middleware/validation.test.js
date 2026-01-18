const { validationResult } = require('express-validator');
const { handleValidationErrors } = require('../../../src/middleware/validation');

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next if no validation errors', () => {
    const mockErrors = {
      isEmpty: () => true,
      array: () => []
    };
    validationResult.mockReturnValue(mockErrors);

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 with errors if validation fails', () => {
    const mockErrors = {
      isEmpty: () => false,
      array: () => [
        { param: 'title', msg: 'Title is required', value: '' },
        { param: 'email', msg: 'Invalid email format', value: 'invalid' }
      ]
    };
    validationResult.mockReturnValue(mockErrors);

    handleValidationErrors(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errors: [
        { field: 'title', message: 'Title is required', value: '' },
        { field: 'email', message: 'Invalid email format', value: 'invalid' }
      ]
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should format multiple validation errors correctly', () => {
    const mockErrors = {
      isEmpty: () => false,
      array: () => [
        { param: 'name', msg: 'Name must be at least 2 characters', value: 'a' },
        { param: 'password', msg: 'Password must be at least 6 characters', value: '123' }
      ]
    };
    validationResult.mockReturnValue(mockErrors);

    handleValidationErrors(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'name', message: 'Name must be at least 2 characters' }),
        expect.objectContaining({ field: 'password', message: 'Password must be at least 6 characters' })
      ])
    });
  });
});
