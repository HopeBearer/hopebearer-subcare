import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { SystemLogService } from '../../services/SystemLogService';
import { AppError } from '../../utils/AppError';

export class SystemLogController {
  constructor(private systemLogService: SystemLogService) {}

  /**
   * Get system logs with filters
   */
  async getLogs(req: Request, res: Response) {
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
      success: true,
      data: result,
    });
  }

  /**
   * Get log details
   */
  async getLogById(req: Request, res: Response) {
    const { id } = req.params;
    const log = await this.systemLogService.getLogById(id);

    if (!log) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, { message: 'Log not found' });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: log,
    });
  }
}
