const request = require('supertest');
const mongoose = require('mongoose');
const { createTestUser } = require('../helpers/testDb');
const { generateAuthToken } = require('../helpers/fixtures');
const Habit = require('../../src/models/Habit.model');

// We'll need to create a minimal express app for testing
const express = require('express');
const habitRoutes = require('../../src/routes/habit.routes');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock auth middleware for testing
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        req.user = { id: decoded.id };
      } catch (err) {
        return res.status(401).json({ success: false, error: 'Not authorized' });
      }
    }
    next();
  });

  app.use('/api/habits', habitRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(500).json({ success: false, error: err.message });
  });

  return app;
};

describe('Habits API', () => {
  let app;
  let token;
  let user;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    user = await createTestUser();
    token = generateAuthToken(user._id);
  });

  describe('POST /api/habits', () => {
    it('should create a new habit', async () => {
      const habitData = {
        title: 'Cours d\'anglais',
        icon: '📖',
        goal: '2x par semaine',
        goalType: 'weekly'
      };

      const res = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${token}`)
        .send(habitData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(habitData.title);
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${token}`)
        .send({ icon: '📖', goal: 'daily', goalType: 'daily' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/habits')
        .send({ title: 'Test', goal: 'daily', goalType: 'daily' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/habits', () => {
    it('should get all user habits', async () => {
      await Habit.create([
        { title: 'Habit 1', user: user._id, goal: 'daily', goalType: 'daily' },
        { title: 'Habit 2', user: user._id, goal: 'weekly', goalType: 'weekly' }
      ]);

      const res = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should only return habits for authenticated user', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });

      await Habit.create([
        { title: 'My Habit', user: user._id, goal: 'daily', goalType: 'daily' },
        { title: 'Other Habit', user: otherUser._id, goal: 'daily', goalType: 'daily' }
      ]);

      const res = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('My Habit');
    });
  });

  describe('GET /api/habits/:id', () => {
    it('should get a single habit', async () => {
      const habit = await Habit.create({
        title: 'Test Habit',
        user: user._id,
        goal: 'daily',
        goalType: 'daily'
      });

      const res = await request(app)
        .get(`/api/habits/${habit._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Test Habit');
    });

    it('should return 404 for non-existent habit', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/habits/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 for habit owned by another user', async () => {
      const otherUser = await createTestUser({ email: 'other2@test.com' });
      const habit = await Habit.create({
        title: 'Other Habit',
        user: otherUser._id,
        goal: 'daily',
        goalType: 'daily'
      });

      const res = await request(app)
        .get(`/api/habits/${habit._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/habits/:id', () => {
    it('should update a habit', async () => {
      const habit = await Habit.create({
        title: 'Original Title',
        user: user._id,
        goal: 'daily',
        goalType: 'daily'
      });

      const res = await request(app)
        .put(`/api/habits/${habit._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/habits/:id', () => {
    it('should delete a habit', async () => {
      const habit = await Habit.create({
        title: 'To Delete',
        user: user._id,
        goal: 'daily',
        goalType: 'daily'
      });

      const res = await request(app)
        .delete(`/api/habits/${habit._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const found = await Habit.findById(habit._id);
      expect(found).toBeNull();
    });
  });

  describe('POST /api/habits/:id/complete', () => {
    it('should mark habit as completed for today', async () => {
      const habit = await Habit.create({
        title: 'Test Habit',
        user: user._id,
        goal: 'daily',
        goalType: 'daily'
      });

      const res = await request(app)
        .post(`/api/habits/${habit._id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Did it!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.calendar.length).toBe(1);
      expect(res.body.data.calendar[0].status).toBe('done');
    });

    it('should update existing entry if already has entry for today', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const habit = await Habit.create({
        title: 'Test Habit',
        user: user._id,
        goal: 'daily',
        goalType: 'daily',
        calendar: [{ date: today, status: 'skip' }]
      });

      const res = await request(app)
        .post(`/api/habits/${habit._id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Changed my mind!' });

      expect(res.status).toBe(200);
      expect(res.body.data.calendar.length).toBe(1);
      expect(res.body.data.calendar[0].status).toBe('done');
    });
  });

  describe('POST /api/habits/:id/skip', () => {
    it('should mark habit as skipped for today', async () => {
      const habit = await Habit.create({
        title: 'Test Habit',
        user: user._id,
        goal: 'daily',
        goalType: 'daily'
      });

      const res = await request(app)
        .post(`/api/habits/${habit._id}/skip`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.calendar.length).toBe(1);
      expect(res.body.data.calendar[0].status).toBe('skip');
    });
  });

  describe('GET /api/habits/:id/stats', () => {
    it('should return habit statistics', async () => {
      const habit = await Habit.create({
        title: 'Test Habit',
        user: user._id,
        goal: 'daily',
        goalType: 'daily',
        calendar: [
          { date: new Date(), status: 'done' },
          { date: new Date(Date.now() - 86400000), status: 'done' },
          { date: new Date(Date.now() - 172800000), status: 'skip' }
        ],
        streak: { current: 2, record: 2 }
      });

      const res = await request(app)
        .get(`/api/habits/${habit._id}/stats`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCompleted).toBe(2);
      expect(res.body.data.currentStreak).toBe(2);
    });
  });
});
