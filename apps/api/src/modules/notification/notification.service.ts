import { prisma } from '@subcare/database';
import { logger } from '../../infrastructure/logger/logger';
import { EmailProvider } from '../../infrastructure/email/email.provider';
import { MessageTemplateRepository } from '../../repositories/MessageTemplateRepository';
import { NotificationSettingService } from './notification-setting.service';
import { SocketService } from '../../infrastructure/socket/socket.service';

export type CreateNotificationPayload = {
  userId: string;
  title?: string;
  content?: string;
  key?: string;            // i18n key
  data?: Record<string, any>; // i18n variables
  templateKey?: string;    // @deprecated use key
  templateData?: Record<string, string>; // @deprecated use data
  type: 'system' | 'billing' | 'security' | 'marketing';
  // Event-specific key for granular settings (e.g. 'billing.renewal_upcoming')
  eventKey?: string;
  link?: string;
  metadata?: any;
  priority?: string;
  actionLabel?: string;
};

export class NotificationService {
  private socketService: SocketService | null = null;
  private notificationSettingService: NotificationSettingService;

  constructor(
    private emailProvider: EmailProvider,
    private messageTemplateRepository: MessageTemplateRepository
  ) {
    this.notificationSettingService = new NotificationSettingService();
  }

  public setSocketService(socketService: SocketService) {
    this.socketService = socketService;
  }

  private replaceTemplateVariables(content: string, data: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] !== undefined ? String(data[key]) : '');
  }

  async notify(payload: CreateNotificationPayload): Promise<void> {
    const { 
        userId, 
        title: initialTitle, 
        content: initialContent, 
        templateKey, 
        templateData, 
        key, 
        data, 
        type,
        eventKey
    } = payload;

    let title = initialTitle;
    let content = initialContent;

    // Unify parameters
    const finalKey = key || templateKey;
    const finalData = data || templateData || {};

    // Resolve Template for Email/Push Text Fallback if provided
    if (finalKey) {
      const template = await this.messageTemplateRepository.findByKey(finalKey);
      if (template) {
        let resolvedTitle = template.title;
        let resolvedContent = template.content;
        
        if (finalData) {
          resolvedTitle = this.replaceTemplateVariables(resolvedTitle, finalData);
          resolvedContent = this.replaceTemplateVariables(resolvedContent, finalData);
        }
        
        // If caller didn't provide title/content, use resolved ones.
        if (!title) title = resolvedTitle;
        if (!content) content = resolvedContent;

      } else {
         if (!title) title = finalKey; 
         if (!content) content = finalKey; 
      }
    }
    
    // Ensure title and content are available (DB constraint)
    if (!title || !content) {
        logger.error({
            domain: 'NOTIFICATION',
            action: 'missing_content',
            userId,
            metadata: { key: finalKey }
        });
        return;
    }

    // --- CHECK SETTINGS ---
    // Default to true for security, otherwise check DB
    let sendEmail = true;
    let sendInApp = true;

    // Debug Log
    logger.info({
        domain: 'NOTIFICATION',
        action: 'debug_check',
        userId,
        metadata: { type, eventKey, hasSocket: !!this.socketService }
    });

    if (type !== 'security') {
        try {
            // Priority: eventKey -> key (if it looks like event key?) -> type
            // We use eventKey if provided, otherwise fallback to Category (type)
            // Note: finalKey is usually i18n key (e.g. notification.welcome), which might not match eventKey
            const checkKey = eventKey || type;

            const [emailEnabled, inAppEnabled] = await Promise.all([
                this.notificationSettingService.isChannelEnabled(userId, checkKey, 'email'),
                this.notificationSettingService.isChannelEnabled(userId, checkKey, 'inApp')
            ]);
            sendEmail = emailEnabled;
            sendInApp = inAppEnabled;
            
            logger.info({
                domain: 'NOTIFICATION',
                action: 'settings_resolved',
                userId,
                metadata: { checkKey, emailEnabled, inAppEnabled }
            });
        } catch (err) {
            logger.error({
                domain: 'NOTIFICATION',
                action: 'settings_check_error',
                userId,
                error: err
            });
        }
    }

    // 1. In-App Notification (DB + Socket)
    if (sendInApp) {
      try {
        const notificationData: any = {
            userId,
            title,
            content,
            type,
            link: payload.link,
            metadata: payload.metadata,
            priority: payload.priority || 'NORMAL',
            actionLabel: payload.actionLabel,
            key: finalKey,
            data: finalData
        };

        const notification = await prisma.notification.create({
          data: notificationData,
        });

        // Push via Socket
        if (this.socketService) {
            this.socketService.sendNotification(userId, notification);
            logger.debug({ domain: 'NOTIFICATION', action: 'socket_push', userId, metadata: { notificationId: notification.id } });
        }
      } catch (error) {
        logger.error({
          domain: 'NOTIFICATION',
          action: 'create_db_fail',
          userId,
          metadata: { title, type },
          error,
        });
      }
    }

    // 2. Email Notification
    if (sendEmail) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (user?.email) {
          await this.emailProvider.sendEmail(user.email, title, content);
        }
      } catch (error) {
        logger.error({
          domain: 'NOTIFICATION',
          action: 'send_email_fail',
          userId,
          error,
        });
      }
    }

    // 3. Log the notification event
    logger.info({
      domain: 'NOTIFICATION',
      action: 'notify',
      userId,
      metadata: {
        type,
        eventKey,
        channels: { email: sendEmail, inApp: sendInApp },
        title,
        templateKey
      },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId, // Security check
      },
      data: {
        isRead: true,
      },
    });

    // Notify other clients
    if (this.socketService) {
        this.socketService.sendNotificationRead(userId, notificationId);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Notify other clients
    if (this.socketService) {
        this.socketService.sendNotificationRead(userId);
    }
  }
  
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20, filter?: string, search?: string) {
    const skip = (page - 1) * limit;
    
    // Add logic to exclude deleted or old notifications if needed, though soft delete handled by model if column exists
    // The query now implicitly filters where `deletedAt` is null if standard Prisma behavior, but schema shows deletedAt is optional
    // Let's ensure we filter by deletedAt: null if standard soft-delete is intended.
    // Schema: deletedAt DateTime?
    const where: any = { 
        userId,
        deletedAt: null
    };
    
    if (filter === 'unread') {
      where.isRead = false;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      ]);

    return { items, total };
  }

  /**
   * Cleanup old notifications (Soft Delete)
   * Keeps notifications for 30 days
   */
  async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.notification.updateMany({
        where: {
            createdAt: {
                lt: thirtyDaysAgo
            },
            deletedAt: null // Only update active ones
        } as any,
        data: {
            deletedAt: new Date()
        } as any
    });

    logger.info({
        domain: 'NOTIFICATION',
        action: 'cleanup',
        metadata: {
            count: result.count,
            cutoff: thirtyDaysAgo
        }
    });
  }
}
