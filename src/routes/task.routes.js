const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getProjectKanban,
  addGitCommit
} = require('../controllers/task.controller');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

// Routes principales
router.route('/')
  .get(getTasks)
  .post(createTask);

// Kanban view par projet
router.get('/project/:projectId/kanban', getProjectKanban);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

// Update status (pour drag & drop Kanban)
router.patch('/:id/status', updateTaskStatus);


module.exports = router;