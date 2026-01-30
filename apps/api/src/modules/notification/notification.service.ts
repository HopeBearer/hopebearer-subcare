import { prisma } from '@subcare/database';
import { logger } from '../../infrastructure/logger/logger';
import { EmailProvider } from '../../infrastructure/email/email.provider';
import { MessageTemplateRepository } from '../../repositories/MessageTemplateRepository';

export type CreateNotificationPayload = {
  userId: string;
  title?: string;
  content?: string;
  key?: string;            // i18n key
  data?: Record<string, any>; // i18n variables
  templateKey?: string;    // @deprecated use key
  templateData?: Record<string, string>; // @deprecated use data
  type: 'system' | 'billing' | 'security' | 'marketing';
  channels?: ('in-app' | 'email')[];
  link?: string;
  metadata?: any;
  priority?: string;
  actionLabel?: string;
};

import { SocketService } from '../../infrastructure/socket/socket.service';

export class NotificationService {
  private socketService: SocketService | null = null;

  constructor(
    private emailProvider: EmailProvider,
    private messageTemplateRepository: MessageTemplateRepository
  ) {}

  public setSocketService(socketService: SocketService) {
    this.socketService = socketService;
  }

  private replaceTemplateVariables(content: string, data: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] !== undefined ? String(data[key]) : '');
  }

  async notify(payload: CreateNotificationPayload): Promise<void> {
    let { 
        userId, 
        title, 
        content, 
        templateKey, 
        templateData, 
        key, 
        data, 
        type, 
        channels = ['in-app'] 
    } = payload;

    // Unify parameters
    const finalKey = key || templateKey;
    const finalData = data || templateData || {};

    // Resolve Template for Email/Push Text Fallback if provided
    if (finalKey) {
      const template = await this.messageTemplateRepository.findByKey(finalKey);
      if (template) {
        // Only override if not explicitly provided (or always override?)
        // Let's assume template is the source of truth for text.
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
         // If template not found, we might still want to proceed if title/content were manually provided.
         // Or just use the key as fallback to avoid crashing DB if title/content required.
         if (!title) title = finalKey; 
         if (!content) content = finalKey; 

         logger.warn({
            domain: 'NOTIFICATION',
            action: 'template_not_found',
            userId,
            metadata: { key: finalKey }
         });
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

    // 1. In-App Notification
    if (channels.includes('in-app')) {
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
            logger.debug({ domain: 'NOTIFICATION', action: 'socket_push', userId, notificationId: notification.id });
        } else {
             logger.warn({ domain: 'NOTIFICATION', action: 'socket_service_not_initialized', userId, reason: 'socketService is null' });
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
    if (channels.includes('email')) {
      // Need to fetch user email first
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (user?.email) {
          await this.emailProvider.sendEmail(user.email, title, content);
        } else {
          logger.warn({
            domain: 'NOTIFICATION',
            action: 'email_skipped_no_user',
            userId,
            metadata: { reason: 'User not found or no email' },
          });
        }
      } catch (error) {
        // Email failure shouldn't crash the whole flow, but should be logged
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
        channels,
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
