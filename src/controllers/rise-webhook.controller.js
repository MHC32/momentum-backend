const Goal = require('../models/Goal.model');

/**
 * RISE WEBHOOK CONTROLLER
 * 
 * Ce controller gère les webhooks envoyés par l'application Rise (finance).
 * Rise notifie Momentum quand :
 * - Un dépôt est fait (épargne)
 * - Un retrait est fait
 * - Une dépense est catégorisée
 * 
 * Momentum met alors à jour automatiquement les objectifs concernés.
 */

// ==================== WEBHOOK: TRANSACTION (Dépôt/Retrait) ====================

/**
 * Recevoir une transaction (dépôt ou retrait) de Rise
 * POST /api/webhooks/rise/transaction
 * 
 * Body:
 * {
 *   type: "deposit" | "withdrawal",
 *   amount: 50000,
 *   currency: "HTG" | "USD",
 *   category: "savings" | "investment",
 *   account_id: "rise_acc_123",
 *   linked_goal_id: "goal_id_123" (optionnel),
 *   transaction_id: "rise_txn_456",
 *   timestamp: "2026-01-11T12:00:00Z",
 *   metadata: {...}
 * }
 */
exports.handleTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      currency,
      category,
      account_id,
      linked_goal_id,
      transaction_id,
      timestamp,
      user_id // Rise doit envoyer l'ID utilisateur Momentum
    } = req.body;

    // Validation
    if (!type || !amount || !currency || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'Données manquantes: type, amount, currency, user_id requis'
      });
    }

    if (!['deposit', 'withdrawal'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type doit être "deposit" ou "withdrawal"'
      });
    }

    let goal;

    // 1. Si goal_id fourni, l'utiliser directement
    if (linked_goal_id) {
      goal = await Goal.findOne({
        _id: linked_goal_id,
        user: user_id,
        'rise_integration.enabled': true
      });

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Objectif non trouvé ou Rise integration non activée'
        });
      }
    } 
    // 2. Sinon, chercher automatiquement par catégorie + account_id
    else {
      goal = await Goal.findOne({
        user: user_id,
        'rise_integration.enabled': true,
        'rise_integration.category': category,
        'rise_integration.account_id': account_id,
        completed: false
      }).sort({ priority: -1, createdAt: -1 });

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: `Aucun objectif trouvé pour la catégorie "${category}"`,
          suggestion: 'Créer un objectif avec Rise integration activée'
        });
      }
    }

    // 3. Calculer le montant à ajouter/retirer
    const amountChanged = type === 'deposit' ? amount : -amount;

    // 4. Mettre à jour l'objectif
    const oldValue = goal.current_value;
    goal.current_value += amountChanged;

    // Empêcher les valeurs négatives
    if (goal.current_value < 0) {
      goal.current_value = 0;
    }

    // Empêcher de dépasser la cible
    if (goal.current_value > goal.target_value) {
      goal.current_value = goal.target_value;
    }

    // Mettre à jour last_sync
    goal.rise_integration.last_sync = new Date(timestamp || Date.now());

    await goal.updateProgressAndStatus();

    // 5. Propager vers les parents
    if (goal.parent_annual_id) {
      await Goal.propagateProgressUp(goal._id, amountChanged);
    }

    // 6. Log pour debug
    console.log(`[Rise Webhook] Transaction ${type}:`, {
      goal_id: goal._id,
      goal_title: goal.title,
      old_value: oldValue,
      new_value: goal.current_value,
      amount_changed: amountChanged,
      currency,
      transaction_id
    });

    res.status(200).json({
      success: true,
      message: 'Transaction traitée avec succès',
      data: {
        goal: {
          id: goal._id,
          title: goal.title,
          old_value: oldValue,
          new_value: goal.current_value,
          progress_percent: goal.progress_percent,
          status: goal.status
        },
        transaction: {
          type,
          amount,
          currency,
          transaction_id
        }
      }
    });

  } catch (error) {
    console.error('[Rise Webhook] Erreur handleTransaction:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement de la transaction',
      error: error.message
    });
  }
};

// ==================== WEBHOOK: DÉPENSE CATÉGORISÉE ====================

/**
 * Recevoir une dépense catégorisée de Rise
 * POST /api/webhooks/rise/expense
 * 
 * Body:
 * {
 *   amount: 25,
 *   currency: "USD",
 *   category: "clothing" | "electronics" | "entertainment",
 *   description: "Achat t-shirt chez Zara",
 *   merchant: "Zara",
 *   linked_goal_id: "goal_id_123" (optionnel),
 *   auto_link: true,
 *   transaction_id: "rise_txn_789",
 *   timestamp: "2026-01-11T15:30:00Z",
 *   user_id: "momentum_user_id"
 * }
 */
exports.handleExpense = async (req, res) => {
  try {
    const {
      amount,
      currency,
      category,
      description,
      merchant,
      linked_goal_id,
      auto_link,
      transaction_id,
      timestamp,
      user_id
    } = req.body;

    // Validation
    if (!amount || !currency || !category || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'Données manquantes: amount, currency, category, user_id requis'
      });
    }

    let goal;

    // 1. Si goal_id fourni, l'utiliser
    if (linked_goal_id) {
      goal = await Goal.findOne({
        _id: linked_goal_id,
        user: user_id,
        'rise_integration.enabled': true
      });

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Objectif non trouvé'
        });
      }
    }
    // 2. Si auto_link = true, chercher automatiquement
    else if (auto_link) {
      goal = await Goal.findOne({
        user: user_id,
        is_personal: true,
        'rise_integration.enabled': true,
        'rise_integration.category': category,
        'rise_integration.auto_link': true,
        completed: false
      }).sort({ priority: -1, createdAt: -1 });

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: `Aucun objectif trouvé pour la catégorie "${category}"`,
          suggestion: 'Créer un objectif personnel avec Rise integration'
        });
      }
    }
    // 3. Sinon, retourner une erreur
    else {
      return res.status(400).json({
        success: false,
        message: 'linked_goal_id ou auto_link requis'
      });
    }

    // 4. Déterminer si c'est un budget ou un objectif d'achat
    let amountChanged;

    if (goal.title.toLowerCase().includes('budget')) {
      // Budget mensuel : on incrémente les dépenses
      amountChanged = amount;
    } else {
      // Objectif d'achat (ex: Acheter Xbox) : on décrémente l'épargne ou on track l'achat
      if (goal.type === 'steps') {
        // Pour un objectif à étapes, on pourrait auto-compléter une étape
        // Mais pour l'instant on log juste
        console.log(`[Rise Webhook] Dépense liée à objectif steps: ${goal.title}`);
        
        return res.status(200).json({
          success: true,
          message: 'Dépense enregistrée (objectif steps - mise à jour manuelle requise)',
          data: {
            goal: {
              id: goal._id,
              title: goal.title,
              type: goal.type
            },
            expense: {
              amount,
              currency,
              category,
              merchant
            },
            suggestion: 'Compléter manuellement l\'étape correspondante'
          }
        });
      }

      // Objectif numérique
      amountChanged = amount;
    }

    // 5. Mettre à jour
    const oldValue = goal.current_value;
    goal.current_value += amountChanged;

    if (goal.current_value < 0) {
      goal.current_value = 0;
    }

    if (goal.current_value > goal.target_value) {
      goal.current_value = goal.target_value;
    }

    goal.rise_integration.last_sync = new Date(timestamp || Date.now());

    await goal.updateProgressAndStatus();

    // 6. Log
    console.log(`[Rise Webhook] Expense:`, {
      goal_id: goal._id,
      goal_title: goal.title,
      old_value: oldValue,
      new_value: goal.current_value,
      amount,
      category,
      merchant,
      transaction_id
    });

    res.status(200).json({
      success: true,
      message: 'Dépense traitée avec succès',
      data: {
        goal: {
          id: goal._id,
          title: goal.title,
          old_value: oldValue,
          new_value: goal.current_value,
          progress_percent: goal.progress_percent,
          status: goal.status
        },
        expense: {
          amount,
          currency,
          category,
          merchant,
          description,
          transaction_id
        }
      }
    });

  } catch (error) {
    console.error('[Rise Webhook] Erreur handleExpense:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement de la dépense',
      error: error.message
    });
  }
};

// ==================== WEBHOOK: VÉRIFICATION ====================

/**
 * Endpoint de vérification pour Rise
 * GET /api/webhooks/rise/verify
 * 
 * Rise peut appeler cet endpoint pour vérifier que le webhook est actif
 */
exports.verifyWebhook = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Momentum Rise webhook is active',
    timestamp: new Date().toISOString(),
    endpoints: {
      transaction: '/api/webhooks/rise/transaction',
      expense: '/api/webhooks/rise/expense'
    }
  });
};

// ==================== LISTE DES OBJECTIFS AVEC RISE INTEGRATION ====================

/**
 * Obtenir tous les objectifs avec Rise integration activée
 * GET /api/goals/rise-integrated
 * 
 * Utile pour Rise pour afficher la liste des objectifs linkables
 */
exports.getRiseIntegratedGoals = async (req, res) => {
  try {
    const goals = await Goal.find({
      user: req.user._id,
      'rise_integration.enabled': true,
      completed: false
    })
      .select('title category rise_integration target_value current_value unit progress_percent')
      .sort({ category: 1, priority: -1 });

    res.status(200).json({
      success: true,
      count: goals.length,
      data: { goals }
    });

  } catch (error) {
    console.error('Erreur getRiseIntegratedGoals:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des objectifs Rise',
      error: error.message
    });
  }
};

module.exports = exports;