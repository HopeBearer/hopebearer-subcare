import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../../services/SubscriptionService';
import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../utils/AppError';
import { Role } from '@subcare/database';
import { BusinessCode } from '../../constants/BusinessCode';
import { SubscriptionFilterDTO } from '@subcare/types';

// 创建订阅的验证 schema
const createSubscriptionSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().length(3),
  billingCycle: z.string(),
  startDate: z.coerce.date(),
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
  autoRenewal: z.boolean().optional(),
  enableNotification: z.boolean().optional(),
  notifyDaysBefore: z.number().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  icon: z.string().optional(),
});

const updateSubscriptionSchema = createSubscriptionSchema.partial();

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
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }
      
      const validatedData = createSubscriptionSchema.parse(req.body);
      
      const subscription = await this.subscriptionService.createSubscription({
        ...validatedData,
        startDate: new Date(validatedData.startDate), // Ensure it's a Date object
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
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }
      
      const filters: SubscriptionFilterDTO = {
        search: req.query.search as string,
        status: req.query.status as string,
        category: req.query.category as string,
        billingCycle: req.query.billingCycle as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 12,
        expiringInDays: req.query.expiringInDays ? parseInt(req.query.expiringInDays as string) : undefined,
      };

      const { items, total } = await this.subscriptionService.getUserSubscriptions(req.user.userId, filters);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { 
          subscriptions: items,
          pagination: {
            total,
            page: filters.page,
            limit: filters.limit,
            totalPages: Math.ceil(total / (filters.limit || 12))
          }
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新订阅
   * PATCH /subscriptions/:id
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const { id } = req.params;
      const validatedData = updateSubscriptionSchema.parse(req.body);

      const subscription = await this.subscriptionService.updateSubscription(id, req.user.userId, validatedData);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { subscription },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 删除订阅
   * DELETE /subscriptions/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const { id } = req.params;
      
      await this.subscriptionService.deleteSubscription(id, req.user.userId);

      res.status(StatusCodes.NO_CONTENT).send();
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
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      // 显式检查管理员权限，虽然路由层面应该也有保护
      if (req.user.role !== Role.ADMIN) {
        throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, { message: 'Not authorized' });
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

  /**
   * 获取即将续费的订阅
   * GET /subscriptions/upcoming
   */
  upcoming = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const subscriptions = await this.subscriptionService.getUpcomingRenewals(req.user.userId, days);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { subscriptions },
      });
    } catch (error) {
      next(error);
    }
  };
}
