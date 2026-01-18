const Task = require('../models/Task.model');
const Commit = require('../models/Commit.model');
const goalController = require('./goal.controller');

// @desc    Handle GitHub webhook for commits
// @route   POST /api/webhooks/github
// @access  Public (GitHub webhook)
exports.handleGitHubWebhook = async (req, res) => {
  try {
    console.log('📥 GitHub Webhook received');
    const { commits, repository } = req.body;

    if (!commits || !Array.isArray(commits)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook payload - no commits array'
      });
    }

    console.log(`📦 Processing ${commits.length} commit(s)...`);
    const updatedTasks = [];

    // Parser chaque commit
    for (const commit of commits) {
      // Regex pour extraire taskId : (VAL-01), (FIN-12), etc.
      const taskIdRegex = /\(([A-Z]+-\d+)\)/;
      const match = commit.message.match(taskIdRegex);

      if (!match) {
        console.log(`⚠️  No taskId found in: "${commit.message}"`);
        continue;
      }

      const taskId = match[1]; // Ex: "VAL-01"
      console.log(`🔍 Found taskId: ${taskId}`);

      // Trouver la task correspondante
      const task = await Task.findOne({ taskId })
        .populate('project', 'name color icon');

      if (!task) {
        console.log(`❌ Task not found: ${taskId}`);
        continue;
      }

      // Vérifier si commit déjà enregistré (éviter duplicates)
      const existingCommit = await Commit.findOne({
        hash: commit.id,
        task: task._id
      });

      if (existingCommit) {
        console.log(`⚠️  Commit ${commit.id} already exists for ${taskId}`);
        continue;
      }

      // Créer un nouveau document Commit
      await Commit.create({
        hash: commit.id,
        message: commit.message,
        author: commit.author.name,
        timestamp: new Date(commit.timestamp),
        url: commit.url,
        repo: repository?.name || 'unknown',
        task: task._id,
        user: task.user,
        project: task.project,
        source: 'github'
      });

      console.log(`✅ Commit added to task ${taskId}`);
      updatedTasks.push(task);

      // 🆕 ÉMETTRE VIA SOCKET.IO
      const io = req.app.get('io');
      if (io) {
        // Émettre à la room de l'utilisateur
        io.to(`user:${task.user}`).emit('task-updated', {
          task: task.toObject(),
          type: 'commit-added',
          commit: {
            message: commit.message,
            hash: commit.id,
            author: commit.author.name
          }
        });
        console.log(`📡 Socket event emitted to user:${task.user}`);
      }

      // 🎯 NOUVEAU : Synchroniser l'objectif commits automatiquement
      try {
        console.log(`🎯 Syncing commits goal for user:${task.user}`);
        const io = req.app.get('io');
        const syncResult = await goalController.syncCommitsGoalInternal(task.user, io);
        
        if (syncResult) {
          console.log(`✅ Commits goal synced: ${syncResult.totalCommits} commits`);
        } else {
          console.log(`⚠️  No commits goal found for user:${task.user}`);
        }
      } catch (syncError) {
        console.error('❌ Error syncing commits goal:', syncError.message);
        // Ne pas bloquer le webhook si la sync échoue
      }
    }

    // Réponse à GitHub
    res.status(200).json({
      success: true,
      message: `Processed ${commits.length} commits, updated ${updatedTasks.length} tasks`,
      updatedTasks: updatedTasks.map(t => ({
        taskId: t.taskId,
        title: t.title
      }))
    });

  } catch (error) {
    console.error('❌ Webhook Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
};

module.exports = exports;