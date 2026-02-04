import { prisma } from '@subcare/database';
import crypto from 'crypto';

export interface SearchCacheData {
  query: string;
  searchType?: string;
  results: unknown;
}

export class SearchCacheRepository {
  /**
   * 生成缓存Key
   */
  generateCacheKey(query: string, searchType?: string): string {
    const input = `${query.toLowerCase().trim()}:${searchType || 'general'}`;
    return crypto.createHash('md5').update(input).digest('hex');
  }

  /**
   * 获取缓存
   */
  async get(query: string, searchType?: string): Promise<unknown | null> {
    const cacheKey = this.generateCacheKey(query, searchType);
    
    const cache = await prisma.searchCache.findUnique({
      where: { cacheKey }
    });

    if (!cache) return null;

    // 检查是否过期
    if (new Date() > cache.expiresAt) {
      // 异步删除过期缓存
      this.delete(cacheKey).catch(console.error);
      return null;
    }

    return cache.results;
  }

  /**
   * 设置缓存
   * @param ttlHours 缓存有效期（小时），默认24小时
   */
  async set(data: SearchCacheData, ttlHours: number = 24): Promise<void> {
    const cacheKey = this.generateCacheKey(data.query, data.searchType);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    await prisma.searchCache.upsert({
      where: { cacheKey },
      update: {
        query: data.query,
        searchType: data.searchType,
        results: data.results as any,
        expiresAt
      },
      create: {
        cacheKey,
        query: data.query,
        searchType: data.searchType,
        results: data.results as any,
        expiresAt
      }
    });
  }

  /**
   * 删除缓存
   */
  async delete(cacheKey: string): Promise<void> {
    await prisma.searchCache.delete({
      where: { cacheKey }
    }).catch(() => {
      // 忽略删除不存在的记录的错误
    });
  }

  /**
   * 清理所有过期缓存
   */
  async cleanExpired(): Promise<number> {
    const result = await prisma.searchCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    return result.count;
  }

  /**
   * 获取当月搜索使用量
   */
  async getMonthlyUsage(): Promise<{ count: number; limit: number; remaining: number }> {
    const month = this.getCurrentMonth();
    
    let usage = await prisma.searchUsageLog.findUnique({
      where: { month }
    });

    if (!usage) {
      // 创建当月记录
      usage = await prisma.searchUsageLog.create({
        data: { month, count: 0, limit: 1000 }
      });
    }

    return {
      count: usage.count,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - usage.count)
    };
  }

  /**
   * 增加搜索使用计数
   */
  async incrementUsage(): Promise<{ count: number; limit: number; remaining: number }> {
    const month = this.getCurrentMonth();

    const usage = await prisma.searchUsageLog.upsert({
      where: { month },
      update: {
        count: { increment: 1 }
      },
      create: {
        month,
        count: 1,
        limit: 1000
      }
    });

    return {
      count: usage.count,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - usage.count)
    };
  }

  /**
   * 检查是否还有配额
   */
  async hasQuota(): Promise<boolean> {
    const { remaining } = await this.getMonthlyUsage();
    return remaining > 0;
  }

  /**
   * 获取当前月份字符串 (YYYY-MM)
   */
  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
