const Task = require('../models/Task.model');

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
      const commitExists = task.commits.some(c => c.hash === commit.id);
      if (commitExists) {
        console.log(`⚠️  Commit ${commit.id} already exists for ${taskId}`);
        continue;
      }
      
      // Ajouter le commit
      task.commits.push({
        message: commit.message,
        hash: commit.id,
        timestamp: new Date(commit.timestamp),
        author: commit.author.name,
        url: commit.url,
        repo: repository?.name || 'unknown'
      });
      
      // Aussi ajouter à gitCommits (legacy)
      task.gitCommits.push({
        hash: commit.id,
        message: commit.message,
        author: commit.author.name,
        date: new Date(commit.timestamp),
        repo: repository?.name || 'unknown'
      });
      
      await task.save();
      
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
    }
    
    // Réponse à GitHub
    res.status(200).json({
      success: true,
      message: `Processed ${commits.length} commits, updated ${updatedTasks.length} tasks`,
      updatedTasks: updatedTasks.map(t => ({
        taskId: t.taskId,
        title: t.title,
        commitsCount: t.commits.length
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