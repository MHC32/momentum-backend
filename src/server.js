// backend/src/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// ✅ IMPORTANT: Trust proxy (car derrière Nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ Rate limit SAUF webhooks (GitHub webhook = public)
app.use('/api/', (req, res, next) => {
  // Skip rate limit pour webhooks
  if (req.path.startsWith('/webhooks/')) {
    return next();
  }
  return limiter(req, res, next);
});

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Momentum API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/webhooks', require('./routes/webhook.routes')); // 🆕 WEBHOOK
app.use('/api/goals', require('./routes/goal.routes'));
app.use('/api/habits', require('./routes/habit.routes'));
app.use('/api/webhooks/rise', require('./routes/rise-webhook.routes')); // 🆕 RISE Webhook

// Error handler (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Momentum API running in ${process.env.NODE_ENV} mode on port ${PORT}\n`);
});

// 🆕 Socket.IO Setup
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  // Join user room (pour notifications user-specific)
  socket.on('join-user-room', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes/controllers
app.set('io', io);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;