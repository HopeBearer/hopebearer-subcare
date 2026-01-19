import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../../services/SubscriptionService';
import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../utils/AppError';
import { Role } from '@subcare/database';
import { BusinessCode } from '../../constants/BusinessCode';

// 创建订阅的验证 schema
const createSubscriptionSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  currency: z.string().length(3),
  billingCycle: z.string(),
  startDate: z.string().datetime().or(z.date()),
});

/**
 * 订阅控制器
 * 处理订阅相关的 HTTP 请求
 */
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  /**
   * 创建新的订阅
   * POST /subscriptions
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', StatusCodes.UNAUTHORIZED);
      }
      
      const validatedData = createSubscriptionSchema.parse(req.body);
      const subscription = await this.subscriptionService.createSubscription({
        ...validatedData,
        userId: req.user.userId,
      });
      
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        code: BusinessCode.CREATED,
        data: { subscription },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取当前用户的订阅列表
   * GET /subscriptions
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', StatusCodes.UNAUTHORIZED);
      }
      
      const subscriptions = await this.subscriptionService.getUserSubscriptions(req.user.userId);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { subscriptions },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取全局订阅统计信息 (仅管理员)
   * GET /subscriptions/stats
   */
  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', StatusCodes.UNAUTHORIZED);
      }

      // 显式检查管理员权限，虽然路由层面应该也有保护
      if (req.user.role !== Role.ADMIN) {
        throw new AppError('Not authorized', StatusCodes.FORBIDDEN);
      }

      const stats = await this.subscriptionService.getGlobalStats();
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  };
}
