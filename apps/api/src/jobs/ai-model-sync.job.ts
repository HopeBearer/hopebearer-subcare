import cron, { ScheduledTask } from 'node-cron';

// Default: sync every Monday at 03:00 UTC
const DEFAULT_CRON = '0 3 * * 1';

// 模块级变量：持有当前 task 引用和 cron 表达式，支持热更新
let currentTask: ScheduledTask | null = null;
let currentCronExpr: string = DEFAULT_CRON;

/**
 * 创建实际的 job 执行函数（复用于 schedule 和 reschedule）
 */
function createJobCallback() {
  return async () => {
    const startTime = Date.now();
    let status = 'SUCCESS';
    let error: string | undefined;
    let result: object | undefined;

    try {
      const { services } = await import('../core/container');

      // Check dynamic setting (DB overrides env var)
      const dbEnabled = await services.systemSetting.getValue<boolean>('ai.modelSyncEnabled', true);
      if (!dbEnabled) {
        console.log('[AIModelSyncJob] Skipped: disabled via system setting ai.modelSyncEnabled');
        return;
      }

      console.log('[AIModelSyncJob] Starting AI model sync...');

      if (services.aiProvider) {
        const results = await services.aiProvider.syncAllProviders();

        const totalAdded = results.reduce((sum: number, r: any) => sum + r.added, 0);
        const totalUpdated = results.reduce((sum: number, r: any) => sum + r.updated, 0);
        const totalRemoved = results.reduce((sum: number, r: any) => sum + r.removed, 0);

        result = { totalAdded, totalUpdated, totalRemoved, providers: results.length };
        console.log(`[AIModelSyncJob] Completed: ${totalAdded} added, ${totalUpdated} updated, ${totalRemoved} removed`);
      } else {
        throw new Error('AIProvider service not available');
      }
    } catch (err) {
      status = 'FAILED';
      error = err instanceof Error ? err.message : String(err);
      console.error('[AIModelSyncJob] Failed:', error);
    }

    // Record execution to ScheduledJobService
    const duration = Date.now() - startTime;
    try {
      const { services } = await import('../core/container');
      await services.scheduledJob.recordCronExecution(
        'ai-model-sync',
        status,
        duration,
        result,
        error
      );
    } catch (recordErr) {
      console.error('[AIModelSyncJob] Failed to record execution:', recordErr);
    }

    // 热更新：每次执行后检查 Cron 表达式是否在 DB 中被修改
    try {
      const { services } = await import('../core/container');
      const latestCron = await services.systemSetting.getValue<string>('ai.modelSyncCron', DEFAULT_CRON) || DEFAULT_CRON;
      if (latestCron !== currentCronExpr && cron.validate(latestCron)) {
        console.log(`[AIModelSyncJob] Cron expression changed: "${currentCronExpr}" → "${latestCron}", rescheduling...`);
        reschedule(latestCron);
      }
    } catch { /* ignore — 下次执行时再检查 */ }
  };
}

/**
 * 停止旧任务并用新 Cron 表达式重新调度
 */
function reschedule(newCron: string) {
  if (currentTask) {
    currentTask.stop();
  }
  currentCronExpr = newCron;
  currentTask = cron.schedule(newCron, createJobCallback(), { timezone: 'UTC' });
  console.log(`[AIModelSyncJob] Rescheduled with cron: ${newCron} (UTC)`);
}

/**
 * AI Model Sync Job
 * a9: Cron 表达式从系统设置 ai.modelSyncCron 动态读取，支持热更新
 */
export const aiModelSyncJob = {
  name: 'ai-model-sync',
  displayName: 'AI 模型同步',
  description: '定期从所有 AI 供应商同步最新模型列表（Cron 由系统设置控制，支持热更新）',
  cronExpression: process.env.AI_MODEL_SYNC_CRON || DEFAULT_CRON,
  timezone: 'UTC',

  start: async () => {
    const isEnabled = process.env.AI_MODEL_SYNC_ENABLED !== 'false';

    if (!isEnabled) {
      console.log('[AIModelSyncJob] Disabled via AI_MODEL_SYNC_ENABLED=false');
      return;
    }

    // 从系统设置读取 Cron 表达式（DB 优先于环境变量）
    let cronExpression = process.env.AI_MODEL_SYNC_CRON || DEFAULT_CRON;
    try {
      const { services } = await import('../core/container');
      cronExpression = await services.systemSetting.getValue<string>('ai.modelSyncCron', cronExpression) || cronExpression;
    } catch { /* 首次启动 seed 前可能没有数据，使用默认值 */ }

    currentCronExpr = cronExpression;
    currentTask = cron.schedule(cronExpression, createJobCallback(), { timezone: 'UTC' });

    console.log(`[AIModelSyncJob] Scheduled with cron: ${cronExpression} (UTC)`);
  },

  /**
   * Run sync immediately (for manual triggers or testing)
   */
  runNow: async () => {
    console.log('[AIModelSyncJob] Running immediate sync...');
    const { services } = await import('../core/container');

    if (services.aiProvider) {
      const results = await services.aiProvider.syncAllProviders();
      console.log('[AIModelSyncJob] Immediate sync completed:', results);
      return results;
    }
    throw new Error('AIProvider service not available');
  },
};
