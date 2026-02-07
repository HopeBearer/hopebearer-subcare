import Fuse from 'fuse.js';
import { prisma } from '@subcare/database';
import { IVectorService, VectorSearchResult, TemplateMetadata } from './vector-service.interface';

/**
 * 关键词搜索服务
 * 使用 Fuse.js 进行模糊匹配，作为向量搜索的 Fallback
 */

interface TemplateDocument {
  id: string;
  name: string;
  displayName: string | null;
  searchText: string;
  category: string | null;
  icon: string | null;
  website: string | null;
}

export class KeywordSearchService implements IVectorService {
  private fuse: Fuse<TemplateDocument> | null = null;
  private documents: TemplateDocument[] = [];
  private initialized: boolean = false;

  /**
   * 初始化：从数据库加载模板并构建搜索索引
   */
  async initialize(): Promise<void> {
    console.log('[KeywordSearchService] Initializing...');
    
    try {
      // 从数据库加载模板
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

      this.documents = templates;
      
      // 创建 Fuse 实例
      this.fuse = new Fuse(this.documents, {
        keys: [
          { name: 'name', weight: 2.0 },
          { name: 'displayName', weight: 1.5 },
          { name: 'searchText', weight: 1.0 },
        ],
        threshold: 0.4, // 0 = 精确匹配, 1 = 匹配所有
        distance: 100,
        includeScore: true,
        minMatchCharLength: 2,
        useExtendedSearch: true,
      });

      this.initialized = true;
      console.log(`[KeywordSearchService] Initialized with ${this.documents.length} templates`);
    } catch (error) {
      console.error('[KeywordSearchService] Initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * 搜索模板
   */
  async search(query: string, topK: number = 5): Promise<VectorSearchResult[]> {
    if (!this.initialized || !this.fuse) {
      console.warn('[KeywordSearchService] Service not initialized');
      return [];
    }

    if (!query.trim()) {
      return [];
    }

    // 使用 Fuse.js 搜索
    const fuseResults = this.fuse.search(query, { limit: topK });

    return fuseResults.map(result => ({
      templateId: result.item.id,
      name: result.item.name,
      displayName: result.item.displayName || undefined,
      category: result.item.category || undefined,
      icon: result.item.icon || undefined,
      // Fuse score: 0 = perfect match, 1 = no match
      // 转换为: 1 = perfect, 0 = no match
      score: 1 - (result.score || 0),
    }));
  }

  /**
   * 添加/更新模板
   */
  async upsert(
    templateId: string, 
    name: string, 
    searchText: string, 
    metadata?: Partial<TemplateMetadata>
  ): Promise<void> {
    // 查找现有文档
    const existingIndex = this.documents.findIndex(d => d.id === templateId);
    
    const doc: TemplateDocument = {
      id: templateId,
      name,
      displayName: metadata?.displayName || null,
      searchText,
      category: metadata?.category || null,
      icon: metadata?.icon || null,
      website: metadata?.website || null,
    };

    if (existingIndex >= 0) {
      this.documents[existingIndex] = doc;
    } else {
      this.documents.push(doc);
    }

    // 重建索引
    this.rebuildIndex();
  }

  /**
   * 删除模板
   */
  async delete(templateId: string): Promise<void> {
    const index = this.documents.findIndex(d => d.id === templateId);
    if (index >= 0) {
      this.documents.splice(index, 1);
      this.rebuildIndex();
    }
  }

  /**
   * 重建 Fuse 索引
   */
  private rebuildIndex(): void {
    if (this.fuse) {
      this.fuse = new Fuse(this.documents, {
        keys: [
          { name: 'name', weight: 2.0 },
          { name: 'displayName', weight: 1.5 },
          { name: 'searchText', weight: 1.0 },
        ],
        threshold: 0.4,
        distance: 100,
        includeScore: true,
        minMatchCharLength: 2,
        useExtendedSearch: true,
      });
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * 获取模板数量
   */
  getDocumentCount(): number {
    return this.documents.length;
  }
}

// 单例导出
export const keywordSearchService = new KeywordSearchService();
