import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '../logger/logger';
import { NotificationDTO } from '@subcare/types';
import { TokenService } from '../../services/TokenService';

export class SocketService {
  private io: Server;
  private tokenService: TokenService;

  constructor(httpServer: HttpServer, tokenService: TokenService) {
    this.tokenService = tokenService;
    this.io = new Server(httpServer, {
      path: '/socket.io',
      cors: {
        origin: "http://localhost:3000", // 允许所有来源，解决开发环境跨域问题
        methods: ["GET", "POST"],
        allowedHeaders: ["Authorization"],
        credentials: true
      }
    });

    this.initialize();
  }

  private initialize() {
    // Middleware for Authentication
    this.io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            logger.warn({ 
                domain: 'SOCKET', 
                action: 'auth_reject', 
                metadata: { 
                    reason: 'No token provided', 
                    socketId: socket.id,
                    ip: socket.handshake.address
                } 
            });
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const payload = this.tokenService.verifyAccessToken(token) as any;
            
            // Attach user to socket
            socket.data.user = payload;
            
            // Auto-join user room
            if (payload.userId) {
                socket.join(`user:${payload.userId}`);
                logger.info({ 
                    domain: 'SOCKET', 
                    action: 'auth_success', 
                    userId: payload.userId,
                    metadata: { 
                        socketId: socket.id,
                        rooms: [`user:${payload.userId}`]
                    }
                });
            }

            next();
        } catch (error) {
            logger.warn({ 
                domain: 'SOCKET', 
                action: 'auth_fail', 
                metadata: { 
                    reason: 'Invalid token', 
                    socketId: socket.id,
                    error: String(error)
                } 
            });
            next(new Error('Authentication error: Invalid token'));
        }
    });

    this.io.on('connection', (socket) => {
      // Basic logging
      logger.info({
        domain: 'SOCKET',
        action: 'connect',
        userId: socket.data.user?.userId,
        metadata: {
            message: 'Socket connected and authenticated',
            socketId: socket.id,
            transport: socket.conn.transport.name,
            query: socket.handshake.query
        }
      });

      // No need for manual authenticate event anymore, but we can keep it for legacy or debug
      // Or we can remove it to enforce middleware auth. 
      // User asked for middleware auth, so let's rely on that.

      socket.on('disconnect', (reason) => {
        logger.info({ 
            domain: 'SOCKET',
            action: 'disconnect',
            userId: socket.data.user?.userId,
            metadata: {
                message: 'Socket disconnected', 
                reason, 
                socketId: socket.id 
            }
        });
      });
    });
  }

  /**
   * Send a notification to a specific user
   */
  public sendNotification(userId: string, notification: NotificationDTO | any) {
    const roomName = `user:${userId}`;
    this.io.to(roomName).emit('notification:new', notification);
    
    // Check if any sockets are in the room (for debugging)
    const socketsInRoom = this.io.sockets.adapter.rooms.get(roomName);
    const socketCount = socketsInRoom ? socketsInRoom.size : 0;

    logger.debug({ 
        domain: 'SOCKET', 
        action: 'emit', 
        userId, 
        metadata: {
            event: 'notification:new',
            room: roomName,
            recipientCount: socketCount
        }
    });
  }

  /**
   * Send notification read event
   */
  public sendNotificationRead(userId: string, notificationId?: string) {
    const roomName = `user:${userId}`;
    this.io.to(roomName).emit('notification:read', { id: notificationId }); // id is undefined for markAllAsRead

    logger.debug({ 
        domain: 'SOCKET', 
        action: 'emit', 
        userId, 
        metadata: {
            event: 'notification:read',
            room: roomName,
            notificationId
        }
    });
  }

  /**
   * Broadcast event (e.g. system maintenance)
   */
  public broadcast(event: string, data: any) {
      this.io.emit(event, data);
  }
}
