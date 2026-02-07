import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../logger/logger';
import { NotificationDTO } from '@subcare/types';
import { TokenService } from '../../services/TokenService';

// Types for AI Recommendation events
export interface AIRecommendationRequest {
  model?: string;
  focus?: string;
  forceRefresh?: boolean;
}

export interface AIProgressEvent {
  stage: 'started' | 'tool_call' | 'tool_result' | 'generating' | 'completed' | 'error';
  messageKey: string;  // i18n key for frontend translation
  toolName?: string;
  loop?: number;
  data?: any;
}

// Types for Chat events
export interface ChatMessageSendRequest {
  conversationId: string;
  content: string;
  language?: string;  // 用户当前选择的语言，用于 AI 回复
}

export interface ChatProgressEvent {
  conversationId: string;
  type: 'chunk' | 'tool_call' | 'complete' | 'error' | 'title_updated';
  data: any;
}

// Event handler type for AI recommendations
type AIRecommendationHandler = (
  userId: string,
  request: AIRecommendationRequest,
  onProgress: (event: AIProgressEvent) => void
) => Promise<any>;

// Event handler type for Chat messages
type ChatMessageHandler = (
  userId: string,
  request: ChatMessageSendRequest,
  onProgress: (event: ChatProgressEvent) => void
) => Promise<any>;

export class SocketService {
  private io: Server;
  private tokenService: TokenService;
  private aiRecommendationHandler: AIRecommendationHandler | null = null;
  private chatMessageHandler: ChatMessageHandler | null = null;
  
  /**
   * Per-conversation mutex: 防止同一会话的消息被并发处理
   * Key: conversationId, Value: Promise chain
   * 使用 Promise 链实现简单的 FIFO 队列，保证同一会话的消息串行处理
   */
  private conversationLocks: Map<string, Promise<void>> = new Map();

  constructor(httpServer: HttpServer, tokenService: TokenService) {
    this.tokenService = tokenService;
    // 支持多个 origin：本地开发和远程服务器
    const allowedOrigins = [
      'http://localhost:3000',
      'http://38.22.90.133',
      'http://38.22.90.133:80',
      process.env.CORS_ORIGIN, // 可通过环境变量添加额外 origin
    ].filter(Boolean) as string[];

    this.io = new Server(httpServer, {
      path: '/socket.io',
      cors: {
        origin: allowedOrigins,
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

      // Handle AI Recommendation request via WebSocket
      this.setupAIRecommendationHandler(socket);

      // Handle Chat message request via WebSocket
      this.setupChatMessageHandler(socket);

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
   * Setup AI Recommendation event handlers for a socket
   */
  private setupAIRecommendationHandler(socket: Socket) {
    socket.on('ai:recommendations:request', async (request: AIRecommendationRequest) => {
      const userId = socket.data.user?.userId;
      
      if (!userId) {
        socket.emit('ai:recommendations:error', { 
          code: 'AUTH_ERROR',
          message: 'User not authenticated' 
        });
        return;
      }

      logger.info({
        domain: 'SOCKET',
        action: 'ai_recommendation_start',
        userId,
        metadata: { request, socketId: socket.id }
      });

      if (!this.aiRecommendationHandler) {
        socket.emit('ai:recommendations:error', { 
          code: 'NOT_CONFIGURED',
          message: 'AI recommendation handler not configured' 
        });
        return;
      }

      // Progress callback - sends real-time updates to client
      const onProgress = (event: AIProgressEvent) => {
        socket.emit('ai:recommendations:progress', event);
        
        logger.debug({
          domain: 'SOCKET',
          action: 'ai_recommendation_progress',
          userId,
          metadata: { stage: event.stage, messageKey: event.messageKey }
        });
      };

      try {
        const result = await this.aiRecommendationHandler(userId, request, onProgress);
        
        socket.emit('ai:recommendations:complete', { 
          status: 'success',
          data: result 
        });

        logger.info({
          domain: 'SOCKET',
          action: 'ai_recommendation_complete',
          userId,
          metadata: { socketId: socket.id }
        });
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error occurred';
        const errorCode = error?.reason || 'AI_ERROR';
        
        socket.emit('ai:recommendations:error', { 
          code: errorCode,
          message: errorMessage 
        });

        logger.error({
          domain: 'SOCKET',
          action: 'ai_recommendation_error',
          userId,
          metadata: { error: errorMessage, socketId: socket.id }
        });
      }
    });
  }

  /**
   * Set the handler for AI recommendations
   * This is called during app initialization to inject the AgentService method
   */
  public setAIRecommendationHandler(handler: AIRecommendationHandler) {
    this.aiRecommendationHandler = handler;
  }

  /**
   * Setup Chat message event handlers for a socket
   */
  private setupChatMessageHandler(socket: Socket) {
    socket.on('chat:message:send', async (request: ChatMessageSendRequest) => {
      const userId = socket.data.user?.userId;
      
      if (!userId) {
        socket.emit('chat:message:error', {
          conversationId: request.conversationId,
          code: 'AUTH_ERROR',
          message: 'User not authenticated'
        });
        return;
      }

      if (!request.conversationId || !request.content) {
        socket.emit('chat:message:error', {
          conversationId: request.conversationId,
          code: 'INVALID_REQUEST',
          message: 'Missing conversationId or content'
        });
        return;
      }

      if (!this.chatMessageHandler) {
        socket.emit('chat:message:error', {
          conversationId: request.conversationId,
          code: 'NOT_CONFIGURED',
          message: 'Chat handler not configured'
        });
        return;
      }

      // 竞态防护：per-conversation mutex
      // 同一会话的消息必须串行处理，避免历史记录读取冲突和 AI 回复交错
      const convId = request.conversationId;
      const previousLock = this.conversationLocks.get(convId) || Promise.resolve();
      
      const currentLock = previousLock.then(async () => {
        logger.info({
          domain: 'SOCKET',
          action: 'chat_message_start',
          userId,
          metadata: { conversationId: convId, socketId: socket.id }
        });

        // Progress callback - sends real-time updates to client
        const onProgress = (event: ChatProgressEvent) => {
          switch (event.type) {
            case 'chunk':
              socket.emit('chat:message:chunk', {
                conversationId: event.conversationId,
                chunk: event.data.chunk
              });
              break;
            case 'tool_call':
              socket.emit('chat:message:tool_call', {
                conversationId: event.conversationId,
                toolName: event.data.toolName,
                status: event.data.status
              });
              break;
            case 'complete':
              socket.emit('chat:message:complete', {
                conversationId: event.conversationId,
                message: event.data.message
              });
              break;
            case 'error':
              socket.emit('chat:message:error', {
                conversationId: event.conversationId,
                code: 'AI_ERROR',
                message: event.data.error
              });
              break;
            case 'title_updated':
              socket.emit('chat:message:title_updated', {
                conversationId: event.conversationId,
                title: event.data.title
              });
              break;
          }
        };

        try {
          await this.chatMessageHandler!(userId, request, onProgress);
          
          logger.info({
            domain: 'SOCKET',
            action: 'chat_message_complete',
            userId,
            metadata: { conversationId: convId, socketId: socket.id }
          });
        } catch (error: any) {
          const errorMessage = error?.message || 'Unknown error occurred';
          const errorCode = error?.reason || 'CHAT_ERROR';
          
          socket.emit('chat:message:error', {
            conversationId: convId,
            code: errorCode,
            message: errorMessage
          });

          logger.error({
            domain: 'SOCKET',
            action: 'chat_message_error',
            userId,
            metadata: { error: errorMessage, conversationId: convId, socketId: socket.id }
          });
        }
      }).catch(() => {
        // 确保锁链不会因为前一个请求的异常而断裂
      });
      
      this.conversationLocks.set(convId, currentLock);
      
      // 清理：当锁链完成且没有新的请求排队时，移除引用防止内存泄漏
      currentLock.then(() => {
        if (this.conversationLocks.get(convId) === currentLock) {
          this.conversationLocks.delete(convId);
        }
      });
    });
  }

  /**
   * Set the handler for Chat messages
   * This is called during app initialization to inject the ChatService method
   */
  public setChatMessageHandler(handler: ChatMessageHandler) {
    this.chatMessageHandler = handler;
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
