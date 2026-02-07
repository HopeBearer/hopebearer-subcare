/**
 * Embedding 生成脚本
 * 
 * 为所有订阅模板生成向量并缓存到文件
 * 
 * Usage:
 *   cd apps/api
 *   pnpm generate:embeddings
 * 
 * Options:
 *   --force     强制重新生成所有向量（忽略缓存）
 *   --dry-run   仅显示将要执行的操作
 * 
 * 环境变量:
 *   OPENAI_API_KEY  - OpenAI API Key（必需）
 *   OPENAI_BASE_URL - 自定义 API 地址（可选）
 */

import '../src/setup-env';
import { prisma } from '@subcare/database';
import * as fs from 'fs';
import * as path from 'path';
import { EmbeddingService } from '../src/infrastructure/vector/embedding.service';

// Parse command line arguments
const args = process.argv.slice(2);
const forceMode = args.includes('--force');
const dryRun = args.includes('--dry-run');

// 缓存文件路径
const CACHE_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'embeddings-cache.json');

interface EmbeddingsCache {
  version: string;
  model: string;
  dimension: number;
  generatedAt: string;
  embeddings: Record<string, number[]>;
}

async function loadCache(): Promise<EmbeddingsCache | null> {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }
    const content = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function saveCache(cache: EmbeddingsCache): Promise<void> {
  // 确保目录存在
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Embeddings Generator - 生成订阅模板向量                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  // 检查 API Key
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL;

  if (!apiKey) {
    console.error('❌ 错误: 未设置 OPENAI_API_KEY 环境变量');
    console.log('\n请在 .env 文件中添加:');
    console.log('  OPENAI_API_KEY=your-api-key-here');
    process.exit(1);
  }

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - 仅显示将要执行的操作\n');
  }

  // 初始化 Embedding 服务
  const embeddingService = new EmbeddingService({
    apiKey,
    baseUrl: baseUrl || undefined,
    model: 'text-embedding-3-small',
  });

  console.log(`📍 API Base URL: ${baseUrl || 'https://api.openai.com/v1'}`);
  console.log(`📊 Embedding Model: text-embedding-3-small`);
  console.log(`📐 Dimension: ${embeddingService.getDimension()}`);
  console.log();

  // 加载现有缓存
  let cache = await loadCache();
  const existingEmbeddings = (!forceMode && cache?.embeddings) ? cache.embeddings : {};

  if (forceMode) {
    console.log('🔄 Force Mode: 忽略现有缓存，重新生成所有向量\n');
  } else if (cache) {
    console.log(`📂 发现缓存文件 (${Object.keys(existingEmbeddings).length} 个向量)`);
    console.log(`   生成时间: ${cache.generatedAt}\n`);
  }

  // 从数据库加载模板
  const templates = await prisma.subscriptionTemplate.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      displayName: true,
      searchText: true,
    },
  });

  console.log(`📦 数据库中共 ${templates.length} 个模板\n`);

  // 确定需要生成的模板
  const toGenerate = templates.filter(t => !existingEmbeddings[t.id]);
  const alreadyCached = templates.length - toGenerate.length;

  console.log(`✅ 已缓存: ${alreadyCached}`);
  console.log(`🔄 待生成: ${toGenerate.length}`);
  console.log();

  if (toGenerate.length === 0) {
    console.log('✅ 所有模板已有缓存，无需生成');
    return;
  }

  if (dryRun) {
    console.log('📝 将生成以下模板的向量:');
    toGenerate.forEach(t => console.log(`   - ${t.name} (${t.id.substring(0, 8)}...)`));
    console.log('\n⚠️  DRY RUN 完成 - 未生成任何向量');
    return;
  }

  // 批量生成向量
  console.log('🚀 开始生成向量...\n');

  const BATCH_SIZE = 20;
  let generated = 0;
  let failed = 0;

  for (let i = 0; i < toGenerate.length; i += BATCH_SIZE) {
    const batch = toGenerate.slice(i, i + BATCH_SIZE);
    const texts = batch.map(t => `${t.name} ${t.displayName || ''} ${t.searchText}`);

    try {
      console.log(`   处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toGenerate.length / BATCH_SIZE)}...`);
      
      const embeddings = await embeddingService.batchGenerateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        existingEmbeddings[batch[j].id] = embeddings[j];
        generated++;
      }

      // 每批次后保存缓存（防止中途失败丢失数据）
      const newCache: EmbeddingsCache = {
        version: '1.0',
        model: 'text-embedding-3-small',
        dimension: embeddingService.getDimension(),
        generatedAt: new Date().toISOString(),
        embeddings: existingEmbeddings,
      };
      await saveCache(newCache);

    } catch (error: any) {
      console.error(`   ✗ 批次失败: ${error.message}`);
      failed += batch.length;
    }

    // 速率限制：批次间等待
    if (i + BATCH_SIZE < toGenerate.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 最终缓存
  const finalCache: EmbeddingsCache = {
    version: '1.0',
    model: 'text-embedding-3-small',
    dimension: embeddingService.getDimension(),
    generatedAt: new Date().toISOString(),
    embeddings: existingEmbeddings,
  };
  await saveCache(finalCache);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 执行摘要:');
  console.log(`   成功生成: ${generated}`);
  console.log(`   失败: ${failed}`);
  console.log(`   总缓存: ${Object.keys(existingEmbeddings).length}`);
  console.log(`   缓存文件: ${CACHE_FILE}`);
  console.log('\n✅ 完成!');
}

main()
  .catch((error) => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
