const BaseService = require('../../../src/services/BaseService');
const User = require('../../../src/models/User.model');

class TestService extends BaseService {
  constructor() {
    super(User);
  }
}

describe('BaseService', () => {
  let service;

  beforeEach(() => {
    service = new TestService();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('findById', () => {
    it('should find document by id', async () => {
      const user = await User.create({
        name: 'Test',
        email: 'test@test.com',
        password: 'password123'
      });

      const found = await service.findById(user._id);

      expect(found).toBeDefined();
      expect(found.name).toBe('Test');
    });

    it('should return null for non-existent id', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();
      const found = await service.findById(fakeId);

      expect(found).toBeNull();
    });

    it('should support select option', async () => {
      const user = await User.create({
        name: 'Test',
        email: 'test@test.com',
        password: 'password123'
      });

      const found = await service.findById(user._id, { select: 'name email' });

      expect(found).toBeDefined();
      expect(found.name).toBe('Test');
      expect(found.email).toBe('test@test.com');
      expect(found.password).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create new document', async () => {
      const data = {
        name: 'New User',
        email: 'new@test.com',
        password: 'password123'
      };

      const created = await service.create(data);

      expect(created).toBeDefined();
      expect(created.name).toBe('New User');
    });
  });

  describe('update', () => {
    it('should update existing document', async () => {
      const user = await User.create({
        name: 'Original',
        email: 'original@test.com',
        password: 'password123'
      });

      const updated = await service.update(user._id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should delete document', async () => {
      const user = await User.create({
        name: 'To Delete',
        email: 'delete@test.com',
        password: 'password123'
      });

      await service.delete(user._id);

      const found = await User.findById(user._id);
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all documents', async () => {
      await User.create([
        { name: 'User1', email: 'user1@test.com', password: 'Password123' },
        { name: 'User2', email: 'user2@test.com', password: 'Password123' }
      ]);

      const results = await service.findAll();

      expect(results.length).toBe(2);
    });

    it('should apply pagination', async () => {
      await User.create([
        { name: 'User1', email: 'user1@test.com', password: 'Password123' },
        { name: 'User2', email: 'user2@test.com', password: 'Password123' },
        { name: 'User3', email: 'user3@test.com', password: 'Password123' }
      ]);

      const results = await service.findAll({}, { page: 1, limit: 2 });

      expect(results.length).toBe(2);
    });

    it('should apply filter', async () => {
      await User.create([
        { name: 'Alice', email: 'alice@test.com', password: 'Password123' },
        { name: 'Bob', email: 'bob@test.com', password: 'Password123' }
      ]);

      const results = await service.findAll({ name: 'Alice' });

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Alice');
    });

    it('should support select option', async () => {
      await User.create([
        { name: 'User1', email: 'user1@test.com', password: 'Password123' },
        { name: 'User2', email: 'user2@test.com', password: 'Password123' }
      ]);

      const results = await service.findAll({}, { select: 'name email' });

      expect(results.length).toBe(2);
      expect(results[0].password).toBeUndefined();
    });
  });

  describe('count', () => {
    it('should count all documents', async () => {
      await User.create([
        { name: 'User1', email: 'user1@test.com', password: 'Password123' },
        { name: 'User2', email: 'user2@test.com', password: 'Password123' }
      ]);

      const count = await service.count();

      expect(count).toBe(2);
    });

    it('should count with filter', async () => {
      await User.create([
        { name: 'Alice', email: 'alice@test.com', password: 'Password123' },
        { name: 'Bob', email: 'bob@test.com', password: 'Password123' }
      ]);

      const count = await service.count({ name: 'Alice' });

      expect(count).toBe(1);
    });
  });

  describe('exists', () => {
    it('should return true if document exists', async () => {
      const user = await User.create({
        name: 'Test',
        email: 'test@test.com',
        password: 'Password123'
      });

      const exists = await service.exists(user._id);

      expect(exists).toBe(true);
    });

    it('should return false if document does not exist', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      const exists = await service.exists(fakeId);

      expect(exists).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should throw error for invalid ID in findById', async () => {
      await expect(service.findById(null)).rejects.toThrow('ID is required');
    });

    it('should throw error for invalid ID type in findById', async () => {
      await expect(service.findById(123)).rejects.toThrow('ID must be a string or MongoDB ObjectId');
    });

    it('should throw error for invalid data in create', async () => {
      await expect(service.create(null)).rejects.toThrow('Data must be a non-null object');
      await expect(service.create([])).rejects.toThrow('Data must be a non-null object');
    });

    it('should throw error for invalid ID in update', async () => {
      await expect(service.update(null, {})).rejects.toThrow('ID is required');
    });

    it('should throw error for invalid updates in update', async () => {
      const user = await User.create({
        name: 'Test',
        email: 'test@test.com',
        password: 'Password123'
      });

      await expect(service.update(user._id, null)).rejects.toThrow('Data must be a non-null object');
    });

    it('should throw error for invalid ID in delete', async () => {
      await expect(service.delete(null)).rejects.toThrow('ID is required');
    });
  });

  describe('Constructor Validation', () => {
    it('should throw error if no model provided', () => {
      expect(() => new BaseService()).toThrow('A valid Mongoose model is required');
    });

    it('should throw error if invalid model provided', () => {
      expect(() => new BaseService({})).toThrow('A valid Mongoose model is required');
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve error context in create when validation fails', async () => {
      const invalidData = {
        name: 'Test',
        email: 'invalid-email',
        password: 'short'
      };

      try {
        await service.create(invalidData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.context).toBe('BaseService.create');
      }
    });

    it('should preserve error context in update when validation fails', async () => {
      const user = await User.create({
        name: 'Test',
        email: 'test@test.com',
        password: 'Password123'
      });

      const invalidUpdate = {
        email: 'invalid-email'
      };

      try {
        await service.update(user._id, invalidUpdate);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.context).toBe('BaseService.update');
      }
    });
  });
});
