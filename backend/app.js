const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');

// Route imports
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const eventRoutes = require('./routes/eventRoutes');
const participantRoutes = require('./routes/participantRoutes');
const codeBlockRoutes = require('./routes/codeBlockRoutes');
const roundRoutes = require('./routes/roundRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const swapRoutes = require('./routes/swapRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const executionRoutes = require('./routes/executionRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security & Utility Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'CodeSwap Arena API',
    timestamp: new Date().toISOString()
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', roundRoutes);
app.use('/api/rounds', assignmentRoutes);
app.use('/api/rounds', swapRoutes);
app.use('/api', participantRoutes);
app.use('/api', evaluationRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', submissionRoutes);
app.use('/api/code-blocks', codeBlockRoutes);
app.use('/api/code', executionRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global App Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
});

module.exports = app;
