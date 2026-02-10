import { Request, Response, NextFunction } from 'express';
import { SystemSettingService } from '../../services/SystemSettingService';
import { BusinessCode } from '../../constants/BusinessCode';
import { ApiResponse } from '@subcare/types';

/**
 * 系统设置控制器
 */
export class SystemSettingController {
  constructor(private systemSettingService: SystemSettingService) {}

  /**
   * GET /admin/settings
   * 获取所有系统设置（支持按分组筛选）
   */
  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = req.query.group as string | undefined;
      const data = await this.systemSettingService.getAllSettings(group);
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
   * GET /admin/settings/groups
   * 获取所有分组名称
   */
  getGroups = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await this.systemSettingService.getGroups();
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { groups },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /admin/settings/:key
   * 获取单个设置
   */
  getSettingByKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key } = req.params;
      const setting = await this.systemSettingService.getByKey(key);
      if (!setting) {
        const response: ApiResponse = {
          status: 'error',
          code: BusinessCode.NOT_FOUND,
          data: null,
          message: `Setting '${key}' not found`,
        };
        return res.status(404).json(response);
      }
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: setting,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /admin/settings
   * 创建或更新设置
   */
  upsertSetting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key, value, type, group, label } = req.body;
      if (!key || value === undefined) {
        const response: ApiResponse = {
          status: 'error',
          code: BusinessCode.BAD_REQUEST,
          data: null,
          message: 'Key and value are required',
        };
        return res.status(400).json(response);
      }

      const adminUserId = (req as any).user?.userId;
      const setting = await this.systemSettingService.upsertSetting(
        { key, value: String(value), type, group, label },
        adminUserId,
      );
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: setting,
        message: 'Setting saved',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /admin/settings/batch
   * 批量更新设置
   */
  batchUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        const response: ApiResponse = {
          status: 'error',
          code: BusinessCode.BAD_REQUEST,
          data: null,
          message: 'Items array is required',
        };
        return res.status(400).json(response);
      }

      const adminUserId = (req as any).user?.userId;
      const result = await this.systemSettingService.batchUpdateSettings(items, adminUserId);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
        message: `${result.updated} settings updated`,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /admin/settings/:id
   * 删除设置
   */
  deleteSetting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminUserId = (req as any).user?.userId;
      const result = await this.systemSettingService.deleteSetting(id, adminUserId);
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
        message: 'Setting deleted',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
