/**
 * Vector Services - 向量搜索相关服务导出
 */

export * from './vector-service.interface';
export * from './embedding.service';
export * from './local-embedding.service';
export * from './memory-vector.service';
export * from './keyword-search.service';

import { IVectorService } from './vector-service.interface';
import { memoryVectorService, EmbeddingMode } from './memory-vector.service';
import { keywordSearchService } from './keyword-search.service';

/**
 * 获取默认的向量服务实例
 * 优先使用内存向量服务，如果不可用则使用关键词搜索
 */
export function getVectorService(): IVectorService {
  // 优先使用内存向量服务
  if (memoryVectorService.isReady()) {
    return memoryVectorService;
  }
  
  // Fallback 到关键词搜索
  if (keywordSearchService.isReady()) {
    return keywordSearchService;
  }

  // 返回内存服务（即使未初始化，它有内置的 fallback）
  return memoryVectorService;
}

/**
 * 配置选项
 */
export interface VectorServiceOptions {
  /** Embedding 模式: 'local' (免费) 或 'openai' (需要 API Key) */
  mode?: EmbeddingMode;
  /** OpenAI API Key (仅 openai 模式需要) */
  apiKey?: string;
  /** OpenAI Base URL (可选) */
  baseUrl?: string;
}

/**
 * 初始化向量服务
 * @param options 配置选项
 */
export async function initializeVectorServices(options?: VectorServiceOptions): Promise<void> {
  const envMode = process.env.EMBEDDING_MODE as EmbeddingMode | undefined;
  const mode = options?.mode || envMode || 'local'; // 支持环境变量 EMBEDDING_MODE 覆盖
  
  console.log('[Vector] Initializing vector services...');
  console.log(`[Vector] Embedding mode: ${mode}`);

  // 配置内存向量服务
  memoryVectorService.setMode(mode);
  if (options?.apiKey) {
    memoryVectorService.setApiKey(options.apiKey, options.baseUrl);
  }
  
  // 先初始化关键词搜索（快速且可靠，作为 fallback）
  await keywordSearchService.initialize().catch(err => {
    console.warn('[Vector] Keyword search service init failed:', err.message);
  });

  // 尝试初始化向量搜索（可能需要下载模型，允许失败）
  try {
    await memoryVectorService.initialize();
  } catch (err: any) {
    console.warn('[Vector] Memory vector service init failed (will use keyword fallback):', err.message);
    // 向量服务初始化失败不影响系统运行，关键词搜索会作为 fallback
  }

  const memoryReady = memoryVectorService.isReady();
  const keywordReady = keywordSearchService.isReady();
  const hasValidEmbeddings = memoryVectorService.getValidVectorCount() > 0;

  console.log(`[Vector] Services status:`);
  if (memoryReady && hasValidEmbeddings) {
    console.log(`  - Memory Vector: ✓ Ready (${memoryVectorService.getValidVectorCount()} embeddings)`);
  } else {
    console.log(`  - Memory Vector: ⚠ Limited (no embeddings, using keyword fallback)`);
  }
  console.log(`  - Keyword Search: ${keywordReady ? '✓ Ready' : '✗ Not ready'} (${keywordSearchService.getDocumentCount()} templates)`);
  
  if (keywordReady) {
    console.log(`[Vector] ✅ Search service ready (using Fuse.js keyword matching)`);
  }
}
