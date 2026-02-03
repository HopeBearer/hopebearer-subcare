
import cron from 'node-cron';
import { services } from '../core/container';

const { currency } = { currency: services.currency }; // Access via exported services if possible, or we need to access the instance directly from container.ts if it's not in the 'services' export.
// It seems 'services' in container.ts might NOT have currency service exported.
// I should verify container.ts again. 
// If it's not exported, I should export it or access the variable from container.sh (if it was exported).

/**
 * Exchange Rate Sync Job
 * Runs daily at 01:00 UTC
 */
export const exchangeRateJob = {
    start: () => {
        // 0 1 * * * means 01:00 AM (server time). User asked for UTC 01:00.
        // Docker timezone might be UTC or something else. 
        // Best is to assume server is UTC or handle timezone. 
        // node-cron allows timezone.

        cron.schedule('0 1 * * *', async () => {
            console.log('Running Exchange Rate Sync Job...');
            try {
                // We need to import the currencyService instance. 
                // Access via exported services
                const { services } = await import('../core/container');
                if (services.currency) {
                    await services.currency.syncRates();
                } else {
                    console.warn('Currency service not available for sync job');
                }
                console.log('Exchange Rate Sync Job Completed.');
            } catch (error) {
                console.error('Exchange Rate Sync Job Failed:', error);
            }
        }, {
            timezone: "UTC"
        });

        console.log('Exchange Rate Sync Job scheduled for 01:00 UTC daily.');
    }
};
