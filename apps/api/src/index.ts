import './setup-env'; // 必须最先导入，以确保环境变量加载
import app from './app';
import http from 'http';
import { seedTemplates } from './utils/seed-templates';
import cron from 'node-cron';
import { services } from './core/container';
import { SocketService } from './infrastructure/socket/socket.service';
import { TokenService } from './services/TokenService';

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

// 启动服务器
server.listen(PORT, async () => {
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

  // Run every day at 09:00 AM (Good time for reminders)
  cron.schedule('0 9 * * *', async () => {
      try {
          if (services.subscription) {
              await services.subscription.checkAndSendRenewalReminders();
          }
          if (services.financial) {
              await services.financial.checkAndSendPendingBillReminders();
          }
      } catch (error) {
          console.error('Reminder job failed:', error);
      }
  });

  // Run every day at 02:00
  cron.schedule('0 2 * * *', async () => {
      try {
          if (services.notification) {
              await services.notification.cleanupOldNotifications();
          }
      } catch (error) {
          console.error('Notification cleanup job failed:', error);
      }
  });

  console.log('Cron jobs scheduled: Daily Bill Generation (00:01), Notification Cleanup (02:00)');

  // Optional: Run seeding on startup or via separate script
  await seedTemplates().catch(console.error);
});
