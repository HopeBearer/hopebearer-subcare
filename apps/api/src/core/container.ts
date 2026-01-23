import { AuthController } from '../controllers/v1/AuthController';
import { SubscriptionController } from '../controllers/v1/SubscriptionController';
import { DashboardController } from '../controllers/v1/DashboardController';
import { UserController } from '../controllers/v1/UserController';
import { NotificationController } from '../controllers/v1/NotificationController';
import { SystemLogController } from '../controllers/v1/SystemLogController';
import { MessageTemplateController } from '../controllers/v1/MessageTemplateController';
import { UserController as UserControllerV2 } from '../controllers/v2/UserController';
import { AuthService } from '../services/AuthService';
import { SubscriptionService } from '../services/SubscriptionService';
import { DashboardService } from '../services/DashboardService';
import { UserService } from '../services/UserService';
import { SystemLogService } from '../services/SystemLogService';
import { MessageTemplateService } from '../services/MessageTemplateService';
import { TokenService } from '../services/TokenService';
import { CurrencyService } from '../services/CurrencyService';
import { UserRepository } from '../repositories/UserRepository';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { SystemLogRepository } from '../repositories/SystemLogRepository';
import { MessageTemplateRepository } from '../repositories/MessageTemplateRepository';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { NodemailerProvider } from '../infrastructure/email/nodemailer.provider';
import { NotificationService } from '../modules/notification/notification.service';

// Services & Repositories
const userRepository = new UserRepository();
const subscriptionRepository = new SubscriptionRepository();
const systemLogRepository = new SystemLogRepository();
const messageTemplateRepository = new MessageTemplateRepository();
const tokenService = new TokenService();
const currencyService = new CurrencyService();

// Infrastructure
const emailProvider = new NodemailerProvider();
// Pass messageTemplateRepository to NotificationService for template rendering
const notificationService = new NotificationService(emailProvider, messageTemplateRepository);

const authService = new AuthService(userRepository, tokenService, notificationService);
const userService = new UserService(userRepository);
const subscriptionService = new SubscriptionService(subscriptionRepository, notificationService);
const dashboardService = new DashboardService(subscriptionRepository, userRepository, currencyService);
const systemLogService = new SystemLogService(systemLogRepository);
const messageTemplateService = new MessageTemplateService(messageTemplateRepository);

// Middleware
export const authMiddleware = new AuthMiddleware(tokenService);

// V1 Controllers
export const controllersV1 = {
  Auth: new AuthController(authService),
  User: new UserController(userService),
  Subscription: new SubscriptionController(subscriptionService),
  Dashboard: new DashboardController(dashboardService),
  Notification: new NotificationController(notificationService),
  SystemLog: new SystemLogController(systemLogService),
  MessageTemplate: new MessageTemplateController(messageTemplateService)
};

// V2 Controllers
export const controllersV2 = {
  User: new UserControllerV2(userService),
  // Reuse V1 for others if not changed, or leave undefined if not supported in V2 specific container
  // For registry, we will point to specific instances.
};

// Export services for direct usage if needed
export const services = {
    notification: notificationService,
    email: emailProvider
};
