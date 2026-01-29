import './setup-env'; // 必须最先导入，以确保环境变量加载
import app from './app';
import { seedTemplates } from './utils/seed-templates';
import cron from 'node-cron';
import { services } from './core/container';

const PORT = process.env.PORT || 3001;

// 启动服务器
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  
  // Initialize Cron Jobs
  // Run every day at 00:01
  cron.schedule('1 0 * * *', async () => {
    try {
      await services.billGenerator.generateDailyBills();
    } catch (error) {
      console.error('Daily bill generation job failed:', error);
    }
  });
  console.log('Cron jobs scheduled: Daily Bill Generation (00:01)');

  // Optional: Run seeding on startup or via separate script
  await seedTemplates().catch(console.error);
});