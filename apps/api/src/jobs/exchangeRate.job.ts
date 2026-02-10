import cron from 'node-cron';

/**
 * Exchange Rate Sync Job
 * Runs daily at 01:00 UTC
 */
export const exchangeRateJob = {
  name: 'exchange-rate-sync',
  displayName: '汇率同步',
  description: '每天 UTC 01:00 自动从外部 API 同步最新汇率数据',
  cronExpression: '0 1 * * *',
  timezone: 'UTC',

  start: () => {
    cron.schedule('0 1 * * *', async () => {
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
    }, {
      timezone: 'UTC',
    });

    console.log('[ExchangeRateJob] Scheduled for 01:00 UTC daily.');
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
