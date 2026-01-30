import { prisma } from '@subcare/database';
import { logger } from '../../infrastructure/logger/logger';

export interface UpdateNotificationSettingDTO {
  type: string;
  email?: boolean;
  inApp?: boolean;
}

export class NotificationSettingService {
  /**
   * Get user notification settings
   * Returns default settings if none exist
   */
  async getSettings(userId: string) {
    const settings = await prisma.notificationSetting.findMany({
      where: { userId },
    });

    // Define default types we want to control
    const defaultTypes = ['billing', 'system'];
    
    // Merge existing settings with defaults
    return defaultTypes.map(type => {
      const existing = settings.find(s => s.type === type);
      return {
        type,
        email: existing ? existing.email : true, // Default ON
        inApp: existing ? existing.inApp : true, // Default ON
      };
    });
  }

  /**
   * Update a specific notification setting
   */
  async updateSetting(userId: string, data: UpdateNotificationSettingDTO) {
    const { type, email, inApp } = data;

    // Validate type
    if (!['billing', 'system'].includes(type)) {
      throw new Error('Invalid notification type');
    }

    // Upsert logic: create if not exists, update if exists
    const setting = await prisma.notificationSetting.upsert({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
      update: {
        ...(email !== undefined && { email }),
        ...(inApp !== undefined && { inApp }),
      },
      create: {
        userId,
        type,
        email: email ?? true,
        inApp: inApp ?? true,
      },
    });

    logger.info({
      domain: 'NOTIFICATION',
      action: 'update_setting',
      userId,
      metadata: { type, email, inApp }
    });

    return setting;
  }

  /**
   * Check if a specific channel is enabled for a type
   * Optimized for internal use
   */
  async isChannelEnabled(userId: string, type: string, channel: 'email' | 'inApp'): Promise<boolean> {
    // Security notifications are always enabled
    if (type === 'security') return true;

    // Use findFirst instead of findUnique to avoid middleware issues with compound keys + deletedAt
    const setting = await prisma.notificationSetting.findFirst({
      where: {
        userId,
        type,
      },
    });

    // If no setting found, default is TRUE
    if (!setting) return true;

    return channel === 'email' ? setting.email : setting.inApp;
  }
}
