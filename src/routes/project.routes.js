const express = require('express');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  updateProjectProgress
} = require('../controllers/project.controller');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

// Routes principales
router.route('/')
  .get(getProjects)
  .post(createProject);

router.route('/:id')
  .get(getProject)
  .put(updateProject)
  .delete(deleteProject);

// Route pour mettre à jour la progression
router.put('/:id/progress', updateProjectProgress);

module.exports = router;