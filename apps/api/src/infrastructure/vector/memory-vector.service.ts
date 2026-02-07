import { prisma } from '@subcare/database';
import { IVectorService, VectorSearchResult, TemplateMetadata } from './vector-service.interface';
import { EmbeddingService, embeddingService } from './embedding.service';
import { LocalEmbeddingService, localEmbeddingService } from './local-embedding.service';

/**
 * 内存向量搜索服务
 * 在内存中存储模板向量，使用余弦相似度进行搜索
 * 
 * 支持两种 Embedding 模式：
 * 1. OpenAI API (需要 API Key，高质量)
 * 2. 本地模型 (免费，无需 API Key)
 */

interface VectorEntry {
  embedding: number[];
  metadata: TemplateMetadata;
}

export type EmbeddingMode = 'openai' | 'local';

export class MemoryVectorService implements IVectorService {
  private vectors: Map<string, VectorEntry> = new Map();
  private embeddingService: EmbeddingService;
  private localEmbeddingService: LocalEmbeddingService;
  private initialized: boolean = false;
  private apiKey: string = '';
  private mode: EmbeddingMode = 'local'; // 默认使用本地模式（免费）

  constructor(embeddingSvc?: EmbeddingService, localSvc?: LocalEmbeddingService) {
    this.embeddingService = embeddingSvc || embeddingService;
    this.localEmbeddingService = localSvc || localEmbeddingService;
  }

  /**
   * 设置 Embedding 模式
   */
  setMode(mode: EmbeddingMode): void {
    this.mode = mode;
    console.log(`[MemoryVectorService] Embedding mode set to: ${mode}`);
  }

  /**
   * 获取当前模式
   */
  getMode(): EmbeddingMode {
    return this.mode;
  }

  /**
   * 设置 API Key（用于 OpenAI 模式）
   */
  setApiKey(apiKey: string, baseUrl?: string): void {
    this.apiKey = apiKey;
    this.embeddingService.setApiKey(apiKey, baseUrl);
    if (apiKey) {
      this.mode = 'openai';
    }
  }

  /**
   * 初始化：从数据库加载所有模板的向量
   * 支持两种模式：
   * 1. 从缓存加载预生成的向量
   * 2. 使用本地模型实时生成（免费）
   */
  async initialize(): Promise<void> {
    console.log('[MemoryVectorService] Initializing...');
    console.log(`[MemoryVectorService] Embedding mode: ${this.mode}`);
    
    try {
      // 从数据库加载模板数据
      const templates = await prisma.subscriptionTemplate.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          displayName: true,
          searchText: true,
          category: true,
          icon: true,
          website: true,
        },
      });

      // 尝试从缓存文件加载向量（如果存在）
      const embeddings = await this.loadEmbeddingsFromCache();
      
      if (embeddings && Object.keys(embeddings).length > 0) {
        // 使用缓存的向量
        for (const template of templates) {
          const embedding = embeddings[template.id];
          if (embedding) {
            this.vectors.set(template.id, {
              embedding,
              metadata: {
                id: template.id,
                name: template.name,
                displayName: template.displayName || undefined,
                category: template.category || undefined,
                icon: template.icon || undefined,
                website: template.website || undefined,
              },
            });
          }
        }
        console.log(`[MemoryVectorService] Loaded ${this.vectors.size} vectors from cache`);
      } else if (this.mode === 'local') {
        // 本地模式：尝试实时生成向量
        console.log('[MemoryVectorService] No cache found, attempting local embedding generation...');
        
        let localModelReady = false;
        try {
          console.log('[MemoryVectorService] Downloading model (first run only, ~23MB)...');
          await this.localEmbeddingService.initialize();
          localModelReady = true;
        } catch (err: any) {
          console.warn('[MemoryVectorService] Local model init failed:', err.message);
          console.warn('[MemoryVectorService] Will use keyword search fallback');
        }
        
        // 加载模板元数据
        for (const template of templates) {
          let embedding: number[] = [];
          
          if (localModelReady) {
            const searchText = `${template.name} ${template.displayName || ''} ${template.searchText}`;
            try {
              embedding = await this.localEmbeddingService.generateEmbedding(searchText);
            } catch (err) {
              // 单个生成失败，继续处理其他
            }
          }
          
          this.vectors.set(template.id, {
            embedding,
            metadata: {
              id: template.id,
              name: template.name,
              displayName: template.displayName || undefined,
              category: template.category || undefined,
              icon: template.icon || undefined,
              website: template.website || undefined,
            },
          });
        }
        
        if (localModelReady) {
          console.log(`[MemoryVectorService] Generated ${this.getValidVectorCount()} embeddings locally`);
        } else {
          console.log(`[MemoryVectorService] Loaded ${this.vectors.size} templates (keyword fallback active)`);
        }
      } else {
        // OpenAI 模式但无缓存，仅加载元数据
        for (const template of templates) {
          this.vectors.set(template.id, {
            embedding: [], // 空向量，等待生成
            metadata: {
              id: template.id,
              name: template.name,
              displayName: template.displayName || undefined,
              category: template.category || undefined,
              icon: template.icon || undefined,
              website: template.website || undefined,
            },
          });
        }
        console.log(`[MemoryVectorService] Loaded ${this.vectors.size} templates (run generate:embeddings to create vectors)`);
      }

      this.initialized = true;
    } catch (error) {
      console.error('[MemoryVectorService] Initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * 从缓存文件加载向量
   */
  private async loadEmbeddingsFromCache(): Promise<Record<string, number[]> | null> {
    try {
      const fs = await import('fs').then(m => m.promises);
      const path = await import('path');
      const cacheFile = path.join(process.cwd(), 'data', 'embeddings-cache.json');
      
      const content = await fs.readFile(cacheFile, 'utf-8');
      const cache = JSON.parse(content);
      return cache.embeddings || null;
    } catch {
      // 缓存文件不存在或读取失败
      return null;
    }
  }

  /**
   * 语义搜索
   */
  async search(query: string, topK: number = 5): Promise<VectorSearchResult[]> {
    if (!this.initialized) {
      console.warn('[MemoryVectorService] Service not initialized');
      return [];
    }

    // 检查是否有有效的向量数据
    const hasValidVectors = Array.from(this.vectors.values()).some(v => v.embedding.length > 0);
    
    if (!hasValidVectors) {
      console.warn('[MemoryVectorService] No embeddings available, using fallback');
      return this.keywordFallbackSearch(query, topK);
    }

    try {
      let queryEmbedding: number[];

      if (this.mode === 'local') {
        // 本地模式：使用本地模型生成查询向量
        if (!this.localEmbeddingService.isReady()) {
          await this.localEmbeddingService.initialize();
        }
        queryEmbedding = await this.localEmbeddingService.generateEmbedding(query);
      } else {
        // OpenAI 模式
        if (!this.apiKey && !this.embeddingService.isAvailable()) {
          console.warn('[MemoryVectorService] No API key, using fallback search');
          return this.keywordFallbackSearch(query, topK);
        }
        queryEmbedding = await this.embeddingService.generateEmbedding(query, this.apiKey);
      }

      // 计算相似度
      const results: VectorSearchResult[] = [];

      for (const [templateId, entry] of this.vectors.entries()) {
        if (entry.embedding.length === 0) continue;
        
        const score = this.cosineSimilarity(queryEmbedding, entry.embedding);
        results.push({
          templateId,
          name: entry.metadata.name,
          displayName: entry.metadata.displayName,
          category: entry.metadata.category,
          icon: entry.metadata.icon,
          score,
        });
      }

      // 按分数排序并返回 Top K
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      console.error('[MemoryVectorService] Search failed, using fallback:', error);
      return this.keywordFallbackSearch(query, topK);
    }
  }

  /**
   * 关键词 Fallback 搜索
   */
  private keywordFallbackSearch(query: string, topK: number): VectorSearchResult[] {
    const queryLower = query.toLowerCase();
    const queryChars = new Set(queryLower.split(''));
    const results: VectorSearchResult[] = [];

    for (const [templateId, entry] of this.vectors.entries()) {
      const { metadata } = entry;
      const searchText = `${metadata.name} ${metadata.displayName || ''}`.toLowerCase();
      
      // 简单的包含匹配 + 字符重叠率
      let score = 0;
      
      if (searchText.includes(queryLower)) {
        score = 1.0;
      } else if (queryLower.split(' ').some(word => searchText.includes(word))) {
        score = 0.7;
      } else {
        // 字符重叠率
        const textChars = new Set(searchText.split(''));
        const overlap = [...queryChars].filter(c => textChars.has(c)).length;
        score = overlap / queryChars.size * 0.5;
      }

      if (score > 0.1) {
        results.push({
          templateId,
          name: metadata.name,
          displayName: metadata.displayName,
          category: metadata.category,
          icon: metadata.icon,
          score,
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    
    return dotProduct / denominator;
  }

  /**
   * 添加/更新模板向量
   */
  async upsert(
    templateId: string, 
    name: string, 
    searchText: string, 
    metadata?: Partial<TemplateMetadata>
  ): Promise<void> {
    try {
      let embedding: number[] = [];

      if (this.mode === 'local') {
        // 本地模式
        if (!this.localEmbeddingService.isReady()) {
          await this.localEmbeddingService.initialize();
        }
        embedding = await this.localEmbeddingService.generateEmbedding(searchText);
      } else if (this.embeddingService.isAvailable()) {
        // OpenAI 模式
        embedding = await this.embeddingService.generateEmbedding(searchText, this.apiKey);
      }

      this.vectors.set(templateId, {
        embedding,
        metadata: {
          id: templateId,
          name,
          displayName: metadata?.displayName,
          category: metadata?.category,
          icon: metadata?.icon,
          website: metadata?.website,
        },
      });
    } catch (error) {
      console.error('[MemoryVectorService] Failed to upsert vector:', error);
      // 仍然保存元数据，但没有向量
      this.vectors.set(templateId, {
        embedding: [],
        metadata: {
          id: templateId,
          name,
          displayName: metadata?.displayName,
          category: metadata?.category,
          icon: metadata?.icon,
          website: metadata?.website,
        },
      });
    }
  }

  /**
   * 删除模板向量
   */
  async delete(templateId: string): Promise<void> {
    this.vectors.delete(templateId);
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * 获取向量数量
   */
  getVectorCount(): number {
    return this.vectors.size;
  }

  /**
   * 获取有效向量数量（有 embedding 的）
   */
  getValidVectorCount(): number {
    return Array.from(this.vectors.values()).filter(v => v.embedding.length > 0).length;
  }

  /**
   * 导出向量用于缓存
   */
  exportEmbeddings(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const [id, entry] of this.vectors.entries()) {
      if (entry.embedding.length > 0) {
        result[id] = entry.embedding;
      }
    }
    return result;
  }

  /**
   * 导入向量
   */
  importEmbeddings(embeddings: Record<string, number[]>): void {
    for (const [id, embedding] of Object.entries(embeddings)) {
      const existing = this.vectors.get(id);
      if (existing) {
        existing.embedding = embedding;
      }
    }
  }
}

// 单例导出
export const memoryVectorService = new MemoryVectorService();
