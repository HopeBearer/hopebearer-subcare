import { prisma } from '@subcare/database';
import { logger } from '../../infrastructure/logger/logger';
import { ALL_NOTIFICATION_KEYS, NOTIFICATION_CATEGORIES } from './notification.constants';

export interface UpdateNotificationSettingDTO {
  key: string;
  email?: boolean;
  inApp?: boolean;
}

export class NotificationSettingService {
  /**
   * Get user notification settings
   * Returns a merged view of all known categories/events and user preferences
   */
  async getSettings(userId: string) {
    const settings = await prisma.notificationSetting.findMany({
      where: { userId },
    });

    // Merge existing settings with all known keys
    return ALL_NOTIFICATION_KEYS.map(key => {
      const existing = settings.find(s => s.key === key);
      return {
        key,
        email: existing ? existing.email : true, // Default ON
        inApp: existing ? existing.inApp : true, // Default ON
      };
    });
  }

  /**
   * Update a specific notification setting
   */
  async updateSetting(userId: string, data: UpdateNotificationSettingDTO) {
    const { key, email, inApp } = data;

    // Validate key
    if (!ALL_NOTIFICATION_KEYS.includes(key)) {
      throw new Error(`Invalid notification key: ${key}`);
    }

    // Upsert logic
    const setting = await prisma.notificationSetting.upsert({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      update: {
        ...(email !== undefined && { email }),
        ...(inApp !== undefined && { inApp }),
      },
      create: {
        userId,
        key,
        email: email ?? true,
        inApp: inApp ?? true,
      },
    });

    logger.info({
      domain: 'NOTIFICATION',
      action: 'update_setting',
      userId,
      metadata: { key, email, inApp }
    });

    return setting;
  }

  /**
   * Update a category and all its children (Smart Logic)
   * @param userId 
   * @param category 
   * @param enabled 
   * @param channel Optional channel to target specific toggle
   */
  async updateCategory(userId: string, category: string, enabled: boolean, channel?: 'email' | 'inApp') {
     // Validate category
     if (!Object.values(NOTIFICATION_CATEGORIES).includes(category as any)) {
        throw new Error(`Invalid notification category: ${category}`);
     }

     return prisma.$transaction(async (tx) => {
        const dataToUpdate: any = {};
        if (channel) {
            dataToUpdate[channel] = enabled;
        } else {
            dataToUpdate.email = enabled;
            dataToUpdate.inApp = enabled;
        }

        // 1. Update/Create the Parent Category Setting
        await tx.notificationSetting.upsert({
            where: { userId_key: { userId, key: category } },
            update: dataToUpdate,
            create: { 
                userId, 
                key: category, 
                email: channel === 'email' ? enabled : true, 
                inApp: channel === 'inApp' ? enabled : true 
            }
        });

        // 2. Cascade Logic (Updated):
        // If enabling (true): We don't force children to true if they were explicitly false?
        // Actually, user wants "Master Switch". Master Switch ON = All ON. Master Switch OFF = All OFF.
        // But we should only update the specific channel column on children rows.
        await tx.notificationSetting.updateMany({
            where: {
                userId,
                key: { startsWith: `${category}.` }
            },
            data: dataToUpdate
        });
     });
  }

  /**
   * Check if a specific channel is enabled for a key (Hierarchical)
   * Optimized for internal use
   */
  async isChannelEnabled(userId: string, key: string, channel: 'email' | 'inApp'): Promise<boolean> {
    // Security notifications are always enabled
    if (key.startsWith('security') || key === 'security') return true;

    const parentKey = key.includes('.') ? key.split('.')[0] : key;
    const keysToCheck = [key];
    if (parentKey !== key) {
        keysToCheck.push(parentKey);
    }

    const settings = await prisma.notificationSetting.findMany({
      where: {
        userId,
        key: { in: keysToCheck },
      },
    });

    const specificSetting = settings.find(s => s.key === key);
    const parentSetting = settings.find(s => s.key === parentKey);

    // 1. Specific Setting Priority
    if (specificSetting) {
        return channel === 'email' ? specificSetting.email : specificSetting.inApp;
    }

    // 2. Parent Setting Inheritance
    if (parentSetting) {
        return channel === 'email' ? parentSetting.email : parentSetting.inApp;
    }

    // 3. Default True
    return true;
  }
}
