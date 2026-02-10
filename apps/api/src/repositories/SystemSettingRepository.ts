import { PrismaClient, Prisma } from '@subcare/database';

const prisma = new PrismaClient();

export class SystemSettingRepository {
  /**
   * 获取所有设置
   */
  async findAll(group?: string) {
    const where: Record<string, unknown> = {};
    if (group) where.group = group;

    return prisma.systemSetting.findMany({
      where: where as Prisma.SystemSettingWhereInput,
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * 根据 key 获取设置
   */
  async findByKey(key: string) {
    return prisma.systemSetting.findUnique({ where: { key } });
  }

  /**
   * 根据 ID 获取设置
   */
  async findById(id: string) {
    return prisma.systemSetting.findUnique({ where: { id } });
  }

  /**
   * 创建或更新设置
   */
  async upsert(key: string, data: { value: string; type?: string; group?: string; label?: string }) {
    return prisma.systemSetting.upsert({
      where: { key },
      update: { value: data.value, type: data.type, group: data.group, label: data.label },
      create: { key, ...data },
    });
  }

  /**
   * 批量更新设置
   */
  async batchUpdate(items: Array<{ key: string; value: string }>) {
    const operations = items.map((item) =>
      prisma.systemSetting.update({
        where: { key: item.key },
        data: { value: item.value },
      })
    );
    return prisma.$transaction(operations);
  }

  /**
   * 删除设置
   */
  async delete(id: string) {
    return prisma.systemSetting.delete({ where: { id } });
  }

  /**
   * 获取所有分组名称
   */
  async findGroups(): Promise<string[]> {
    const groups = await prisma.systemSetting.findMany({
      select: { group: true },
      distinct: ['group'],
      orderBy: { group: 'asc' },
    });
    return groups.map((g) => g.group);
  }
}
