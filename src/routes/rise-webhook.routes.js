const express = require('express');
const router = express.Router();
const {
  handleTransaction,
  handleExpense,
  verifyWebhook,
  getRiseIntegratedGoals
} = require('../controllers/rise-webhook.controller');
const { protect } = require('../middleware/auth');

/**
 * RISE WEBHOOK ROUTES
 * 
 * Ces routes sont appelées par l'application Rise (finance) pour notifier
 * Momentum des transactions et dépenses.
 * 
 * IMPORTANT: Ces routes doivent être sécurisées dans un environnement de production
 * avec un système de signature/vérification (ex: HMAC signature)
 */

// ==================== WEBHOOKS (Publics - appelés par Rise) ====================

/**
 * Vérification du webhook
 * GET /api/webhooks/rise/verify
 */
router.get('/verify', verifyWebhook);

/**
 * Recevoir une transaction (dépôt/retrait)
 * POST /api/webhooks/rise/transaction
 * 
 * SÉCURITÉ: À sécuriser avec signature HMAC en production
 */
router.post('/transaction', handleTransaction);

/**
 * Recevoir une dépense catégorisée
 * POST /api/webhooks/rise/expense
 * 
 * SÉCURITÉ: À sécuriser avec signature HMAC en production
 */
router.post('/expense', handleExpense);

// ==================== ROUTES PROTÉGÉES ====================

/**
 * Obtenir les objectifs avec Rise integration
 * GET /api/webhooks/rise/goals
 * 
 * Utilisé par Rise pour afficher la liste des objectifs linkables
 */
router.get('/goals', protect, getRiseIntegratedGoals);

module.exports = router;