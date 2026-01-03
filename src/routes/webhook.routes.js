const express = require('express');
const { handleGitHubWebhook } = require('../controllers/webhook.controller');

const router = express.Router();

// 🔓 PUBLIC route - GitHub webhook (pas de auth nécessaire)
router.post('/github', handleGitHubWebhook);

module.exports = router;