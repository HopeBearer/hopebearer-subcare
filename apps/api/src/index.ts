import './setup-env'; // 必须最先导入，以确保环境变量加载
import app from './app';
import http from 'http';
import { seedTemplates } from './utils/seed-templates';
import { seedSystemSettings } from './utils/seed-settings';
import cron from 'node-cron';
import { services } from './core/container';
import { exchangeRateJob } from './jobs/exchangeRate.job';
import { aiModelSyncJob } from './jobs/ai-model-sync.job';
import { SocketService } from './infrastructure/socket/socket.service';
import { TokenService } from './services/TokenService';
import { initializeVectorServices } from './infrastructure/vector';

const PORT = process.env.PORT || 3001;

// Create HTTP server manually to attach Socket.io
const server = http.createServer(app);

// Initialize Services
const tokenService = new TokenService();

// Initialize Socket Service
const socketService = new SocketService(server, tokenService);

// Inject Socket Service into Notification Service
if (services.notification) {
    services.notification.setSocketService(socketService);
}

// Inject AI Recommendation handler into Socket Service
if (services.agent) {
    socketService.setAIRecommendationHandler(async (userId, request, onProgress) => {
        return services.agent.getRecommendations({
            userId,
            model: request.model,
            focus: request.focus,
            forceRefresh: request.forceRefresh ?? false
        }, onProgress);
    });
}

// Inject Chat Message handler into Socket Service
if (services.chat) {
    socketService.setChatMessageHandler(async (userId, request, onProgress) => {
        return services.chat.sendMessage({
            conversationId: request.conversationId,
            userId,
            content: request.content,
            language: request.language,
            onProgress
        });
    });
}

// 启动服务器
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV);

    // ===================== Register All Jobs with ScheduledJobService =====================

    // 1. Daily Bill Generation
    services.scheduledJob.registerJob({
        name: 'daily-bill-generation',
        displayName: '每日账单生成',
        description: '每天 00:01 自动生成订阅账单',
        cronExpression: '1 0 * * *',
        timezone: 'UTC',
        runNow: async () => {
            return services.billGenerator.generateDailyBills();
        },
    });

    // 2. Renewal & Pending Bill Reminders
    services.scheduledJob.registerJob({
        name: 'renewal-reminders',
        displayName: '续费提醒',
        description: '每天 09:00 发送续费提醒和待付账单提醒',
        cronExpression: '0 9 * * *',
        timezone: 'UTC',
        runNow: async () => {
            const results: string[] = [];
            if (services.subscription) {
                await services.subscription.checkAndSendRenewalReminders();
                results.push('renewal reminders sent');
            }
            if (services.financial) {
                await services.financial.checkAndSendPendingBillReminders();
                results.push('pending bill reminders sent');
            }
            return { results };
        },
    });

    // 3. Notification Cleanup
    services.scheduledJob.registerJob({
        name: 'notification-cleanup',
        displayName: '通知清理',
        description: '每天 02:00 清理过期通知',
        cronExpression: '0 2 * * *',
        timezone: 'UTC',
        runNow: async () => {
            if (services.notification) {
                await services.notification.cleanupOldNotifications();
                return { message: 'Old notifications cleaned up' };
            }
            return { message: 'Notification service not available' };
        },
    });

    // 4. Exchange Rate Sync
    services.scheduledJob.registerJob({
        name: exchangeRateJob.name,
        displayName: exchangeRateJob.displayName,
        description: exchangeRateJob.description,
        cronExpression: exchangeRateJob.cronExpression,
        timezone: exchangeRateJob.timezone,
        runNow: exchangeRateJob.runNow,
    });

    // 5. AI Model Sync
    services.scheduledJob.registerJob({
        name: aiModelSyncJob.name,
        displayName: aiModelSyncJob.displayName,
        description: aiModelSyncJob.description,
        cronExpression: aiModelSyncJob.cronExpression,
        timezone: aiModelSyncJob.timezone,
        runNow: aiModelSyncJob.runNow,
    });

    // Initialize all jobs (sync to database)
    await services.scheduledJob.initializeJobs().catch(err => {
        console.warn('[Startup] Failed to initialize scheduled jobs in DB:', err.message);
    });

    // Start the actual cron schedules
    // Inline jobs with execution recording
    cron.schedule('1 0 * * *', async () => {
        const start = Date.now();
        let status = 'SUCCESS';
        let error: string | undefined;
        let result: object | undefined;
        try {
            await services.billGenerator.generateDailyBills();
            result = { message: 'Daily bills generated' };
        } catch (err) {
            status = 'FAILED';
            error = err instanceof Error ? err.message : String(err);
            console.error('Daily bill generation job failed:', err);
        }
        await services.scheduledJob.recordCronExecution('daily-bill-generation', status, Date.now() - start, result, error).catch(console.error);
    });

    cron.schedule('0 9 * * *', async () => {
        const start = Date.now();
        let status = 'SUCCESS';
        let error: string | undefined;
        try {
            if (services.subscription) await services.subscription.checkAndSendRenewalReminders();
            if (services.financial) await services.financial.checkAndSendPendingBillReminders();
        } catch (err) {
            status = 'FAILED';
            error = err instanceof Error ? err.message : String(err);
            console.error('Reminder job failed:', err);
        }
        await services.scheduledJob.recordCronExecution('renewal-reminders', status, Date.now() - start, undefined, error).catch(console.error);
    });

    cron.schedule('0 2 * * *', async () => {
        const start = Date.now();
        let status = 'SUCCESS';
        let error: string | undefined;
        try {
            if (services.notification) await services.notification.cleanupOldNotifications();
        } catch (err) {
            status = 'FAILED';
            error = err instanceof Error ? err.message : String(err);
            console.error('Notification cleanup job failed:', err);
        }
        await services.scheduledJob.recordCronExecution('notification-cleanup', status, Date.now() - start, undefined, error).catch(console.error);
    });

    // Seed data BEFORE starting dynamic-cron jobs (so DB settings are available)
    await seedTemplates().catch(console.error);
    await seedSystemSettings().catch(console.error);

    // Start external job cron schedules (a9: now async, reads cron from DB settings)
    await exchangeRateJob.start();
    await aiModelSyncJob.start();

    console.log('✅ All 5 cron jobs registered & scheduled.');

    // Initialize Vector Services (for AI Agent semantic search)
    await initializeVectorServices().catch(err => {
        console.warn('[Startup] Vector services initialization failed (non-critical):', err.message);
    });

    // Seed AI Providers on startup
    if (services.aiProvider) {
        await services.aiProvider.seedBuiltInProviders().catch(console.error);
        
        // Initial sync of AI models on first startup (if no models exist)
        // This ensures models are available immediately after deployment
        console.log('[Startup] Triggering initial AI model sync...');
        services.aiProvider.syncAllProviders().catch(err => {
            console.warn('[Startup] Initial AI model sync failed (non-critical):', err.message);
        });
    }
});
