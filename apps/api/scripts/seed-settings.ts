/**
 * System Settings Seed Script
 *
 * 将默认系统设置导入数据库
 *
 * Usage:
 *   cd apps/api
 *   pnpm seed:settings
 *
 * Options:
 *   --clean     清空现有设置后重新导入
 *   --dry-run   仅显示将要执行的操作，不实际修改数据库
 */

import '../src/setup-env';
import { prisma } from '@subcare/database';

// Parse command line arguments
const args = process.argv.slice(2);
const cleanMode = args.includes('--clean');
const dryRun = args.includes('--dry-run');

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
];

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║        System Settings Seed - 导入系统默认设置                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - 仅显示将要执行的操作\n');
  }

  console.log(`📦 设置项数量: ${DEFAULT_SETTINGS.length}\n`);

  // Group summary
  const groupCounts: Record<string, number> = {};
  for (const s of DEFAULT_SETTINGS) {
    groupCounts[s.group] = (groupCounts[s.group] || 0) + 1;
  }
  console.log('📂 分组概览:');
  for (const [group, count] of Object.entries(groupCounts)) {
    console.log(`   ${group}: ${count} 项`);
  }
  console.log();

  // Clean mode: clear existing data
  if (cleanMode) {
    console.log('🧹 Clean Mode: 清空现有设置...\n');

    if (!dryRun) {
      const deleted = await prisma.systemSetting.deleteMany({});
      console.log(`   ✓ 已清空 system_settings (${deleted.count} 条)`);
    } else {
      console.log('   [DRY RUN] 将清空 system_settings');
    }
    console.log();
  }

  // Process settings
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const seed of DEFAULT_SETTINGS) {
    if (dryRun) {
      console.log(`   [DRY RUN] 将 upsert: ${seed.key} = "${seed.value}" (${seed.type})`);
      continue;
    }

    try {
      const existing = await prisma.systemSetting.findUnique({
        where: { key: seed.key },
      });

      if (existing && !cleanMode) {
        // In non-clean mode, don't overwrite existing values
        skipped++;
        console.log(`   ⏭ 跳过 (已存在): ${seed.key} = "${existing.value}"`);
      } else {
        // Create or update (in clean mode, always upsert)
        await prisma.systemSetting.upsert({
          where: { key: seed.key },
          update: {
            value: seed.value,
            type: seed.type,
            group: seed.group,
            label: seed.label,
          },
          create: {
            key: seed.key,
            value: seed.value,
            type: seed.type,
            group: seed.group,
            label: seed.label,
          },
        });

        if (existing) {
          updated++;
          console.log(`   ✓ 已更新: ${seed.key} = "${seed.value}"`);
        } else {
          created++;
          console.log(`   ✓ 已创建: ${seed.key} = "${seed.value}"`);
        }
      }
    } catch (error: any) {
      console.error(`   ✗ 失败: ${seed.key} - ${error.message}`);
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 执行摘要:');
  console.log(`   新增: ${created}`);
  console.log(`   更新: ${updated}`);
  console.log(`   跳过: ${skipped}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN 完成 - 未修改任何数据');
  } else {
    console.log('\n✅ 同步完成!');
  }
}

main()
  .catch((error) => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
