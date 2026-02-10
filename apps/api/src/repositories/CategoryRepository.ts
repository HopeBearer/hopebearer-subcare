import { PrismaClient, Category, Prisma } from "@subcare/database";

const prisma = new PrismaClient();

export class CategoryRepository {
  /**
   * 获取用户可用的所有分类（系统默认 + 用户自定义）
   */
  async findAllByUserId(userId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        OR: [
          { userId: userId },
          { userId: null } // System default categories
        ],
        deletedAt: null
      },
      orderBy: [
        { userId: 'asc' }, // 系统分类排前面（userId为null）
        { createdAt: 'asc' }
      ]
    });
  }

  /**
   * 获取所有系统默认分类
   */
  async findSystemCategories(): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        userId: null,
        deletedAt: null
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * 根据 ID 查找分类
   */
  async findById(id: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { id, deletedAt: null }
    });
  }

  /**
   * 根据名称查找分类（用于检查重复）
   */
  async findByName(name: string, userId?: string | null): Promise<Category | null> {
    return prisma.category.findFirst({
      where: {
        name: { equals: name },
        OR: [
          { userId: userId || null },
          { userId: null }
        ],
        deletedAt: null
      }
    });
  }

  /**
   * 创建分类
   */
  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return prisma.category.create({ data });
  }

  /**
   * 更新分类
   */
  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data
    });
  }

  /**
   * 软删除分类
   */
  async softDelete(id: string): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
  
  /**
   * 删除用户的所有自定义分类
   */
  async deleteByUserId(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.category.deleteMany({
      where: { userId }
    });
  }

  /**
   * 统计分类下的订阅数量
   * 检查 categoryId（外键关联）和 legacy categoryName（字符串匹配）
   */
  async countSubscriptions(categoryId: string): Promise<number> {
    // First get the category name for legacy matching
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true }
    });

    return prisma.subscription.count({
      where: {
        deletedAt: null,
        OR: [
          { categoryId }, // New: FK relation
          ...(category ? [{ categoryName: category.name, categoryId: null }] : []) // Legacy: string match where FK not set
        ]
      }
    });
  }

  /**
   * 初始化系统默认分类
   */
  async initializeDefaults(): Promise<void> {
    const defaultCategories = [
      { name: 'Entertainment', icon: '🎬', color: '#A5A6F6' },
      { name: 'Streaming', icon: '📺', color: '#E879F9' },
      { name: 'Tools', icon: '🔧', color: '#FCD34D' },
      { name: 'Productivity', icon: '📊', color: '#34D399' },
      { name: 'Cloud', icon: '☁️', color: '#60A5FA' },
      { name: 'Utility', icon: '⚡', color: '#F87171' },
      { name: 'Education', icon: '📚', color: '#818CF8' },
      { name: 'Social', icon: '💬', color: '#FB923C' },
      { name: 'Other', icon: '📦', color: '#9CA3AF' },
    ];

    for (const cat of defaultCategories) {
      const existing = await this.findByName(cat.name, null);
      if (!existing) {
        await this.create({
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          user: undefined // System category, no user
        });
      }
    }
  }
}
