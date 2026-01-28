import { AuthController } from '../controllers/v1/AuthController';
import { SubscriptionController } from '../controllers/v1/SubscriptionController';
import { DashboardController } from '../controllers/v1/DashboardController';
import { UserController } from '../controllers/v1/UserController';
import { NotificationController } from '../controllers/v1/NotificationController';
import { SystemLogController } from '../controllers/v1/SystemLogController';
import { MessageTemplateController } from '../controllers/v1/MessageTemplateController';
import { FinancialController } from '../controllers/v1/FinancialController';
import { UserController as UserControllerV2 } from '../controllers/v2/UserController';
import { AuthService } from '../services/AuthService';
import { SubscriptionService } from '../services/SubscriptionService';
import { DashboardService } from '../services/DashboardService';
import { UserService } from '../services/UserService';
import { SystemLogService } from '../services/SystemLogService';
import { MessageTemplateService } from '../services/MessageTemplateService';
import { FinancialService } from '../services/FinancialService';
import { TokenService } from '../services/TokenService';
import { CurrencyService } from '../services/CurrencyService';
import { UserRepository } from '../repositories/UserRepository';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { SystemLogRepository } from '../repositories/SystemLogRepository';
import { MessageTemplateRepository } from '../repositories/MessageTemplateRepository';
import { PaymentRecordRepository } from '../repositories/PaymentRecordRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { NodemailerProvider } from '../infrastructure/email/nodemailer.provider';
import { NotificationService } from '../modules/notification/notification.service';
import { BillGeneratorService } from '../services/BillGeneratorService';

// Services & Repositories
const userRepository = new UserRepository();
const subscriptionRepository = new SubscriptionRepository();
const systemLogRepository = new SystemLogRepository();
const messageTemplateRepository = new MessageTemplateRepository();
const paymentRecordRepository = new PaymentRecordRepository();
const categoryRepository = new CategoryRepository();
const tokenService = new TokenService();
const currencyService = new CurrencyService();

// Infrastructure
const emailProvider = new NodemailerProvider();
// Pass messageTemplateRepository to NotificationService for template rendering
const notificationService = new NotificationService(emailProvider, messageTemplateRepository);

const authService = new AuthService(userRepository, tokenService, notificationService);
const userService = new UserService(userRepository);
const billGeneratorService = new BillGeneratorService(subscriptionRepository, paymentRecordRepository, notificationService);

const subscriptionService = new SubscriptionService(
    subscriptionRepository, 
    notificationService,
    paymentRecordRepository,
    billGeneratorService
);
const dashboardService = new DashboardService(
  subscriptionRepository, 
  userRepository, 
  currencyService, 
  paymentRecordRepository, 
  categoryRepository
);
const systemLogService = new SystemLogService(systemLogRepository);
const messageTemplateService = new MessageTemplateService(messageTemplateRepository);
const financialService = new FinancialService(
    paymentRecordRepository, 
    subscriptionRepository, 
    currencyService, 
    userRepository,
    billGeneratorService
);

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
  MessageTemplate: new MessageTemplateController(messageTemplateService),
  Financial: new FinancialController(financialService)
};

// V2 Controllers
export const controllersV2 = {
  User: new UserControllerV2(userService),
};

// Export services for direct usage if needed
export const services = {
    notification: notificationService,
    email: emailProvider,
    billGenerator: billGeneratorService
};
