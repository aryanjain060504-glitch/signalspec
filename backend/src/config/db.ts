import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let memoryServerInstance: any = null;

export async function connectDB(customUri?: string): Promise<typeof mongoose> {
  const uri = customUri || env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000, // 3s timeout for quick fallback
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    if (env.NODE_ENV === 'development' && !customUri) {
      logger.warn(`Could not connect to external MongoDB at "${uri}". Starting embedded development MongoDB...`);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServerInstance = await MongoMemoryServer.create();
        const memUri = memoryServerInstance.getUri();
        const conn = await mongoose.connect(memUri);
        logger.info(`💡 Embedded Development MongoDB Connected at: ${memUri}`);
        return conn;
      } catch (memError) {
        logger.error('Failed to start embedded MongoDB:', memError);
      }
    }

    logger.error('MongoDB connection error:', error);
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
    }
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnect error:', error);
  }
}
