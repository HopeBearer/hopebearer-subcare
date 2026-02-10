import { Request, Response, NextFunction } from 'express';
import { ScheduledJobService } from '../../services/ScheduledJobService';
import { BusinessCode } from '../../constants/BusinessCode';
import { ApiResponse } from '@subcare/types';

/**
 * 定时任务管理控制器
 */
export class ScheduledJobController {
  constructor(private scheduledJobService: ScheduledJobService) {}

  /**
   * GET /admin/jobs
   * 获取所有定时任务列表
   */
  getJobs = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const jobs = await this.scheduledJobService.getAllJobs();
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { jobs },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /admin/jobs/:id
   * 获取任务详情（含执行历史）
   */
  getJobDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const detail = await this.scheduledJobService.getJobDetail(id, page, limit);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: detail,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /admin/jobs/:name/trigger
   * 手动触发任务
   */
  triggerJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;
      const adminUserId = (req as any).user?.userId;
      const result = await this.scheduledJobService.triggerJob(name, adminUserId);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
        message: result.status === 'SUCCESS' ? 'Job triggered successfully' : 'Job failed',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /admin/jobs/:id/toggle
   * 启用/禁用任务
   */
  toggleJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { isEnabled } = req.body;

      if (typeof isEnabled !== 'boolean') {
        const response: ApiResponse = {
          status: 'error',
          code: BusinessCode.BAD_REQUEST,
          data: null,
          message: 'isEnabled (boolean) is required',
        };
        return res.status(400).json(response);
      }

      const adminUserId = (req as any).user?.userId;
      const updated = await this.scheduledJobService.toggleJob(id, isEnabled, adminUserId);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: updated,
        message: isEnabled ? 'Job enabled' : 'Job disabled',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
