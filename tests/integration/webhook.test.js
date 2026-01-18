const Task = require('../../src/models/Task.model');
const Commit = require('../../src/models/Commit.model');
const { createTestUser, createTestProject, createTestTask } = require('../helpers/testDb');
const webhookController = require('../../src/controllers/webhook.controller');

describe('GitHub Webhook Controller - Commit Tracking', () => {
  let user;
  let project;
  let task;
  let req;
  let res;

  beforeEach(async () => {
    // Create test data
    user = await createTestUser();
    project = await createTestProject(user._id, { name: 'TestProject' });
    task = await createTestTask(user._id, project._id, {
      taskId: 'TES-01',
      title: 'Test Task for Webhook'
    });

    // Mock Express request and response
    req = {
      body: {},
      app: {
        get: jest.fn(() => null) // Mock io
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('handleGitHubWebhook', () => {
    it('should create Commit documents instead of embedding in task', async () => {
      req.body = {
        commits: [
          {
            id: 'abc123def456',
            message: 'feat (TES-01): add new feature',
            timestamp: '2024-01-15T10:00:00Z',
            author: {
              name: 'Test Developer',
              email: 'dev@test.com'
            },
            url: 'https://github.com/test/repo/commit/abc123def456'
          }
        ],
        repository: {
          name: 'test-repo',
          full_name: 'test/test-repo'
        }
      };

      await webhookController.handleGitHubWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.updatedTasks).toHaveLength(1);

      // Verify Commit document was created
      const commits = await Commit.find({ task: task._id });
      expect(commits).toHaveLength(1);
      expect(commits[0].hash).toBe('abc123def456');
      expect(commits[0].message).toBe('feat (TES-01): add new feature');
      expect(commits[0].author).toBe('Test Developer');
      expect(commits[0].user.toString()).toBe(user._id.toString());
      expect(commits[0].project.toString()).toBe(project._id.toString());
      expect(commits[0].task.toString()).toBe(task._id.toString());

      // Verify task does NOT have embedded commits
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.commits).toBeUndefined();
    });

    it('should prevent duplicate commits using Commit model', async () => {
      req.body = {
        commits: [
          {
            id: 'duplicate123',
            message: 'fix (TES-01): bug fix',
            timestamp: '2024-01-15T10:00:00Z',
            author: {
              name: 'Test Developer',
              email: 'dev@test.com'
            },
            url: 'https://github.com/test/repo/commit/duplicate123'
          }
        ],
        repository: {
          name: 'test-repo'
        }
      };

      // Call webhook first time
      await webhookController.handleGitHubWebhook(req, res);

      // Verify one commit created
      let commits = await Commit.find({ task: task._id });
      expect(commits).toHaveLength(1);

      // Reset mocks
      res.status.mockClear();
      res.json.mockClear();

      // Call webhook second time with same commit
      await webhookController.handleGitHubWebhook(req, res);

      // Verify still only one commit (no duplicate)
      commits = await Commit.find({ task: task._id });
      expect(commits).toHaveLength(1);
    });

    it('should handle multiple commits in one webhook', async () => {
      req.body = {
        commits: [
          {
            id: 'commit1',
            message: 'feat (TES-01): first commit',
            timestamp: '2024-01-15T10:00:00Z',
            author: { name: 'Dev 1' },
            url: 'https://github.com/test/repo/commit/commit1'
          },
          {
            id: 'commit2',
            message: 'fix (TES-01): second commit',
            timestamp: '2024-01-15T11:00:00Z',
            author: { name: 'Dev 2' },
            url: 'https://github.com/test/repo/commit/commit2'
          }
        ],
        repository: {
          name: 'test-repo'
        }
      };

      await webhookController.handleGitHubWebhook(req, res);

      // Verify both commits created
      const commits = await Commit.find({ task: task._id }).sort({ timestamp: 1 });
      expect(commits).toHaveLength(2);
      expect(commits[0].hash).toBe('commit1');
      expect(commits[0].author).toBe('Dev 1');
      expect(commits[1].hash).toBe('commit2');
      expect(commits[1].author).toBe('Dev 2');
    });

    it('should skip commits without valid taskId', async () => {
      req.body = {
        commits: [
          {
            id: 'notask123',
            message: 'feat: no task id in message',
            timestamp: '2024-01-15T10:00:00Z',
            author: { name: 'Test Developer' }
          }
        ],
        repository: {
          name: 'test-repo'
        }
      };

      await webhookController.handleGitHubWebhook(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.updatedTasks).toHaveLength(0);

      // Verify no commits created
      const commits = await Commit.find({ user: user._id });
      expect(commits).toHaveLength(0);
    });

    it('should skip commits for non-existent tasks', async () => {
      req.body = {
        commits: [
          {
            id: 'notfound123',
            message: 'feat (NOTFOUND-99): task does not exist',
            timestamp: '2024-01-15T10:00:00Z',
            author: { name: 'Test Developer' }
          }
        ],
        repository: {
          name: 'test-repo'
        }
      };

      await webhookController.handleGitHubWebhook(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.updatedTasks).toHaveLength(0);

      // Verify no commits created
      const commits = await Commit.find({ user: user._id });
      expect(commits).toHaveLength(0);
    });

    it('should link commit to correct task and user', async () => {
      // Create second user and task
      const user2 = await createTestUser({ email: 'user2@test.com' });
      const project2 = await createTestProject(user2._id, { name: 'Project2' });
      const task2 = await createTestTask(user2._id, project2._id, {
        taskId: 'PRO-01',
        title: 'Another Task'
      });

      req.body = {
        commits: [
          {
            id: 'user1commit',
            message: 'feat (TES-01): for user 1',
            timestamp: '2024-01-15T10:00:00Z',
            author: { name: 'User 1 Dev' },
            url: 'https://github.com/test/repo/commit/user1commit'
          },
          {
            id: 'user2commit',
            message: 'fix (PRO-01): for user 2',
            timestamp: '2024-01-15T11:00:00Z',
            author: { name: 'User 2 Dev' },
            url: 'https://github.com/test/repo/commit/user2commit'
          }
        ],
        repository: {
          name: 'test-repo'
        }
      };

      await webhookController.handleGitHubWebhook(req, res);

      // Verify commits linked to correct users
      const user1Commits = await Commit.find({ user: user._id });
      expect(user1Commits).toHaveLength(1);
      expect(user1Commits[0].hash).toBe('user1commit');
      expect(user1Commits[0].task.toString()).toBe(task._id.toString());

      const user2Commits = await Commit.find({ user: user2._id });
      expect(user2Commits).toHaveLength(1);
      expect(user2Commits[0].hash).toBe('user2commit');
      expect(user2Commits[0].task.toString()).toBe(task2._id.toString());
    });

    it('should set source to github for webhook commits', async () => {
      req.body = {
        commits: [
          {
            id: 'source123',
            message: 'feat (TES-01): check source',
            timestamp: '2024-01-15T10:00:00Z',
            author: { name: 'Test Developer' }
          }
        ],
        repository: {
          name: 'test-repo'
        }
      };

      await webhookController.handleGitHubWebhook(req, res);

      const commit = await Commit.findOne({ hash: 'source123' });
      expect(commit.source).toBe('github');
    });
  });
});
