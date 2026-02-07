/**
 * System Categories Seed Script
 * 
 * 初始化系统默认分类到数据库
 * 
 * Usage:
 *   cd apps/api
 *   pnpm seed:categories
 * 
 * Options:
 *   --clean     清空现有系统分类后重新导入
 *   --dry-run   仅显示将要执行的操作，不实际修改数据库
 */

import '../src/setup-env';
import { prisma } from '@subcare/database';

// Parse command line arguments
const args = process.argv.slice(2);
const cleanMode = args.includes('--clean');
const dryRun = args.includes('--dry-run');

// 系统默认分类
const defaultCategories = [
  { name: 'Entertainment', icon: '🎬', color: '#A5A6F6', description: '娱乐类订阅' },
  { name: 'Streaming', icon: '📺', color: '#E879F9', description: '流媒体服务（视频/音乐）' },
  { name: 'Tools', icon: '🔧', color: '#FCD34D', description: '工具类软件' },
  { name: 'Productivity', icon: '📊', color: '#34D399', description: '生产力工具' },
  { name: 'Cloud', icon: '☁️', color: '#60A5FA', description: '云存储/云服务' },
  { name: 'Utility', icon: '⚡', color: '#F87171', description: '实用工具' },
  { name: 'Education', icon: '📚', color: '#818CF8', description: '教育学习' },
  { name: 'Social', icon: '💬', color: '#FB923C', description: '社交通讯' },
  { name: 'Developer', icon: '💻', color: '#22D3EE', description: '开发工具' },
  { name: 'AI', icon: '🤖', color: '#A78BFA', description: 'AI/人工智能服务' },
  { name: 'Security', icon: '🛡️', color: '#F472B6', description: '安全/VPN' },
  { name: 'Gaming', icon: '🎮', color: '#4ADE80', description: '游戏相关' },
  { name: 'Fitness', icon: '💪', color: '#FB7185', description: '健身运动' },
  { name: 'News', icon: '📰', color: '#94A3B8', description: '新闻资讯' },
  { name: 'Reading', icon: '📖', color: '#FBBF24', description: '阅读/电子书' },
  { name: 'Hosting', icon: '🌐', color: '#38BDF8', description: '域名/托管' },
  { name: 'Music', icon: '🎵', color: '#C084FC', description: '音乐服务' },
  { name: 'Communication', icon: '📞', color: '#2DD4BF', description: '通讯协作' },
  { name: 'Other', icon: '📦', color: '#9CA3AF', description: '其他' },
];

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     System Categories Seed - 初始化系统默认分类                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - 仅显示将要执行的操作\n');
  }

  console.log(`📦 分类数量: ${defaultCategories.length}\n`);

  // Clean mode: clear existing system categories
  if (cleanMode) {
    console.log('🧹 Clean Mode: 清空现有系统分类...\n');
    
    if (!dryRun) {
      // 只删除系统分类（userId 为 null）
      await prisma.category.deleteMany({
        where: { userId: null }
      });
      console.log('   ✓ 已清空系统分类');
    } else {
      console.log('   [DRY RUN] 将清空系统分类');
    }
    console.log();
  }

  // Process categories
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const category of defaultCategories) {
    const { name, icon, color, description } = category;

    if (dryRun) {
      console.log(`   [DRY RUN] 将 upsert: ${name}`);
      continue;
    }

    try {
      // Check if exists (system category with same name)
      const existing = await prisma.category.findFirst({
        where: {
          name,
          userId: null,
          deletedAt: null
        }
      });

      if (existing) {
        // Update existing
        await prisma.category.update({
          where: { id: existing.id },
          data: { icon, color }
        });
        updated++;
        console.log(`   ✓ 已更新: ${icon} ${name}`);
      } else {
        // Create new
        await prisma.category.create({
          data: {
            name,
            icon,
            color,
            // userId is null for system categories
          }
        });
        created++;
        console.log(`   ✓ 已创建: ${icon} ${name}`);
      }
    } catch (error: any) {
      console.error(`   ✗ 失败: ${name} - ${error.message}`);
      skipped++;
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
