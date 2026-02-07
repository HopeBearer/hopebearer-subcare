/**
 * 本地 Embedding 服务
 * 使用 Transformers.js 在本地运行免费的开源模型
 * 无需 API Key，完全免费
 */

// 使用动态导入以避免 ESM/CJS 冲突
let pipeline: any = null;
let embeddingPipeline: any = null;

// 模型配置
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'; // 小巧高效的多语言模型
const EMBEDDING_DIMENSION = 384; // all-MiniLM-L6-v2 的维度

export class LocalEmbeddingService {
  private initialized: boolean = false;
  private initializing: boolean = false;

  /**
   * 获取 Embedding 维度
   */
  getDimension(): number {
    return EMBEDDING_DIMENSION;
  }

  /**
   * 服务始终可用（本地运行）
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * 初始化本地模型（首次调用时自动下载）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) {
      // 等待初始化完成
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializing = true;
    console.log('[LocalEmbedding] Initializing local embedding model...');
    console.log(`[LocalEmbedding] Model: ${MODEL_NAME}`);
    console.log('[LocalEmbedding] First run will download the model (~23MB)...');

    try {
      // 动态导入 Transformers.js
      const transformers = await import('@xenova/transformers');
      pipeline = transformers.pipeline;

      // 创建 feature-extraction pipeline
      embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME, {
        quantized: true, // 使用量化版本，更小更快
      });

      this.initialized = true;
      console.log('[LocalEmbedding] Model loaded successfully!');
    } catch (error) {
      console.error('[LocalEmbedding] Failed to initialize:', error);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * 生成单个文本的 Embedding
   * @param text 输入文本
   * @returns 向量数组
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 运行模型
      const output = await embeddingPipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // 转换为普通数组
      return Array.from(output.data as Float32Array);
    } catch (error) {
      console.error('[LocalEmbedding] Failed to generate embedding:', error);
      throw new Error(`Local embedding generation failed: ${error}`);
    }
  }

  /**
   * 批量生成 Embedding
   * @param texts 输入文本数组
   * @returns 向量数组的数组
   */
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (texts.length === 0) {
      return [];
    }

    const results: number[][] = [];

    // Transformers.js 支持批量处理，但为了稳定性逐个处理
    // 小模型速度很快，逐个处理也足够
    for (const text of texts) {
      try {
        const embedding = await this.generateEmbedding(text);
        results.push(embedding);
      } catch (error) {
        const textPreview = text && typeof text === 'string' ? text.substring(0, 50) : '[invalid text]';
        console.error('[LocalEmbedding] Failed to generate embedding for text:', textPreview);
        // 返回零向量作为 fallback
        results.push(new Array(EMBEDDING_DIMENSION).fill(0));
      }
    }

    return results;
  }
}

// 单例导出
export const localEmbeddingService = new LocalEmbeddingService();
