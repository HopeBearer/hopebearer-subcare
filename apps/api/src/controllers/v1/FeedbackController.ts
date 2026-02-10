import { Request, Response, NextFunction } from 'express';
import { FeedbackService } from '../../services/FeedbackService';
import { BusinessCode } from '../../constants/BusinessCode';
import { ApiResponse } from '@subcare/types';

/**
 * 反馈/工单控制器
 */
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  /**
   * GET /admin/feedbacks
   * 获取所有反馈列表（管理员）
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.feedbackService.getAll(
        {
          type: req.query.type as string,
          status: req.query.status as string,
          priority: req.query.priority as string,
          userId: req.query.userId as string,
        },
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20,
      );
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /admin/feedbacks/stats
   * 反馈统计
   */
  getStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.feedbackService.getStats();
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /admin/feedbacks/:id
   * 获取反馈详情
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.feedbackService.getById(id);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /feedbacks
   * 用户创建反馈
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const { type, title, content, priority } = req.body;

      if (!type || !title || !content) {
        const response: ApiResponse = {
          status: 'error',
          code: BusinessCode.BAD_REQUEST,
          data: null,
          message: 'type, title, and content are required',
        };
        return res.status(400).json(response);
      }

      const data = await this.feedbackService.create({ userId, type, title, content, priority });
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.CREATED,
        data,
        message: 'Feedback submitted',
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /feedbacks
   * 用户获取自己的反馈列表
   */
  getMyFeedbacks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const data = await this.feedbackService.getMyFeedbacks(userId, page, limit);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /admin/feedbacks/:id
   * 管理员更新反馈
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, priority, adminNote } = req.body;
      const adminUserId = (req as any).user?.userId;

      const data = await this.feedbackService.updateByAdmin(
        id,
        { status, priority, adminNote },
        adminUserId,
      );
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: 'Feedback updated',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /admin/feedbacks/:id
   * 管理员删除反馈
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminUserId = (req as any).user?.userId;
      const data = await this.feedbackService.delete(id, adminUserId);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: 'Feedback deleted',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
