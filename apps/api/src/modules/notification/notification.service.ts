import { prisma } from '@subcare/database';
import { logger } from '../../infrastructure/logger/logger';
import { EmailProvider } from '../../infrastructure/email/email.provider';
import { MessageTemplateRepository } from '../../repositories/MessageTemplateRepository';

export type CreateNotificationPayload = {
  userId: string;
  title?: string;
  content?: string;
  templateKey?: string;
  templateData?: Record<string, string>;
  type: 'system' | 'billing' | 'security' | 'marketing';
  channels?: ('in-app' | 'email')[];
};

export class NotificationService {
  constructor(
    private emailProvider: EmailProvider,
    private messageTemplateRepository: MessageTemplateRepository
  ) {}

  private replaceTemplateVariables(content: string, data: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
  }

  async notify(payload: CreateNotificationPayload): Promise<void> {
    let { userId, title, content, templateKey, templateData, type, channels = ['in-app'] } = payload;

    // Resolve Template if provided
    if (templateKey) {
      const template = await this.messageTemplateRepository.findByKey(templateKey);
      if (template) {
        title = template.title;
        content = template.content;
        
        if (templateData) {
          title = this.replaceTemplateVariables(title, templateData);
          content = this.replaceTemplateVariables(content, templateData);
        }
      } else {
         logger.warn({
            domain: 'NOTIFICATION',
            action: 'template_not_found',
            userId,
            metadata: { templateKey }
         });
         // Fallback or just continue with potentially empty title/content? 
         // If title/content provided as fallback, fine.
      }
    }
    
    // Ensure title and content are available
    if (!title || !content) {
        logger.error({
            domain: 'NOTIFICATION',
            action: 'missing_content',
            userId,
            metadata: { templateKey }
        });
        return;
    }

    // 1. In-App Notification
    if (channels.includes('in-app')) {
      try {
        await prisma.notification.create({
          data: {
            userId,
            title,
            content,
            type,
          },
        });
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
  }
  
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return { items, total };
  }
}
