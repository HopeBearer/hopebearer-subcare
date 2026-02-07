/**
 * 向量搜索服务接口
 * 支持订阅模板的语义搜索
 */

export interface VectorSearchResult {
  templateId: string;
  name: string;
  displayName?: string;
  category?: string;
  icon?: string;
  score: number;
}

export interface TemplateMetadata {
  id: string;
  name: string;
  displayName?: string;
  category?: string;
  icon?: string;
  website?: string;
}

export interface IVectorService {
  /**
   * 语义搜索模板
   * @param query 搜索查询
   * @param topK 返回结果数量
   * @returns 搜索结果列表
   */
  search(query: string, topK?: number): Promise<VectorSearchResult[]>;
  
  /**
   * 添加/更新模板向量
   * @param templateId 模板 ID
   * @param name 模板名称
   * @param searchText 搜索文本（包含别名等）
   */
  upsert(templateId: string, name: string, searchText: string, metadata?: Partial<TemplateMetadata>): Promise<void>;
  
  /**
   * 删除模板向量
   * @param templateId 模板 ID
   */
  delete(templateId: string): Promise<void>;
  
  /**
   * 初始化服务（加载向量数据）
   */
  initialize(): Promise<void>;
  
  /**
   * 检查服务是否已初始化
   */
  isReady(): boolean;
}
