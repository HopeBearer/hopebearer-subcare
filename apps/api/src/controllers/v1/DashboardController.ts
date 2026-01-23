import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../../services/DashboardService';
import { AppError } from '../../utils/AppError';
import { ApiResponse } from '@subcare/types';
import { BusinessCode } from '../../constants/BusinessCode';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('UNAUTHORIZED', 401, { message: 'User not authenticated' });
      }

      const stats = await this.dashboardService.getStats(userId);

      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: stats,
        message: 'Dashboard stats retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('UNAUTHORIZED', 401, { message: 'User not authenticated' });
      }

      const period = (req.query.period as '6m' | '1y' | 'all') || '6m';
      const trend = await this.dashboardService.getExpenseTrend(userId, period);

      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: trend,
        message: 'Trend data retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getDistribution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('UNAUTHORIZED', 401, { message: 'User not authenticated' });
      }

      const distribution = await this.dashboardService.getCategoryDistribution(userId);

      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: distribution,
        message: 'Distribution data retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
