import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { SystemLogService } from '../../services/SystemLogService';
import { AppError } from '../../utils/AppError';
import { BusinessCode } from '../../constants/BusinessCode';

export class SystemLogController {
  constructor(private systemLogService: SystemLogService) {}

  /**
   * Get system logs with filters
   * GET /api/system-logs
   */
  getLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const { level, domain, userId, startDate, endDate } = req.query;

      const filters = {
        level: level as string,
        domain: domain as string,
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const result = await this.systemLogService.getLogs(filters, page, limit);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get log details
   * GET /api/system-logs/:id
   */
  getLogById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const log = await this.systemLogService.getLogById(id);

      if (!log) {
        throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, { message: 'Log not found' });
      }

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: log,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Export logs as CSV
   * GET /api/system-logs/export
   */
  exportLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { level, domain, userId, startDate, endDate } = req.query;

      const filters = {
        level: level as string,
        domain: domain as string,
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const csv = await this.systemLogService.exportLogs(filters);

      // Add BOM for Excel compatibility with UTF-8
      const bom = '\uFEFF';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=system-logs-${Date.now()}.csv`);
      res.status(StatusCodes.OK).send(bom + csv);
    } catch (error) {
      next(error);
    }
  };
}
