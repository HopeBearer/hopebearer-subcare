import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../../services/ChatService';
import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../utils/AppError';
import { BusinessCode } from '../../constants/BusinessCode';

// Validation schemas
const createConversationSchema = z.object({
  title: z.string().max(100).optional()
});

const updateConversationSchema = z.object({
  title: z.string().min(1).max(100)
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(8000)
});

const getHistorySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  before: z.string().optional() // Message ID for cursor-based pagination
});

export class ChatController {
  constructor(private chatService: ChatService) {}

  /**
   * POST /chat/conversations
   * 创建新对话
   */
  createConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { 
          message: 'Not authenticated' 
        });
      }

      const { title } = createConversationSchema.parse(req.body);
      const conversation = await this.chatService.createConversation(req.user.userId, title);

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /chat/conversations
   * 获取用户对话列表
   */
  listConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { 
          message: 'Not authenticated' 
        });
      }

      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const { items, total } = await this.chatService.listConversations(req.user.userId, { 
        page, 
        limit 
      });

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: {
          items,
          total,
          page: page || 1,
          limit: limit || items.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /chat/conversations/:id
   * 获取对话详情
   */
  getConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { 
          message: 'Not authenticated' 
        });
      }

      const { id } = req.params;
      const conversation = await this.chatService.getConversation(id, req.user.userId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /chat/conversations/:id
   * 更新对话（标题）
   */
  updateConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { 
          message: 'Not authenticated' 
        });
      }

      const { id } = req.params;
      const data = updateConversationSchema.parse(req.body);
      
      const conversation = await this.chatService.updateConversation(
        id, 
        req.user.userId, 
        data
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /chat/conversations/:id
   * 删除对话
   */
  deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { 
          message: 'Not authenticated' 
        });
      }

      const { id } = req.params;
      await this.chatService.deleteConversation(id, req.user.userId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        message: 'Conversation deleted'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /chat/conversations/:id/messages
   * 获取对话消息历史（支持游标分页）
   */
  getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { 
          message: 'Not authenticated' 
        });
      }

      const { id } = req.params;
      const { limit, before } = getHistorySchema.parse(req.query);
      
      const { items, total } = await this.chatService.getHistory(id, req.user.userId, { 
        limit, 
        before 
      });

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: {
          items,
          total
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /chat/conversations/:id/messages
   * 发送消息（REST 方式，非流式）
   * 注意：推荐使用 WebSocket 实现流式响应
   */
  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { 
          message: 'Not authenticated' 
        });
      }

      const { id } = req.params;
      const { content } = sendMessageSchema.parse(req.body);

      const message = await this.chatService.sendMessage({
        conversationId: id,
        userId: req.user.userId,
        content
      });

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: message
      });
    } catch (error) {
      next(error);
    }
  };
}
