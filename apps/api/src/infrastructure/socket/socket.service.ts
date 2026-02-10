import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../logger/logger';
import { NotificationDTO } from '@subcare/types';
import { TokenService } from '../../services/TokenService';
import { AITaskManager, AIProgressEvent, AITaskStatusResponse } from '../../services/AITaskManager';
import { prisma } from '@subcare/database';

// Types for AI Recommendation events
export interface AIRecommendationRequest {
  model?: string;
  focus?: string;
  forceRefresh?: boolean;
}

export { AIProgressEvent };

// Types for Chat events
export interface ChatMessageSendRequest {
  conversationId: string;
  content: string;
  language?: string;  // 用户当前选择的语言，用于 AI 回复
}

export interface ChatProgressEvent {
  conversationId: string;
  type: 'chunk' | 'tool_call' | 'complete' | 'error' | 'title_updated' | 'thinking' | 'context_info';
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
  private aiTaskManager: AITaskManager;
  
  /**
   * Per-conversation mutex: 防止同一会话的消息被并发处理
   * Key: conversationId, Value: Promise chain
   * 使用 Promise 链实现简单的 FIFO 队列，保证同一会话的消息串行处理
   */
  private conversationLocks: Map<string, Promise<void>> = new Map();

  constructor(httpServer: HttpServer, tokenService: TokenService, aiTaskManager?: AITaskManager) {
    this.tokenService = tokenService;
    this.aiTaskManager = aiTaskManager || new AITaskManager();
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
    const userRoom = (userId: string) => `user:${userId}`;

    // --- Status query: frontend can check current task state on mount/reconnect ---
    socket.on('ai:recommendations:status', async () => {
      const userId = socket.data.user?.userId;
      if (!userId) {
        socket.emit('ai:recommendations:status:result', { status: 'idle' });
        return;
      }

      const statusResponse: AITaskStatusResponse = this.aiTaskManager.getStatusResponse(userId);

      // When task is running, also attach the last cached recommendation (if any)
      // so the frontend can display old data with a progress overlay (consistent with manual refresh UX)
      if (statusResponse.status === 'running' || statusResponse.status === 'idle') {
        try {
          const cached = await prisma.aIRecommendation.findUnique({
            where: { userId }
          });
          if (cached) {
            statusResponse.cachedData = cached.content;
          }
        } catch (e) {
          // Non-critical: if DB query fails, just skip cached data
          logger.debug({
            domain: 'SOCKET',
            action: 'ai_recommendation_status_cache_fail',
            userId,
            metadata: { error: String(e) }
          });
        }
      }

      socket.emit('ai:recommendations:status:result', statusResponse);

      logger.debug({
        domain: 'SOCKET',
        action: 'ai_recommendation_status_query',
        userId,
        metadata: { status: statusResponse.status, socketId: socket.id }
      });
    });

    // --- Main request handler with dedup ---
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

      // Dedup: if a task is already running for this user, just replay current progress
      if (this.aiTaskManager.isRunning(userId) && !request.forceRefresh) {
        const task = this.aiTaskManager.getTask(userId);
        if (task?.progress) {
          socket.emit('ai:recommendations:progress', task.progress);
        }
        logger.info({
          domain: 'SOCKET',
          action: 'ai_recommendation_dedup',
          userId,
          metadata: { socketId: socket.id, message: 'Task already running, replayed progress' }
        });
        return;
      }

      // Mark task as running in TaskManager
      this.aiTaskManager.startTask(userId);

      // Progress callback - sends to user room (all sockets of this user) & updates TaskManager
      const onProgress = (event: AIProgressEvent) => {
        this.aiTaskManager.updateProgress(userId, event);
        this.io.to(userRoom(userId)).emit('ai:recommendations:progress', event);
        
        logger.debug({
          domain: 'SOCKET',
          action: 'ai_recommendation_progress',
          userId,
          metadata: { stage: event.stage, messageKey: event.messageKey }
        });
      };

      try {
        const result = await this.aiRecommendationHandler(userId, request, onProgress);
        
        // Mark completed in TaskManager
        this.aiTaskManager.completeTask(userId, result);

        // Emit to user room so all connected clients (including reconnected ones) receive
        this.io.to(userRoom(userId)).emit('ai:recommendations:complete', { 
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
        
        // Mark failed in TaskManager
        this.aiTaskManager.failTask(userId, { code: errorCode, message: errorMessage });

        this.io.to(userRoom(userId)).emit('ai:recommendations:error', { 
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
   * Get the AITaskManager instance (for external use, e.g. AgentService)
   */
  public getAITaskManager(): AITaskManager {
    return this.aiTaskManager;
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

        // ===== Chunk 微合并缓冲（减少 WebSocket 消息频率） =====
        // 将高频的逐 token chunk 合并为 ~30ms 一次的批量发送
        const CHUNK_FLUSH_INTERVAL = 30; // ms
        const CHUNK_FLUSH_THRESHOLD = 20; // 字符数阈值，超过立即 flush
        let chunkBuffer = '';
        let chunkFlushTimer: ReturnType<typeof setTimeout> | null = null;
        let chunkConversationId = '';

        const flushChunkBuffer = () => {
          if (chunkBuffer.length > 0) {
            socket.emit('chat:message:chunk', {
              conversationId: chunkConversationId,
              chunk: chunkBuffer
            });
            chunkBuffer = '';
          }
          if (chunkFlushTimer) {
            clearTimeout(chunkFlushTimer);
            chunkFlushTimer = null;
          }
        };

        // Progress callback - sends real-time updates to client
        const onProgress = (event: ChatProgressEvent) => {
          switch (event.type) {
            case 'chunk':
              // 微合并：攒入 buffer，定时/阈值 flush
              chunkConversationId = event.conversationId;
              chunkBuffer += event.data.chunk;
              if (chunkBuffer.length >= CHUNK_FLUSH_THRESHOLD) {
                // 超过阈值，立即发送
                flushChunkBuffer();
              } else if (!chunkFlushTimer) {
                // 启动定时 flush
                chunkFlushTimer = setTimeout(flushChunkBuffer, CHUNK_FLUSH_INTERVAL);
              }
              break;
            case 'tool_call':
              // flush 残余 chunk（工具调用前确保文本已发送）
              flushChunkBuffer();
              socket.emit('chat:message:tool_call', {
                conversationId: event.conversationId,
                toolName: event.data.toolName,
                status: event.data.status
              });
              break;
            case 'complete':
              // flush 残余 chunk，再发 complete
              flushChunkBuffer();
              socket.emit('chat:message:complete', {
                conversationId: event.conversationId,
                message: event.data.message
              });
              break;
            case 'error':
              // flush 残余 chunk，再发 error
              flushChunkBuffer();
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
            case 'thinking':
              // flush 残余 chunk（思考事件前确保文本已发送）
              flushChunkBuffer();
              socket.emit('chat:message:thinking', {
                conversationId: event.conversationId,
                step: event.data.step,
                action: event.data.action,
                toolName: event.data.toolName,
                summary: event.data.summary
              });
              break;
            case 'context_info':
              socket.emit('chat:message:context_info', {
                conversationId: event.conversationId,
                messageCount: event.data.messageCount,
                totalMessages: event.data.totalMessages,
                contextTokens: event.data.contextTokens,
                userMessageTokens: event.data.userMessageTokens,
                maxContextTokens: event.data.maxContextTokens,
                trimmed: event.data.trimmed
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
