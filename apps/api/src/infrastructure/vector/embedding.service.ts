import axios, { AxiosError } from 'axios';

/**
 * Embedding 服务
 * 使用 OpenAI API 生成文本向量
 */

const DEFAULT_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export interface EmbeddingConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class EmbeddingService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config?: EmbeddingConfig) {
    this.apiKey = config?.apiKey || '';
    this.baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
    this.model = config?.model || DEFAULT_MODEL;
  }

  /**
   * 设置 API Key（运行时配置）
   */
  setApiKey(apiKey: string, baseUrl?: string): void {
    this.apiKey = apiKey;
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * 获取 Embedding 维度
   */
  getDimension(): number {
    return EMBEDDING_DIMENSION;
  }

  /**
   * 生成单个文本的 Embedding
   * @param text 输入文本
   * @param userApiKey 可选的用户 API Key（覆盖默认）
   * @returns 向量数组
   */
  async generateEmbedding(text: string, userApiKey?: string): Promise<number[]> {
    const apiKey = userApiKey || this.apiKey;
    
    if (!apiKey) {
      throw new Error('API Key not configured for embedding service');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/embeddings`,
        {
          model: this.model,
          input: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const embedding = response.data.data[0].embedding;
      return embedding;
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      const errorMessage = axiosError.response?.data?.error?.message || axiosError.message;
      console.error('[EmbeddingService] Failed to generate embedding:', errorMessage);
      throw new Error(`Embedding generation failed: ${errorMessage}`);
    }
  }

  /**
   * 批量生成 Embedding
   * @param texts 输入文本数组
   * @param userApiKey 可选的用户 API Key
   * @returns 向量数组的数组
   */
  async batchGenerateEmbeddings(texts: string[], userApiKey?: string): Promise<number[][]> {
    const apiKey = userApiKey || this.apiKey;
    
    if (!apiKey) {
      throw new Error('API Key not configured for embedding service');
    }

    if (texts.length === 0) {
      return [];
    }

    // OpenAI API 支持批量请求，最多 2048 个输入
    const BATCH_SIZE = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      
      try {
        const response = await axios.post(
          `${this.baseUrl}/embeddings`,
          {
            model: this.model,
            input: batch,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000, // 批量请求更长超时
          }
        );

        // 确保按原始顺序返回
        const embeddings = response.data.data
          .sort((a: any, b: any) => a.index - b.index)
          .map((item: any) => item.embedding);
        
        results.push(...embeddings);
      } catch (error) {
        const axiosError = error as AxiosError<{ error?: { message?: string } }>;
        const errorMessage = axiosError.response?.data?.error?.message || axiosError.message;
        console.error('[EmbeddingService] Batch embedding failed:', errorMessage);
        throw new Error(`Batch embedding generation failed: ${errorMessage}`);
      }
    }

    return results;
  }
}

// 单例导出
export const embeddingService = new EmbeddingService();
