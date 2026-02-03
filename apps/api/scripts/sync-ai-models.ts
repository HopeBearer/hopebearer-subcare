/**
 * AI Models Sync Script
 * 
 * 从 OpenRouter API 获取所有厂商和模型数据，自动解析并存入数据库
 * 
 * Usage:
 *   cd apps/api
 *   pnpm sync:ai-models
 */

import '../src/setup-env';
import { prisma } from '@subcare/database';
import axios from 'axios';

// Type assertion for new models
const db: any = prisma;

// OpenRouter API response type
interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  supported_parameters?: string[];
}

// 厂商名称映射（slug -> 显示名称和官网）
const PROVIDER_INFO: Record<string, { name: string; website?: string; description?: string }> = {
  'openai': { name: 'OpenAI', website: 'https://openai.com', description: 'GPT 系列模型，ChatGPT 背后的公司' },
  'anthropic': { name: 'Anthropic', website: 'https://anthropic.com', description: 'Claude 系列模型，安全可靠的 AI 助手' },
  'google': { name: 'Google', website: 'https://ai.google', description: 'Gemini 系列模型' },
  'meta-llama': { name: 'Meta Llama', website: 'https://llama.meta.com', description: 'Llama 开源大模型系列' },
  'mistralai': { name: 'Mistral AI', website: 'https://mistral.ai', description: '欧洲领先的 AI 公司' },
  'deepseek': { name: 'DeepSeek', website: 'https://deepseek.com', description: '深度求索，高性价比模型' },
  'qwen': { name: '通义千问 (Qwen)', website: 'https://tongyi.aliyun.com', description: '阿里云大模型' },
  'microsoft': { name: 'Microsoft', website: 'https://azure.microsoft.com/ai', description: '微软 AI 模型' },
  'cohere': { name: 'Cohere', website: 'https://cohere.com', description: '企业级 AI 模型' },
  'perplexity': { name: 'Perplexity', website: 'https://perplexity.ai', description: 'AI 搜索引擎' },
  'nvidia': { name: 'NVIDIA', website: 'https://nvidia.com', description: 'NVIDIA AI 模型' },
  'x-ai': { name: 'xAI', website: 'https://x.ai', description: 'Elon Musk 的 AI 公司，Grok 模型' },
  'amazon': { name: 'Amazon', website: 'https://aws.amazon.com/bedrock', description: 'Amazon Bedrock 模型' },
  'ai21': { name: 'AI21 Labs', website: 'https://ai21.com', description: 'Jamba 系列模型' },
  'databricks': { name: 'Databricks', website: 'https://databricks.com', description: 'DBRX 模型' },
  'inflection': { name: 'Inflection', website: 'https://inflection.ai', description: 'Pi AI 助手' },
  'nous': { name: 'Nous Research', website: 'https://nousresearch.com', description: '开源模型研究' },
  'nousresearch': { name: 'Nous Research', website: 'https://nousresearch.com', description: '开源模型研究' },
  'openchat': { name: 'OpenChat', website: 'https://openchat.team', description: '开源聊天模型' },
  'teknium': { name: 'Teknium', website: 'https://github.com/teknium1', description: '开源模型微调' },
  'phind': { name: 'Phind', website: 'https://phind.com', description: '代码专用模型' },
  'cognitivecomputations': { name: 'Cognitive Computations', website: 'https://erichartford.com', description: 'Dolphin 系列模型' },
  'huggingface': { name: 'Hugging Face', website: 'https://huggingface.co', description: 'AI 社区平台' },
  'moonshotai': { name: '月之暗面 (Moonshot)', website: 'https://moonshot.cn', description: 'Kimi 智能助手' },
  'zhipu': { name: '智谱 AI', website: 'https://zhipuai.cn', description: 'GLM 系列模型' },
  '01-ai': { name: '零一万物 (Yi)', website: 'https://01.ai', description: 'Yi 系列模型' },
  'baichuan': { name: '百川智能', website: 'https://baichuan-ai.com', description: '百川大模型' },
  'minimax': { name: 'MiniMax', website: 'https://minimaxi.com', description: 'MiniMax 大模型' },
  'stepfun': { name: '阶跃星辰 (StepFun)', website: 'https://stepfun.com', description: 'Step 系列模型' },
  'together': { name: 'Together AI', website: 'https://together.ai', description: '开源模型托管平台' },
  'fireworks': { name: 'Fireworks AI', website: 'https://fireworks.ai', description: '高速模型推理' },
  'groq': { name: 'Groq', website: 'https://groq.com', description: '超快推理芯片' },
  'lepton': { name: 'Lepton AI', website: 'https://lepton.ai', description: 'AI 基础设施' },
  'avian': { name: 'Avian', website: 'https://avian.io', description: 'AI 数据分析' },
  'lynn': { name: 'Lynn', description: '社区模型' },
  'gryphe': { name: 'Gryphe', description: 'MythoMax 等模型' },
  'undi95': { name: 'Undi95', description: '社区模型微调' },
  'mancer': { name: 'Mancer', description: '角色扮演模型' },
  'sao10k': { name: 'Sao10k', description: '社区模型' },
  'neversleep': { name: 'NeverSleep', description: '社区模型' },
  'thedrummer': { name: 'TheDrummer', description: '社区模型' },
  'openrouter': { name: 'OpenRouter', website: 'https://openrouter.ai', description: '模型路由聚合平台' },
  'liquid': { name: 'Liquid AI', website: 'https://liquid.ai', description: 'LFM 系列模型' },
  'arcee-ai': { name: 'Arcee AI', website: 'https://arcee.ai', description: 'Trinity 系列模型' },
  'upstage': { name: 'Upstage', website: 'https://upstage.ai', description: 'Solar 系列模型' },
  'writer': { name: 'Writer', website: 'https://writer.com', description: 'Palmyra 系列模型' },
  'aetherwiing': { name: 'AetherWiing', description: '社区模型' },
  'eva-unit-01': { name: 'Eva Unit 01', description: '社区模型' },
  'all-hands': { name: 'All Hands AI', description: 'OpenHands 模型' },
};

async function main(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     AI Models Sync - 从 OpenRouter 获取所有厂商和模型     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    // Step 1: 获取 OpenRouter 模型列表
    console.log('\n🔄 正在从 OpenRouter API 获取模型列表...\n');
    
    const response = await axios.get<{ data: OpenRouterModel[] }>(
      'https://openrouter.ai/api/v1/models',
      { timeout: 60000 }
    );

    const models = response.data.data;
    console.log(`  📊 获取到 ${models.length} 个模型\n`);

    // Step 2: 解析厂商
    const providerModels = new Map<string, OpenRouterModel[]>();
    
    for (const model of models) {
      // 解析厂商 slug（模型 ID 格式：provider/model-name）
      const parts = model.id.split('/');
      const providerSlug = parts[0].toLowerCase();
      
      if (!providerModels.has(providerSlug)) {
        providerModels.set(providerSlug, []);
      }
      providerModels.get(providerSlug)!.push(model);
    }

    console.log(`  🏢 解析出 ${providerModels.size} 个厂商\n`);

    // Step 3: 创建厂商和模型
    console.log('📦 正在同步厂商和模型...\n');
    
    let totalProviders = 0;
    let totalModels = 0;
    let totalFree = 0;
    let sortOrder = 1;

    for (const [providerSlug, providerModelList] of providerModels) {
      // 获取厂商信息
      const info = PROVIDER_INFO[providerSlug] || { name: providerSlug };
      
      // 创建或更新厂商
      let provider = await db.aIProvider.findFirst({
        where: { slug: providerSlug }
      });

      if (!provider) {
        provider = await db.aIProvider.create({
          data: {
            slug: providerSlug,
            name: info.name,
            baseUrl: `https://openrouter.ai/api/v1`, // 通过 OpenRouter 访问
            website: info.website,
            description: info.description,
            isBuiltIn: true,
            isActive: true,
            sortOrder: sortOrder++
          }
        });
        totalProviders++;
      }

      // 添加模型
      let addedModels = 0;
      let freeModels = 0;

      for (const model of providerModelList) {
        const isFree = model.pricing?.prompt === '0' && model.pricing?.completion === '0';
        
        // 检查模型是否已存在
        const existing = await db.aIModel.findFirst({
          where: { providerId: provider.id, modelId: model.id }
        });

        if (existing) {
          // 更新
          await db.aIModel.update({
            where: { id: existing.id },
            data: {
              name: model.name,
              description: model.description,
              contextLength: model.context_length,
              maxTokens: model.top_provider?.max_completion_tokens,
              inputModalities: model.architecture?.input_modalities,
              outputModalities: model.architecture?.output_modalities,
              pricingPrompt: model.pricing?.prompt,
              pricingCompletion: model.pricing?.completion,
              supportedParams: model.supported_parameters,
              isFree,
              isActive: true,
              rawData: model,
              updatedAt: new Date()
            }
          });
        } else {
          // 创建
          await db.aIModel.create({
            data: {
              providerId: provider.id,
              modelId: model.id,
              name: model.name,
              description: model.description,
              contextLength: model.context_length,
              maxTokens: model.top_provider?.max_completion_tokens,
              inputModalities: model.architecture?.input_modalities,
              outputModalities: model.architecture?.output_modalities,
              pricingPrompt: model.pricing?.prompt,
              pricingCompletion: model.pricing?.completion,
              pricingCurrency: 'USD',
              supportedParams: model.supported_parameters,
              isFree,
              isActive: true,
              rawData: model
            }
          });
          addedModels++;
        }

        if (isFree) freeModels++;
      }

      totalModels += providerModelList.length;
      totalFree += freeModels;

      const freeLabel = freeModels > 0 ? ` (${freeModels} 免费)` : '';
      console.log(`  ✅ ${info.name}: ${providerModelList.length} 个模型${freeLabel}`);
    }

    // Step 4: 打印汇总
    console.log('\n' + '═'.repeat(50));
    console.log('📊 同步完成汇总:');
    console.log('═'.repeat(50));
    console.log(`  🏢 厂商总数: ${providerModels.size}`);
    console.log(`  🤖 模型总数: ${totalModels}`);
    console.log(`  🆓 免费模型: ${totalFree}`);
    console.log('═'.repeat(50));

    console.log('\n✅ 同步完成！\n');

  } catch (error) {
    console.error('\n❌ 同步失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
