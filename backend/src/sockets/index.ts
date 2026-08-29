import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(','),
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // JWT Connection Auth Guard
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '') ||
        (socket.handshake.query?.token as string);

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch (err: any) {
      logger.warn(`Socket authentication failed: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info(`Socket client connected: ${socket.id} (User: ${userId})`);

    // Auto-join user room
    socket.join(`user:${userId}`);

    // Join project specific room
    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      logger.debug(`User ${userId} joined room project:${projectId}`);
    });

    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Emits real-time progress update for an analysis job
 */
export function emitJobProgress(
  userId: string,
  projectId: string,
  data: {
    jobId: string;
    status: string;
    stage: string;
    progress: number;
    message: string;
    error?: string;
  }
): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('analysis:progress', data);
  io.to(`project:${projectId}`).emit('analysis:progress', data);
}
