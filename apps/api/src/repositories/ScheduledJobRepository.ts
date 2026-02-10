import { PrismaClient } from '@subcare/database';

const prisma = new PrismaClient();

export class ScheduledJobRepository {
  /**
   * 获取所有定时任务
   */
  async findAll() {
    return prisma.scheduledJob.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { executions: true } },
      },
    });
  }

  /**
   * 根据名称查找任务
   */
  async findByName(name: string) {
    return prisma.scheduledJob.findUnique({ where: { name } });
  }

  /**
   * 根据 ID 查找
   */
  async findById(id: string) {
    return prisma.scheduledJob.findUnique({ where: { id } });
  }

  /**
   * 创建或更新任务
   */
  async upsert(name: string, data: {
    displayName: string;
    description?: string;
    cronExpression: string;
    timezone?: string;
    isEnabled?: boolean;
    nextRunAt?: Date | null;
  }) {
    return prisma.scheduledJob.upsert({
      where: { name },
      update: data,
      create: { name, ...data },
    });
  }

  /**
   * 更新任务状态（启用/禁用）
   */
  async updateEnabled(id: string, isEnabled: boolean) {
    return prisma.scheduledJob.update({
      where: { id },
      data: { isEnabled },
    });
  }

  /**
   * 更新最后运行状态
   */
  async updateRunStatus(name: string, data: {
    lastRunAt: Date;
    lastRunStatus: string;
    lastRunDuration?: number;
    lastRunError?: string | null;
    nextRunAt?: Date | null;
  }) {
    return prisma.scheduledJob.update({
      where: { name },
      data,
    });
  }

  /**
   * 记录任务执行
   */
  async createExecution(data: {
    jobId: string;
    status: string;
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    result?: object;
    error?: string;
    triggeredBy?: string;
  }) {
    return prisma.jobExecution.create({ data: data as any });
  }

  /**
   * 获取任务执行历史
   */
  async getExecutions(jobId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.jobExecution.findMany({
        where: { jobId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.jobExecution.count({ where: { jobId } }),
    ]);

    return { items, total };
  }

  /**
   * 清理旧的执行记录（保留最近 N 条）
   */
  async cleanOldExecutions(jobId: string, keepCount: number = 100) {
    const executions = await prisma.jobExecution.findMany({
      where: { jobId },
      orderBy: { startedAt: 'desc' },
      skip: keepCount,
      select: { id: true },
    });

    if (executions.length === 0) return { deleted: 0 };

    const result = await prisma.jobExecution.deleteMany({
      where: { id: { in: executions.map((e) => e.id) } },
    });

    return { deleted: result.count };
  }
}
