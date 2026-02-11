import { Request, Response, NextFunction } from 'express';
import { LoginAttemptService } from '../../services/LoginAttemptService';
import { BusinessCode } from '../../constants/BusinessCode';
import { ApiResponse } from '@subcare/types';

/**
 * 登录尝试管理控制器（Admin）
 */
export class LoginAttemptController {
  constructor(private loginAttemptService: LoginAttemptService) {}

  /**
   * GET /admin/login-attempts
   * 分页列表
   */
  getList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, status, email } = req.query;
      const data = await this.loginAttemptService.getList({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as string,
        email: email as string,
      });
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
   * GET /admin/login-attempts/stats
   * 统计信息
   */
  getStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.loginAttemptService.getStats();
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
   * DELETE /admin/login-attempts/:id
   * 手动解冻（删除记录）
   */
  unfreeze = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminUserId = (req as any).user?.userId;
      await this.loginAttemptService.unfreeze(id, adminUserId);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: null,
        message: 'Login attempt record deleted (unfrozen)',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /admin/login-attempts/clean
   * 批量清理过期记录
   */
  cleanExpired = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = (req as any).user?.userId;
      const data = await this.loginAttemptService.cleanExpired(adminUserId);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: `Cleaned ${data.cleaned} expired records`,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
