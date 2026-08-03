import http from 'http';
import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocket } from './utils/socket.js';
import { logger } from './utils/logger.js';

const server = http.createServer(app);

// Initialize Socket.IO
export const io = initSocket(server);

const startServer = async () => {
  await connectDB();
  
  server.listen(config.port, () => {
    logger.info(`🛡️ ScamShield AI Server running in [${config.nodeEnv}] mode on port http://localhost:${config.port}`);
  });
};

startServer().catch((err) => {
  logger.error('Failed to start server', err);
});
