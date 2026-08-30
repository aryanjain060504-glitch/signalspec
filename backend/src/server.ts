import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { initSocketServer } from './sockets';
import { cronService } from './services/cron.service';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Create HTTP Server
    const server = http.createServer(app);

    // 3. Initialize Real-Time WebSockets
    initSocketServer(server);

    // 4. Start Background Schedulers
    cronService.startAll();

    // 5. Start Listening
    const PORT = env.PORT || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 SignalSpec Backend Server running in [${env.NODE_ENV}] mode on port ${PORT}`);
      logger.info(`📡 Healthcheck available at: http://localhost:${PORT}/health`);
      logger.info(`📡 API v1 root available at: http://localhost:${PORT}/api/v1`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      cronService.stopAll();
      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDB();
        process.exit(0);
      });

      // Force shutdown after 10s if dangling connections remain
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start SignalSpec server:', error);
    process.exit(1);
  }
}

bootstrap();
