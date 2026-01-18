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
const {
  createProjectValidator,
  updateProjectValidator,
  projectIdValidator
} = require('../validators/project.validator');

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

// Routes principales
router.route('/')
  .get(getProjects)
  .post(createProjectValidator, createProject);

router.route('/:id')
  .get(projectIdValidator, getProject)
  .put(updateProjectValidator, updateProject)
  .delete(projectIdValidator, deleteProject);

// Route pour mettre à jour la progression
router.put('/:id/progress', projectIdValidator, updateProjectProgress);

module.exports = router;