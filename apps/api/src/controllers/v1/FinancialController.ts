import { Request, Response, NextFunction } from 'express';
import { FinancialService } from '../../services/FinancialService';
import { AppError } from '../../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../../constants/BusinessCode';

export class FinancialController {
  constructor(private financialService: FinancialService) {}

  /**
   * 获取财务分析概览
   * GET /finance/overview
   */
  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const excludedIds = req.query.excludedIds 
        ? (req.query.excludedIds as string).split(',') 
        : [];

      const data = await this.financialService.getAnalysisOverview(req.user.userId, excludedIds);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: 'Financial overview retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取全局账单历史
   * GET /finance/history
   */
  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const { items, total } = await this.financialService.getGlobalBillingHistory(req.user.userId, page, limit);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: {
          items,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取待支付账单
   * GET /finance/pending
   */
  getPendingBills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const data = await this.financialService.getPendingBills(req.user.userId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: 'Pending bills retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 确认账单支付
   * PATCH /finance/records/:id/confirm
   */
  confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const { id } = req.params;
      const { amount, date } = req.body;

      const data = await this.financialService.confirmPayment(req.user.userId, id, amount, date);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: 'Payment confirmed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取消续费 (取消账单并取消订阅)
   * POST /finance/records/:id/cancel
   */
  cancelRenewal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const { id } = req.params;

      const data = await this.financialService.cancelRenewal(req.user.userId, id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data,
        message: 'Renewal cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
