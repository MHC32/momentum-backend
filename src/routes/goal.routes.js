const express = require('express');
const router = express.Router();
const {
  createGoal,
  getAnnualGoals,
  getQuarterlyGoals,
  getMonthlyGoals,
  getWeeklyGoals,
  getDailyGoals,
  getPersonalGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  updateProgress,
  completeStep,
  getGoalsStats
} = require('../controllers/goal.controller');
const { protect } = require('../middleware/auth');

// Protection des routes (toutes nécessitent authentification)
router.use(protect);

// ==================== CRÉATION ====================

/**
 * Créer un nouvel objectif
 * POST /api/goals
 * Body: { title, type, category, level, target_value, auto_decompose, ... }
 */
router.post('/', createGoal);

// ==================== VUES HIÉRARCHIQUES ====================

/**
 * Vue Annuel - Tous les objectifs annuels
 * GET /api/goals/annual?year=2026&category=financial
 */
router.get('/annual', getAnnualGoals);

/**
 * Vue Trimestriel - Objectifs d'un trimestre spécifique
 * GET /api/goals/quarterly/1?year=2026&category=financial
 * Params: quarter (1-4)
 */
router.get('/quarterly/:quarter', getQuarterlyGoals);

/**
 * Vue Mensuel - Objectifs d'un mois spécifique
 * GET /api/goals/monthly/1?year=2026&category=financial
 * Params: month (1-12)
 */
router.get('/monthly/:month', getMonthlyGoals);

/**
 * Vue Hebdomadaire - Objectifs d'une semaine spécifique
 * GET /api/goals/weekly/1?year=2026&category=financial
 * Params: week (1-53)
 */
router.get('/weekly/:week', getWeeklyGoals);

/**
 * Vue Quotidien + Focus du jour
 * GET /api/goals/daily?date=2026-01-11&category=financial
 */
router.get('/daily', getDailyGoals);

/**
 * Objectifs personnels
 * GET /api/goals/personal?status=ongoing&category=personal
 */
router.get('/personal', getPersonalGoals);

// ==================== STATS ====================

/**
 * Statistiques des objectifs
 * GET /api/goals/stats?year=2026&category=financial
 */
router.get('/stats', getGoalsStats);

// ==================== CRUD DE BASE ====================

/**
 * Obtenir un objectif par ID
 * GET /api/goals/:id
 */
router.get('/:id', getGoalById);

/**
 * Mettre à jour un objectif
 * PUT /api/goals/:id
 * Body: { title, description, deadline, ... }
 */
router.put('/:id', updateGoal);

/**
 * Supprimer un objectif (+ ses enfants si décomposé)
 * DELETE /api/goals/:id
 */
router.delete('/:id', deleteGoal);

// ==================== PROGRESSION ====================

/**
 * Mettre à jour la progression (avec propagation automatique)
 * PUT /api/goals/:id/progress
 * Body: { increment: 14 } ou { value: 100 }
 */
router.put('/:id/progress', updateProgress);

/**
 * Compléter/Décompléter une étape
 * PUT /api/goals/:id/steps/:stepId/complete
 */
router.put('/:id/steps/:stepId/complete', completeStep);

module.exports = router;