import { prisma, SubscriptionTemplate, Prisma } from "@subcare/database";

export interface TemplateSearchOptions {
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
}

/**
 * 订阅模板数据仓库
 * 封装对 SubscriptionTemplate 表的所有数据库操作
 */
export class TemplateRepository {
  /**
   * 创建新的订阅模板
   * @param data 模板数据
   * @returns 创建的模板实体
   */
  async create(data: Prisma.SubscriptionTemplateCreateInput): Promise<SubscriptionTemplate> {
    return prisma.subscriptionTemplate.create({
      data,
    });
  }

  /**
   * 批量创建模板
   * @param templates 模板数组
   * @returns 创建的模板数量
   */
  async createMany(templates: Prisma.SubscriptionTemplateCreateInput[]): Promise<Prisma.BatchPayload> {
    return prisma.subscriptionTemplate.createMany({
      data: templates,
      skipDuplicates: true,
    });
  }

  /**
   * 根据 ID 查找模板
   * @param id 模板 ID
   * @returns 模板实体或 null
   */
  async findById(id: string): Promise<SubscriptionTemplate | null> {
    return prisma.subscriptionTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * 根据名称查找模板
   * @param name 模板名称
   * @returns 模板实体或 null
   */
  async findByName(name: string): Promise<SubscriptionTemplate | null> {
    return prisma.subscriptionTemplate.findUnique({
      where: { name },
    });
  }

  /**
   * 模糊搜索模板
   * @param options 搜索参数
   * @returns 模板列表和总数
   */
  async search(options?: TemplateSearchOptions): Promise<{ items: SubscriptionTemplate[]; total: number }> {
    const { query, category, page, limit } = options || {};
    const take = limit || 20;
    const skip = page && limit ? (page - 1) * limit : 0;

    const where: Prisma.SubscriptionTemplateWhereInput = {
      deletedAt: null,
      ...(query && {
        OR: [
          { name: { contains: query } },
          { displayName: { contains: query } },
          { searchText: { contains: query } },
          { description: { contains: query } },
        ],
      }),
      ...(category && { category }),
    };

    const [items, total] = await Promise.all([
      prisma.subscriptionTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.subscriptionTemplate.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * 按分类查询模板
   * @param category 分类名称
   * @returns 模板列表
   */
  async findByCategory(category: string): Promise<SubscriptionTemplate[]> {
    return prisma.subscriptionTemplate.findMany({
      where: { category, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 获取所有分类
   * @returns 分类名称列表
   */
  async findAllCategories(): Promise<string[]> {
    const results = await prisma.subscriptionTemplate.findMany({
      where: { category: { not: null }, deletedAt: null },
      select: { category: true },
      distinct: ['category'],
    });
    return results.map((r) => r.category!).filter(Boolean);
  }

  /**
   * 获取所有模板
   * @returns 模板列表
   */
  async findAll(): Promise<SubscriptionTemplate[]> {
    return prisma.subscriptionTemplate.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 更新模板
   * @param id 模板 ID
   * @param data 更新数据
   * @returns 更新后的模板实体
   */
  async update(id: string, data: Prisma.SubscriptionTemplateUpdateInput): Promise<SubscriptionTemplate> {
    return prisma.subscriptionTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * 按名称更新或创建模板
   * @param name 模板名称
   * @param data 模板数据
   * @returns 模板实体
   */
  async upsert(name: string, data: Omit<Prisma.SubscriptionTemplateCreateInput, 'name'>): Promise<SubscriptionTemplate> {
    return prisma.subscriptionTemplate.upsert({
      where: { name },
      update: data,
      create: { name, ...data },
    });
  }

  /**
   * 软删除模板
   * @param id 模板 ID
   */
  async softDelete(id: string): Promise<void> {
    await prisma.subscriptionTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 硬删除模板（慎用）
   * @param id 模板 ID
   * @returns 删除的模板实体
   */
  async delete(id: string): Promise<SubscriptionTemplate> {
    return prisma.subscriptionTemplate.delete({
      where: { id },
    });
  }

  /**
   * 清空所有模板
   * @returns 删除的模板数量
   */
  async deleteAll(): Promise<Prisma.BatchPayload> {
    return prisma.subscriptionTemplate.deleteMany({});
  }

  /**
   * 统计模板数量
   * @returns 模板数量
   */
  async count(): Promise<number> {
    return prisma.subscriptionTemplate.count();
  }
}
