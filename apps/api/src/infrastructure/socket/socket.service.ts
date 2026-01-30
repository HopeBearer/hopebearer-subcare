import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../logger/logger';
import { NotificationDTO } from '@subcare/types';

export class SocketService {
  private io: Server;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      path: '/socket.io/', // Keep consistent with Next.js rewrite
      cors: {
        origin: "*", // Or configured allowed origins
        methods: ["GET", "POST"]
      }
    });

    this.initialize();
  }

  private initialize() {
    this.io.on('connection', (socket) => {
      // Basic logging
      logger.info({
        message: 'Socket connected',
        socketId: socket.id,
        transport: socket.conn.transport.name
      });

      // Authentication Placeholder
      // In real app, verify token from handshake.auth.token
      // const token = socket.handshake.auth.token;
      
      socket.on('authenticate', (data: { userId: string }) => {
        if (data.userId) {
            socket.join(`user:${data.userId}`);
            // socket.data.userId = data.userId;
            logger.info({ message: 'User joined room', userId: data.userId });
        }
      });

      // Also support joining via query param if needed, or initial handshake
      const queryUserId = socket.handshake.query.userId as string;
      if (queryUserId) {
          socket.join(`user:${queryUserId}`);
          logger.info({ message: 'User joined room via query', userId: queryUserId });
      }

      socket.on('disconnect', (reason) => {
        logger.info({ message: 'Socket disconnected', reason, socketId: socket.id });
      });
    });
  }

  /**
   * Send a notification to a specific user
   */
  public sendNotification(userId: string, notification: NotificationDTO | any) {
    this.io.to(`user:${userId}`).emit('notification:new', notification);
    logger.debug({ 
        domain: 'SOCKET', 
        action: 'emit', 
        userId, 
        event: 'notification:new' 
    });
  }

  /**
   * Broadcast event (e.g. system maintenance)
   */
  public broadcast(event: string, data: any) {
      this.io.emit(event, data);
  }
}
