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
const {
  createTaskValidator,
  updateTaskValidator,
  taskIdValidator,
  updateTaskStatusValidator
} = require('../validators/task.validator');

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

// Routes principales
router.route('/')
  .get(getTasks)
  .post(createTaskValidator, createTask);

// Kanban view par projet
router.get('/project/:projectId/kanban', getProjectKanban);

router.route('/:id')
  .get(taskIdValidator, getTask)
  .put(updateTaskValidator, updateTask)
  .delete(taskIdValidator, deleteTask);

// Update status (pour drag & drop Kanban)
router.patch('/:id/status', updateTaskStatusValidator, updateTaskStatus);


module.exports = router;