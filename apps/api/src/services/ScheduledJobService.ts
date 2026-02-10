import { ScheduledJobRepository } from '../repositories/ScheduledJobRepository';
import { SystemLogRepository } from '../repositories/SystemLogRepository';
import cronParser from 'cron-parser';

interface JobDefinition {
  name: string;
  displayName: string;
  description: string;
  cronExpression: string;
  timezone: string;
  runNow?: () => Promise<unknown>;
}

export class ScheduledJobService {
  private jobDefinitions: Map<string, JobDefinition> = new Map();

  constructor(
    private jobRepository: ScheduledJobRepository,
    private systemLogRepository: SystemLogRepository,
  ) {}

  /**
   * 注册一个任务定义（在应用启动时调用）
   */
  registerJob(definition: JobDefinition) {
    this.jobDefinitions.set(definition.name, definition);
  }

  /**
   * 初始化：将所有注册的任务同步到数据库
   */
  async initializeJobs() {
    for (const [, def] of this.jobDefinitions) {
      const nextRunAt = this.calculateNextRun(def.cronExpression, def.timezone);
      await this.jobRepository.upsert(def.name, {
        displayName: def.displayName,
        description: def.description,
        cronExpression: def.cronExpression,
        timezone: def.timezone,
        nextRunAt,
      });
    }
  }

  /**
   * 获取所有任务列表
   */
  async getAllJobs() {
    const jobs = await this.jobRepository.findAll();

    return jobs.map((job) => {
      const definition = this.jobDefinitions.get(job.name);
      return {
        id: job.id,
        name: job.name,
        displayName: job.displayName,
        description: job.description,
        cronExpression: job.cronExpression,
        timezone: job.timezone,
        isEnabled: job.isEnabled,
        lastRunAt: job.lastRunAt,
        lastRunStatus: job.lastRunStatus,
        lastRunDuration: job.lastRunDuration,
        lastRunError: job.lastRunError,
        nextRunAt: job.nextRunAt || this.calculateNextRun(job.cronExpression, job.timezone),
        canTrigger: !!definition?.runNow,
        executionCount: (job as any)._count?.executions || 0,
      };
    });
  }

  /**
   * 获取任务详情（含执行历史）
   */
  async getJobDetail(jobId: string, page: number = 1, limit: number = 20) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new Error('Job not found');

    const executions = await this.jobRepository.getExecutions(jobId, page, limit);
    const definition = this.jobDefinitions.get(job.name);

    return {
      ...job,
      nextRunAt: job.nextRunAt || this.calculateNextRun(job.cronExpression, job.timezone),
      canTrigger: !!definition?.runNow,
      executions: executions.items.map((e) => ({
        id: e.id,
        status: e.status,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        duration: e.duration,
        result: e.result,
        error: e.error,
        triggeredBy: e.triggeredBy,
      })),
      executionTotal: executions.total,
    };
  }

  /**
   * 手动触发任务
   */
  async triggerJob(jobName: string, adminUserId?: string) {
    const definition = this.jobDefinitions.get(jobName);
    if (!definition) throw new Error(`Job '${jobName}' not registered`);
    if (!definition.runNow) throw new Error(`Job '${jobName}' does not support manual triggering`);

    const job = await this.jobRepository.findByName(jobName);
    if (!job) throw new Error(`Job '${jobName}' not found in database`);

    // 创建执行记录
    const execution = await this.jobRepository.createExecution({
      jobId: job.id,
      status: 'RUNNING',
      startedAt: new Date(),
      triggeredBy: 'manual',
    });

    const startTime = Date.now();

    try {
      // 更新任务状态为运行中
      await this.jobRepository.updateRunStatus(jobName, {
        lastRunAt: new Date(),
        lastRunStatus: 'RUNNING',
      });

      const result = await definition.runNow();
      const duration = Date.now() - startTime;
      const nextRunAt = this.calculateNextRun(definition.cronExpression, definition.timezone);

      // 更新任务状态
      await this.jobRepository.updateRunStatus(jobName, {
        lastRunAt: new Date(),
        lastRunStatus: 'SUCCESS',
        lastRunDuration: duration,
        lastRunError: null,
        nextRunAt,
      });

      // 更新执行记录
      await this.jobRepository.createExecution({
        jobId: job.id,
        status: 'SUCCESS',
        startedAt: execution.startedAt,
        completedAt: new Date(),
        duration,
        result: result as object || {},
        triggeredBy: 'manual',
      });

      // 审计日志
      await this.systemLogRepository.create({
        level: 'AUDIT',
        domain: 'SYSTEM',
        action: 'trigger_job',
        userId: adminUserId || null,
        metadata: { jobName, duration, status: 'SUCCESS' },
      });

      return { status: 'SUCCESS', duration, result };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.jobRepository.updateRunStatus(jobName, {
        lastRunAt: new Date(),
        lastRunStatus: 'FAILED',
        lastRunDuration: duration,
        lastRunError: errorMsg,
      });

      await this.jobRepository.createExecution({
        jobId: job.id,
        status: 'FAILED',
        startedAt: execution.startedAt,
        completedAt: new Date(),
        duration,
        error: errorMsg,
        triggeredBy: 'manual',
      });

      await this.systemLogRepository.create({
        level: 'ERROR',
        domain: 'SYSTEM',
        action: 'trigger_job',
        userId: adminUserId || null,
        metadata: { jobName, duration, status: 'FAILED' },
        error: errorMsg,
      });

      return { status: 'FAILED', duration, error: errorMsg };
    }
  }

  /**
   * 切换任务启用/禁用
   */
  async toggleJob(jobId: string, isEnabled: boolean, adminUserId?: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new Error('Job not found');

    const updated = await this.jobRepository.updateEnabled(jobId, isEnabled);

    await this.systemLogRepository.create({
      level: 'AUDIT',
      domain: 'SYSTEM',
      action: isEnabled ? 'enable_job' : 'disable_job',
      userId: adminUserId || null,
      metadata: { jobName: job.name, isEnabled },
    });

    return updated;
  }

  /**
   * 计算下次运行时间
   */
  private calculateNextRun(cronExpression: string, timezone: string): Date | null {
    try {
      const interval = cronParser.parseExpression(cronExpression, {
        currentDate: new Date(),
        tz: timezone,
      });
      return interval.next().toDate();
    } catch {
      return null;
    }
  }

  /**
   * 通知 cron 任务完成（供 job 回调使用）
   */
  async recordCronExecution(jobName: string, status: string, duration: number, result?: object, error?: string) {
    const job = await this.jobRepository.findByName(jobName);
    if (!job) return;

    const definition = this.jobDefinitions.get(jobName);
    const nextRunAt = definition
      ? this.calculateNextRun(definition.cronExpression, definition.timezone)
      : null;

    await this.jobRepository.updateRunStatus(jobName, {
      lastRunAt: new Date(),
      lastRunStatus: status,
      lastRunDuration: duration,
      lastRunError: error || null,
      nextRunAt,
    });

    await this.jobRepository.createExecution({
      jobId: job.id,
      status,
      completedAt: new Date(),
      duration,
      result: result || {},
      error,
      triggeredBy: 'cron',
    });
  }
}
