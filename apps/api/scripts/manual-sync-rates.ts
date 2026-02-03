
import '../src/setup-env'; // Ensure env vars are loaded
import { services } from '../src/core/container';

async function main() {
    console.log('Starting manual currency rate sync...');

    try {
        if (!services.currency) {
            throw new Error('Currency service not found in container');
        }

        await services.currency.syncRates();
        console.log('Manual sync completed successfully.');
    } catch (error) {
        console.error('Manual sync failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

main();
