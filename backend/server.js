require('dotenv').config();
const http = require('http');
const app = require('./app');
const config = require('./config/config');
const { initDb } = require('./database/db');
const { initSocket } = require('./socket/socketManager');

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

async function startServer() {
  try {
    // Ensure DB connection is initialized
    await initDb();

    server.listen(config.port, () => {
      console.log('==================================================');
      console.log(`🚀 CodeSwap Arena API Server Running on port ${config.port}`);
      console.log(`   Health: http://localhost:${config.port}/api/health`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log('==================================================');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
