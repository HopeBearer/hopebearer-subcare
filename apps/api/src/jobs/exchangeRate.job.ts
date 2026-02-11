import cron, { ScheduledTask } from 'node-cron';

const DEFAULT_CRON = '0 1 * * *';

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

      // Check dynamic setting (DB)
      const dbEnabled = await services.systemSetting.getValue<boolean>('exchangeRate.syncEnabled', true);
      if (!dbEnabled) {
        console.log('[ExchangeRateJob] Skipped: disabled via system setting exchangeRate.syncEnabled');
        return;
      }

      console.log('[ExchangeRateJob] Running scheduled sync...');
      if (services.currency) {
        await services.currency.syncRates();
        result = { message: 'Exchange rates synced successfully' };
      } else {
        throw new Error('Currency service not available');
      }
      console.log('[ExchangeRateJob] Completed.');
    } catch (err) {
      status = 'FAILED';
      error = err instanceof Error ? err.message : String(err);
      console.error('[ExchangeRateJob] Failed:', error);
    }

    // Record execution to ScheduledJobService
    const duration = Date.now() - startTime;
    try {
      const { services } = await import('../core/container');
      await services.scheduledJob.recordCronExecution(
        'exchange-rate-sync',
        status,
        duration,
        result,
        error
      );
    } catch (recordErr) {
      console.error('[ExchangeRateJob] Failed to record execution:', recordErr);
    }

    // 热更新：每次执行后检查 Cron 表达式是否在 DB 中被修改
    try {
      const { services } = await import('../core/container');
      const latestCron = await services.systemSetting.getValue<string>('exchangeRate.syncCron', DEFAULT_CRON) || DEFAULT_CRON;
      if (latestCron !== currentCronExpr && cron.validate(latestCron)) {
        console.log(`[ExchangeRateJob] Cron expression changed: "${currentCronExpr}" → "${latestCron}", rescheduling...`);
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
  console.log(`[ExchangeRateJob] Rescheduled with cron: ${newCron} (UTC)`);
}

/**
 * Exchange Rate Sync Job
 * a9: Cron 表达式从系统设置 exchangeRate.syncCron 动态读取，支持热更新
 */
export const exchangeRateJob = {
  name: 'exchange-rate-sync',
  displayName: '汇率同步',
  description: '从外部 API 同步最新汇率数据（Cron 由系统设置控制，支持热更新）',
  cronExpression: DEFAULT_CRON,
  timezone: 'UTC',

  start: async () => {
    // 从系统设置读取 Cron 表达式
    let cronExpr = DEFAULT_CRON;
    try {
      const { services } = await import('../core/container');
      cronExpr = await services.systemSetting.getValue<string>('exchangeRate.syncCron', DEFAULT_CRON) || DEFAULT_CRON;
    } catch { /* 首次启动 seed 前可能没有数据，使用默认值 */ }

    currentCronExpr = cronExpr;
    currentTask = cron.schedule(cronExpr, createJobCallback(), { timezone: 'UTC' });

    console.log(`[ExchangeRateJob] Scheduled with cron: ${cronExpr} (UTC)`);
  },

  /**
   * Run sync immediately (for manual triggers)
   */
  runNow: async () => {
    console.log('[ExchangeRateJob] Running immediate sync...');
    const { services } = await import('../core/container');
    if (services.currency) {
      await services.currency.syncRates();
      console.log('[ExchangeRateJob] Immediate sync completed.');
      return { message: 'Exchange rates synced successfully' };
    }
    throw new Error('Currency service not available');
  },
};
