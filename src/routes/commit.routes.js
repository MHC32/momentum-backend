const express = require('express');
const router = express.Router();
const {
  getStats,
  getToday,
  getInsights,
  getCommits,
  createCommit,
  getCommitById,
  updateCommit,
  deleteCommit
} = require('../controllers/commit.controller');
const { protect } = require('../middleware/auth');
const {
  createCommitValidator,
  updateCommitValidator,
  commitIdValidator,
  statsQueryValidator,
  listQueryValidator
} = require('../validators/commit.validator');
const { handleValidationErrors } = require('../middleware/validation');

// Protection des routes
router.use(protect);

// ==================== STATS & INSIGHTS ====================

/**
 * Statistiques des commits par période
 * GET /api/commits/stats?year=2026
 */
router.get('/stats', statsQueryValidator, handleValidationErrors, getStats);

/**
 * Commits d'aujourd'hui (timeline)
 * GET /api/commits/today
 */
router.get('/today', getToday);

/**
 * Insights et tendances
 * GET /api/commits/insights?year=2026
 */
router.get('/insights', statsQueryValidator, handleValidationErrors, getInsights);

// ==================== CRUD ====================

/**
 * Liste des commits paginée
 * GET /api/commits?page=1&limit=10&project=xxx
 */
router.get('/', listQueryValidator, handleValidationErrors, getCommits);

/**
 * Créer un commit manuel
 * POST /api/commits
 * Body: { project_id?, count?, message?, timestamp? }
 */
router.post('/', createCommitValidator, handleValidationErrors, createCommit);

/**
 * Obtenir un commit par ID
 * GET /api/commits/:id
 */
router.get('/:id', commitIdValidator, handleValidationErrors, getCommitById);

/**
 * Mettre à jour un commit manuel
 * PUT /api/commits/:id
 */
router.put('/:id', updateCommitValidator, handleValidationErrors, updateCommit);

/**
 * Supprimer un commit manuel
 * DELETE /api/commits/:id
 */
router.delete('/:id', commitIdValidator, handleValidationErrors, deleteCommit);

module.exports = router;
