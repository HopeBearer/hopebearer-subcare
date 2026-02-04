/**
 * AI Providers Seed Script
 * 
 * 从 config/ai-providers.json 读取厂商和模型配置，同步到数据库
 * 
 * Usage:
 *   cd apps/api
 *   pnpm seed:ai-providers
 * 
 * Options:
 *   --clean     清空现有数据后重新导入
 *   --dry-run   仅显示将要执行的操作，不实际修改数据库
 */

import '../src/setup-env';
import { prisma } from '@subcare/database';
import * as fs from 'fs';
import * as path from 'path';

// Type definitions matching the JSON schema
interface ModelConfig {
  modelId: string;
  name: string;
  description?: string;
  contextLength?: number;
  maxTokens?: number;
  inputModalities?: string[];
  outputModalities?: string[];
  pricingPrompt?: string;
  pricingCompletion?: string;
  supportedParams?: string[];
  isFree?: boolean;
}

interface ProviderConfig {
  name: string;
  slug: string;
  baseUrl: string;
  modelsUrl?: string;
  logoUrl?: string;
  website?: string;
  description?: string;
  modelFetchStrategy: 'DYNAMIC' | 'PUBLIC' | 'MANUAL';
  apiFormat: 'OPENAI' | 'ANTHROPIC' | 'CUSTOM';
  isBuiltIn?: boolean;
  sortOrder?: number;
  models?: ModelConfig[];
}

interface ProvidersConfig {
  version: string;
  description?: string;
  providers: ProviderConfig[];
}

// Parse command line arguments
const args = process.argv.slice(2);
const cleanMode = args.includes('--clean');
const dryRun = args.includes('--dry-run');

// Type assertion for Prisma models (will be properly typed after prisma generate)
const db: any = prisma;

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     AI Providers Seed - 从配置文件同步厂商和模型数据           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - 仅显示将要执行的操作\n');
  }

  // Load configuration
  const configPath = path.join(__dirname, '../config/ai-providers.json');
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ 配置文件不存在: ${configPath}`);
    process.exit(1);
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: ProvidersConfig = JSON.parse(configContent);

  console.log(`📄 配置文件版本: ${config.version}`);
  console.log(`📦 厂商数量: ${config.providers.length}\n`);

  // Clean mode: clear existing data
  if (cleanMode) {
    console.log('🧹 Clean Mode: 清空现有数据...\n');
    
    if (!dryRun) {
      // Delete in correct order due to foreign keys
      await db.userAIConfig.deleteMany({});
      console.log('   ✓ 已清空 user_ai_configs');
      
      await db.aIModel.deleteMany({});
      console.log('   ✓ 已清空 ai_models');
      
      await db.aIProvider.deleteMany({});
      console.log('   ✓ 已清空 ai_providers');
    } else {
      console.log('   [DRY RUN] 将清空 user_ai_configs, ai_models, ai_providers');
    }
    console.log();
  }

  // Process providers
  let providersCreated = 0;
  let providersUpdated = 0;
  let modelsCreated = 0;
  let modelsUpdated = 0;

  for (const providerConfig of config.providers) {
    console.log(`📦 处理厂商: ${providerConfig.name} (${providerConfig.slug})`);
    console.log(`   策略: ${providerConfig.modelFetchStrategy}, 格式: ${providerConfig.apiFormat}`);

    if (!dryRun) {
      // Check if provider exists
      const existing = await db.aIProvider.findUnique({
        where: { slug: providerConfig.slug }
      });

      // Upsert provider
      const provider = await db.aIProvider.upsert({
        where: { slug: providerConfig.slug },
        update: {
          name: providerConfig.name,
          baseUrl: providerConfig.baseUrl,
          modelsUrl: providerConfig.modelsUrl,
          logoUrl: providerConfig.logoUrl,
          website: providerConfig.website,
          description: providerConfig.description,
          modelFetchStrategy: providerConfig.modelFetchStrategy,
          apiFormat: providerConfig.apiFormat,
          isBuiltIn: providerConfig.isBuiltIn ?? false,
          sortOrder: providerConfig.sortOrder ?? 0,
          updatedAt: new Date()
        },
        create: {
          name: providerConfig.name,
          slug: providerConfig.slug,
          baseUrl: providerConfig.baseUrl,
          modelsUrl: providerConfig.modelsUrl,
          logoUrl: providerConfig.logoUrl,
          website: providerConfig.website,
          description: providerConfig.description,
          modelFetchStrategy: providerConfig.modelFetchStrategy,
          apiFormat: providerConfig.apiFormat,
          isBuiltIn: providerConfig.isBuiltIn ?? false,
          sortOrder: providerConfig.sortOrder ?? 0
        }
      });

      if (existing) {
        providersUpdated++;
        console.log(`   ✓ 已更新厂商`);
      } else {
        providersCreated++;
        console.log(`   ✓ 已创建厂商`);
      }

      // Process models for this provider
      if (providerConfig.models && providerConfig.models.length > 0) {
        console.log(`   📚 处理 ${providerConfig.models.length} 个模型...`);

        for (const modelConfig of providerConfig.models) {
          // Check if model exists using findFirst (compatible with soft delete extension)
          const existingModel = await db.aIModel.findFirst({
            where: {
              providerId: provider.id,
              modelId: modelConfig.modelId
            }
          });

          if (existingModel) {
            // Update existing model
            await db.aIModel.update({
              where: { id: existingModel.id },
              data: {
                name: modelConfig.name,
                description: modelConfig.description,
                contextLength: modelConfig.contextLength,
                maxTokens: modelConfig.maxTokens,
                inputModalities: modelConfig.inputModalities,
                outputModalities: modelConfig.outputModalities,
                pricingPrompt: modelConfig.pricingPrompt,
                pricingCompletion: modelConfig.pricingCompletion,
                supportedParams: modelConfig.supportedParams,
                isFree: modelConfig.isFree ?? false,
                source: 'MANUAL',
                isActive: true,
                updatedAt: new Date()
              }
            });
            modelsUpdated++;
          } else {
            // Create new model
            await db.aIModel.create({
              data: {
                providerId: provider.id,
                modelId: modelConfig.modelId,
                name: modelConfig.name,
                description: modelConfig.description,
                contextLength: modelConfig.contextLength,
                maxTokens: modelConfig.maxTokens,
                inputModalities: modelConfig.inputModalities,
                outputModalities: modelConfig.outputModalities,
                pricingPrompt: modelConfig.pricingPrompt,
                pricingCompletion: modelConfig.pricingCompletion,
                supportedParams: modelConfig.supportedParams,
                isFree: modelConfig.isFree ?? false,
                source: 'MANUAL',
                isActive: true
              }
            });
            modelsCreated++;
          }
        }
        console.log(`   ✓ 模型处理完成`);
      }
    } else {
      console.log(`   [DRY RUN] 将 upsert 厂商`);
      if (providerConfig.models && providerConfig.models.length > 0) {
        console.log(`   [DRY RUN] 将 upsert ${providerConfig.models.length} 个模型`);
      }
    }
    console.log();
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 执行摘要:');
  console.log(`   厂商: 新增 ${providersCreated}, 更新 ${providersUpdated}`);
  console.log(`   模型: 新增 ${modelsCreated}, 更新 ${modelsUpdated}`);
  
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
