import { Request, Response, NextFunction } from 'express';
import { AdminManagementService } from '../../services/AdminManagementService';
import { CurrencyService } from '../../services/CurrencyService';
import { BusinessCode } from '../../constants/BusinessCode';
import { ApiResponse } from '@subcare/types';

/**
 * 管理后台扩展管理控制器
 * 处理汇率、支付记录、通知、AI对话、搜索用量等管理接口
 */
export class AdminManagementController {
  constructor(
    private adminManagementService: AdminManagementService,
    private currencyService: CurrencyService,
  ) {}

  // ===================== 汇率管理 =====================

  /**
   * GET /admin/exchange-rates
   */
  getExchangeRates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.getExchangeRates();
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
   * POST /admin/exchange-rates/sync
   */
  syncExchangeRates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.currencyService.syncRates();
      const data = await this.adminManagementService.getExchangeRates();
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: 'Exchange rates synced successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /admin/exchange-rates/:id
   */
  updateExchangeRate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { rate } = req.body;
      if (rate === undefined || isNaN(Number(rate))) {
        const response: ApiResponse = {
          status: 'error',
          code: BusinessCode.BAD_REQUEST,
          data: null,
          message: 'Valid rate is required',
        };
        return res.status(400).json(response);
      }
      const updated = await this.adminManagementService.updateExchangeRate(id, Number(rate));
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: updated,
        message: 'Exchange rate updated',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  // ===================== 支付记录总览 =====================

  /**
   * GET /admin/payments
   */
  getPaymentRecords = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.getPaymentRecords({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status as string,
        userId: req.query.userId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
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
   * GET /admin/payments/stats
   */
  getPaymentStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.getPaymentStats();
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

  // ===================== 通知管理 =====================

  /**
   * GET /admin/notifications
   */
  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.getNotifications({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        type: req.query.type as string,
        priority: req.query.priority as string,
        userId: req.query.userId as string,
        isRead: req.query.isRead as string,
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
   * GET /admin/notifications/stats
   */
  getNotificationStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.getNotificationStats();
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
   * POST /admin/notifications/broadcast
   */
  broadcastNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, content, type, priority, link, userIds } = req.body;
      if (!title || !content) {
        const response: ApiResponse = {
          status: 'error',
          code: BusinessCode.BAD_REQUEST,
          data: null,
          message: 'Title and content are required',
        };
        return res.status(400).json(response);
      }
      const data = await this.adminManagementService.broadcastNotification({
        title,
        content,
        type,
        priority,
        link,
        userIds,
      });
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: `Broadcast sent to ${data.targetUsers} users`,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  // ===================== AI 对话监控 =====================

  /**
   * GET /admin/ai-chat/stats
   */
  getAIChatStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.getAIChatStats();
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
   * GET /admin/ai-chat/conversations
   */
  getConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.getConversations({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        userId: req.query.userId as string,
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

  // ===================== 搜索用量管理 =====================

  /**
   * GET /admin/search-usage
   */
  getSearchUsageStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.getSearchUsageStats();
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
   * POST /admin/search-usage/clean-cache
   */
  cleanExpiredCache = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.cleanExpiredCache();
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: `Cleaned ${data.cleaned} expired cache entries`,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /admin/search-usage/limit
   */
  updateSearchLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { month, limit } = req.body;
      if (!month || !limit || isNaN(Number(limit))) {
        const response: ApiResponse = {
          status: 'error',
          code: BusinessCode.BAD_REQUEST,
          data: null,
          message: 'Valid month and limit are required',
        };
        return res.status(400).json(response);
      }
      const data = await this.adminManagementService.updateSearchLimit(month, Number(limit));
      const response: ApiResponse = {
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: 'Search limit updated',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  // ===================== 用户 AI 配置概览 =====================

  /**
   * GET /admin/user-ai-configs/stats
   */
  getUserAIConfigStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.adminManagementService.getUserAIConfigStats();
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
}
