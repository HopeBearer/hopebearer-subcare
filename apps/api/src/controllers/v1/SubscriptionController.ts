import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../../services/SubscriptionService';
import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../utils/AppError';
import { Role } from '@subcare/database';
import { BusinessCode } from '../../constants/BusinessCode';
import { SubscriptionFilterDTO } from '@subcare/types';

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

export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  checkConflict = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }
      
      const name = req.query.name as string;
      if (!name) {
          throw new AppError('BAD_REQUEST', StatusCodes.BAD_REQUEST, { message: 'Name is required' });
      }

      const result = await this.subscriptionService.checkNameConflict(req.user.userId, name);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getNames = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
        }
        
        const names = await this.subscriptionService.getSubscriptionNames(req.user.userId);
        
        res.status(StatusCodes.OK).json({
            status: 'success',
            code: BusinessCode.SUCCESS,
            data: { names }
        });
    } catch (error) {
        next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }
      
      const validatedData = createSubscriptionSchema.parse(req.body);
      
      const subscription = await this.subscriptionService.createSubscription({
        ...validatedData,
        startDate: new Date(validatedData.startDate), 
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

  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

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

  /**
   * 获取订阅历史记录
   * GET /subscriptions/:id/history
   */
  history = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const search = req.query.search as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const { items, total } = await this.subscriptionService.getSubscriptionHistory(id, req.user.userId, {
        page,
        limit,
        search,
        startDate,
        endDate
      });
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { 
            history: items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
