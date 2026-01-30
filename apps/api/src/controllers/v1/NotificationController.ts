import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { NotificationService } from '../../modules/notification/notification.service';
import { NotificationSettingService } from '../../modules/notification/notification-setting.service';
import { AppError } from '../../utils/AppError';

export class NotificationController {
  private notificationSettingService: NotificationSettingService;

  constructor(private notificationService: NotificationService) {
    this.notificationSettingService = new NotificationSettingService();
  }

  /**
   * Get user notifications
   */
  async getNotifications(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'User not found' });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const filter = req.query.filter as string;
    const search = req.query.search as string;

    const result = await this.notificationService.getUserNotifications(userId, page, limit, filter, search);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  }

  /**
   * Get notification settings
   */
  async getSettings(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'User not found' });
    }

    const settings = await this.notificationSettingService.getSettings(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: settings,
    });
  }

  /**
   * Update notification settings
   */
  async updateSetting(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'User not found' });
    }

    const setting = await this.notificationSettingService.updateSetting(userId, req.body);

    res.status(StatusCodes.OK).json({
      success: true,
      data: setting,
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'User not found' });
    }

    const count = await this.notificationService.getUnreadCount(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: { count },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response) {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'User not found' });
    }

    await this.notificationService.markAsRead(id, userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Notification marked as read',
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'User not found' });
    }

    await this.notificationService.markAllAsRead(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'All notifications marked as read',
    });
  }
}
