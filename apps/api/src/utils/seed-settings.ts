import { prisma } from '@subcare/database';

interface SettingSeed {
  key: string;
  value: string;
  type: string;
  group: string;
  label: string;
}

const DEFAULT_SETTINGS: SettingSeed[] = [
  // ===== General =====
  {
    key: 'site.name',
    value: 'SubCare',
    type: 'string',
    group: 'general',
    label: '站点名称',
  },
  {
    key: 'site.description',
    value: '智能订阅管理平台',
    type: 'string',
    group: 'general',
    label: '站点描述',
  },
  {
    key: 'site.defaultCurrency',
    value: 'CNY',
    type: 'string',
    group: 'general',
    label: '默认货币',
  },

  // ===== Security =====
  {
    key: 'security.registrationEnabled',
    value: 'true',
    type: 'boolean',
    group: 'security',
    label: '开放注册',
  },
  {
    key: 'security.maxLoginAttempts',
    value: '5',
    type: 'number',
    group: 'security',
    label: '最大登录尝试次数',
  },
  {
    key: 'security.sessionTimeoutMinutes',
    value: '1440',
    type: 'number',
    group: 'security',
    label: '会话超时（分钟）',
  },
  {
    key: 'security.requireEmailVerification',
    value: 'false',
    type: 'boolean',
    group: 'security',
    label: '注册需要邮箱验证',
  },

  // ===== AI =====
  {
    key: 'ai.defaultModel',
    value: '',
    type: 'string',
    group: 'ai',
    label: 'AI 默认模型（留空使用系统推荐）',
  },
  {
    key: 'ai.modelSyncEnabled',
    value: 'true',
    type: 'boolean',
    group: 'ai',
    label: 'AI 模型自动同步',
  },
  {
    key: 'ai.modelSyncCron',
    value: '0 3 * * 1',
    type: 'string',
    group: 'ai',
    label: 'AI 模型同步 Cron 表达式',
  },
  {
    key: 'ai.maxConversationsPerUser',
    value: '50',
    type: 'number',
    group: 'ai',
    label: '每用户最大会话数',
  },
  {
    key: 'ai.maxMessagesPerConversation',
    value: '200',
    type: 'number',
    group: 'ai',
    label: '每会话最大消息数',
  },

  // ===== Notification =====
  {
    key: 'notification.emailEnabled',
    value: 'true',
    type: 'boolean',
    group: 'notification',
    label: '邮件通知功能',
  },
  {
    key: 'notification.renewalReminderDays',
    value: '3',
    type: 'number',
    group: 'notification',
    label: '续费提前提醒天数',
  },
  {
    key: 'notification.cleanupRetentionDays',
    value: '90',
    type: 'number',
    group: 'notification',
    label: '通知保留天数',
  },

  // ===== Exchange Rate =====
  {
    key: 'exchangeRate.syncEnabled',
    value: 'true',
    type: 'boolean',
    group: 'general',
    label: '汇率自动同步',
  },
  {
    key: 'exchangeRate.syncCron',
    value: '0 1 * * *',
    type: 'string',
    group: 'general',
    label: '汇率同步 Cron 表达式',
  },
];

/**
 * Seed default system settings into the database.
 * Only creates settings that don't already exist (won't overwrite user changes).
 */
export async function seedSystemSettings() {
  let created = 0;
  let skipped = 0;

  for (const seed of DEFAULT_SETTINGS) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: seed.key },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.systemSetting.create({
      data: {
        key: seed.key,
        value: seed.value,
        type: seed.type,
        group: seed.group,
        label: seed.label,
      },
    });
    created++;
  }

  if (created > 0) {
    console.log(`[SeedSettings] Created ${created} default settings, skipped ${skipped} existing.`);
  }
}
