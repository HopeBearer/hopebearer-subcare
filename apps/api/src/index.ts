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
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
  
  // Initialize Cron Jobs
  // Run every day at 00:01
  cron.schedule('1 0 * * *', async () => {
    console.log('Running daily bill generation job...');
    try {
      await services.billGenerator.generateDailyBills();
      console.log('Daily bill generation job completed.');
    } catch (error) {
      console.error('Daily bill generation job failed:', error);
    }
  });
  console.log('Cron jobs scheduled: Daily Bill Generation (00:01)');

  // Optional: Run seeding on startup or via separate script
  await seedTemplates().catch(console.error);
});