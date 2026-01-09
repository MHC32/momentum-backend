const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goal.controller');
const { protect } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(protect);

// ==================== CRUD DE BASE ====================

// Créer un objectif
router.post('/', goalController.createGoal);

// Obtenir tous les objectifs avec filtres
router.get('/', goalController.getGoals);

// Obtenir un objectif par ID
router.get('/:id', goalController.getGoalById);

// Mettre à jour un objectif
router.put('/:id', goalController.updateGoal);

// Supprimer un objectif
router.delete('/:id', goalController.deleteGoal);

// ==================== PROGRESSION ====================

// Mettre à jour la progression d'un objectif
router.put('/:id/progress', goalController.updateProgress);

// Compléter/décompléter une étape
router.put('/:id/steps/:stepId/complete', goalController.completeStep);

// Recalculer depuis les enfants
router.post('/:id/recalculate', goalController.recalculateFromChildren);

// ==================== INTÉGRATIONS ====================

// Synchroniser l'objectif commits
router.post('/sync-commits', goalController.syncCommitsGoal);

// Synchroniser l'objectif livres
router.post('/sync-book/:projectId', goalController.syncBookGoal);

// ==================== STATS & ANALYTICS ====================

// Obtenir les statistiques des objectifs
router.get('/stats/summary', goalController.getGoalsStats);

module.exports = router;