import cron from 'node-cron';

// Default: sync every Monday at 03:00 UTC
const DEFAULT_CRON = '0 3 * * 1';

/**
 * AI Model Sync Job
 * Syncs AI models from all providers periodically
 * 
 * Environment variables:
 * - AI_MODEL_SYNC_CRON: Cron expression (default: '0 3 * * 1' = Monday 03:00 UTC)
 * - AI_MODEL_SYNC_ENABLED: 'true' to enable (default: true)
 */
export const aiModelSyncJob = {
  start: () => {
    const isEnabled = process.env.AI_MODEL_SYNC_ENABLED !== 'false';
    
    if (!isEnabled) {
      console.log('[AIModelSyncJob] Disabled via AI_MODEL_SYNC_ENABLED=false');
      return;
    }

    const cronExpression = process.env.AI_MODEL_SYNC_CRON || DEFAULT_CRON;

    cron.schedule(cronExpression, async () => {
      console.log('[AIModelSyncJob] Starting AI model sync...');
      const startTime = Date.now();

      try {
        // Dynamic import to avoid circular dependency
        const { services } = await import('../core/container');
        
        if (services.aiProvider) {
          const results = await services.aiProvider.syncAllProviders();
          
          const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
          const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
          const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0);
          
          const duration = Date.now() - startTime;
          console.log(`[AIModelSyncJob] Completed in ${duration}ms: ${totalAdded} added, ${totalUpdated} updated, ${totalRemoved} removed`);
        } else {
          console.warn('[AIModelSyncJob] AIProvider service not available');
        }
      } catch (error) {
        console.error('[AIModelSyncJob] Failed:', error);
      }
    }, {
      timezone: 'UTC'
    });

    console.log(`[AIModelSyncJob] Scheduled with cron: ${cronExpression} (UTC)`);
  },

  /**
   * Run sync immediately (for manual triggers or testing)
   */
  runNow: async () => {
    console.log('[AIModelSyncJob] Running immediate sync...');
    try {
      const { services } = await import('../core/container');
      
      if (services.aiProvider) {
        const results = await services.aiProvider.syncAllProviders();
        console.log('[AIModelSyncJob] Immediate sync completed:', results);
        return results;
      }
    } catch (error) {
      console.error('[AIModelSyncJob] Immediate sync failed:', error);
      throw error;
    }
  }
};
