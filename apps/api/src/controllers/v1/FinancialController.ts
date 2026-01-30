import { Request, Response, NextFunction } from 'express';
import { FinancialService } from '../../services/FinancialService';
import { AppError } from '../../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../../constants/BusinessCode';

export class FinancialController {
  constructor(private financialService: FinancialService) {}

  /**
   * 预览货币转换
   * GET /currency/preview-convert
   */
  previewConversion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const amount = Number(req.query.amount);
      const fromCurrency = req.query.from as string;
      const toCurrency = req.query.to as string;

      if (isNaN(amount) || !fromCurrency || !toCurrency) {
        throw new AppError('BAD_REQUEST', StatusCodes.BAD_REQUEST, { message: 'Invalid parameters' });
      }

      const convertedAmount = await this.financialService.previewConversion(amount, fromCurrency, toCurrency);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: {
          amount: convertedAmount,
          currency: toCurrency
        }
      });
    } catch (error) {
      next(error);
    }
  };

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

      const bills = await this.financialService.getPendingBills(req.user.userId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { bills }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 确认支付
   * PATCH /finance/records/:id/confirm
   */
  confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const { id } = req.params;
      const { actualAmount, actualDate } = req.body;
      const record = await this.financialService.confirmPayment(
        req.user.userId,
        id,
        actualAmount,
        actualDate ? new Date(actualDate) : undefined
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { record },
        message: 'Payment confirmed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取消自动续费/跳过本次
   * POST /finance/records/:id/cancel
   */
  cancelRenewal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' });
      }

      const { id } = req.params;
      // const { type } = req.body; // 'skip_once' | 'cancel_subscription'

      // Currently implement skip logic for the record
      const record = await this.financialService.cancelRenewal(req.user.userId, id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { record },
        message: 'Payment skipped successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
