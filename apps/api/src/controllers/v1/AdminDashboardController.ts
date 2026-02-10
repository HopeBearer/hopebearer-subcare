import { Request, Response, NextFunction } from 'express';
import { AdminDashboardService } from '../../services/AdminDashboardService';
import { BusinessCode } from '../../constants/BusinessCode';
import { ApiResponse } from '@subcare/types';

/**
 * 管理后台仪表盘控制器
 */
export class AdminDashboardController {
  constructor(private adminDashboardService: AdminDashboardService) {}

  /**
   * 获取管理后台统计概览
   * GET /admin/stats
   */
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.adminDashboardService.getOverviewStats();

      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: stats,
        message: 'Admin dashboard stats retrieved successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取用户增长趋势
   * GET /admin/stats/users
   */
  getUserGrowth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days) || 30;
      const trend = await this.adminDashboardService.getUserGrowthTrend(days);

      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: trend,
        message: 'User growth trend retrieved successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取订阅统计
   * GET /admin/stats/subscriptions
   */
  getSubscriptionStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.adminDashboardService.getSubscriptionStats();

      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: stats,
        message: 'Subscription stats retrieved successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
