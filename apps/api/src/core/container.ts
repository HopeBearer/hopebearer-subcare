import { AuthController } from '../controllers/v1/AuthController';
import { SubscriptionController } from '../controllers/v1/SubscriptionController';
import { DashboardController } from '../controllers/v1/DashboardController';
import { UserController } from '../controllers/v1/UserController';
import { NotificationController } from '../controllers/v1/NotificationController';
import { SystemLogController } from '../controllers/v1/SystemLogController';
import { MessageTemplateController } from '../controllers/v1/MessageTemplateController';
import { FinancialController } from '../controllers/v1/FinancialController';
import { CurrencyController } from '../controllers/v1/CurrencyController';
import { AIProviderController } from '../controllers/v1/AIProviderController';
import { CategoryController } from '../controllers/v1/CategoryController';
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
import { AIProviderService } from '../services/AIProviderService';
import { AgentService } from '../services/AgentService';
import { CategoryService } from '../services/CategoryService';
import { WebSearchService } from '../services/WebSearchService';
import { UserRepository } from '../repositories/UserRepository';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { SystemLogRepository } from '../repositories/SystemLogRepository';
import { MessageTemplateRepository } from '../repositories/MessageTemplateRepository';
import { PaymentRecordRepository } from '../repositories/PaymentRecordRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { ExchangeRateRepository } from '../repositories/ExchangeRateRepository';
import { AIProviderRepository } from '../repositories/AIProviderRepository';
import { SearchCacheRepository } from '../repositories/SearchCacheRepository';
import { TemplateRepository } from '../repositories/TemplateRepository';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { NodemailerProvider } from '../infrastructure/email/nodemailer.provider';
import { NotificationService } from '../modules/notification/notification.service';
import { BillGeneratorService } from '../services/BillGeneratorService';
import { AgentController } from '../controllers/AgentController';
import { ChatController } from '../controllers/v1/ChatController';
import { ToolExecutor } from '../infrastructure/ai/tools/ToolExecutor';
import { ChatService } from '../services/ChatService';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageRepository } from '../repositories/MessageRepository';

// Services & Repositories
const userRepository = new UserRepository();
const subscriptionRepository = new SubscriptionRepository();
const systemLogRepository = new SystemLogRepository();
const messageTemplateRepository = new MessageTemplateRepository();
const paymentRecordRepository = new PaymentRecordRepository();
const categoryRepository = new CategoryRepository();
const exchangeRateRepository = new ExchangeRateRepository();
const aiProviderRepository = new AIProviderRepository();
const searchCacheRepository = new SearchCacheRepository();
const templateRepository = new TemplateRepository();
const conversationRepository = new ConversationRepository();
const messageRepository = new MessageRepository();
const tokenService = new TokenService();
const currencyService = new CurrencyService(exchangeRateRepository);
const aiProviderService = new AIProviderService(aiProviderRepository);
const webSearchService = new WebSearchService(searchCacheRepository);

// Infrastructure - moved before ToolExecutor to enable notification injection
const emailProvider = new NodemailerProvider();
// Pass messageTemplateRepository to NotificationService for template rendering
const notificationService = new NotificationService(emailProvider, messageTemplateRepository);

// Services that ToolExecutor depends on (must be created first)
const authService = new AuthService(userRepository, tokenService, notificationService);
const userService = new UserService(userRepository, notificationService);
const billGeneratorService = new BillGeneratorService(subscriptionRepository, paymentRecordRepository, notificationService);

// SubscriptionService (needed by ToolExecutor for proper bill backfilling)
const subscriptionService = new SubscriptionService(
  subscriptionRepository,
  notificationService,
  paymentRecordRepository,
  billGeneratorService
);

// DashboardService (needed by ToolExecutor for spending summary)
const dashboardService = new DashboardService(
  subscriptionRepository,
  userRepository,
  currencyService,
  paymentRecordRepository,
  categoryRepository
);

// CategoryService (needed by ToolExecutor)
const categoryService = new CategoryService(categoryRepository);

// FinancialService (needed by ToolExecutor for bill operations)
const financialService = new FinancialService(
  paymentRecordRepository,
  subscriptionRepository,
  currencyService,
  userRepository,
  billGeneratorService,
  notificationService
);

// Tool Executor for AI Agent - 复用核心服务保持数据一致
const toolExecutor = new ToolExecutor({
  // 核心服务
  currencyService,
  webSearchService,
  subscriptionService,
  dashboardService,
  financialService,
  categoryService,
  // 仓库（仅当服务不提供所需方法时使用）
  subscriptionRepository,
  paymentRecordRepository,
  exchangeRateRepository,
  templateRepository,
  userRepository,
  categoryRepository,
  notificationService
});

// Agent Service with dependencies
const agentService = new AgentService();
agentService.setDependencies({
  toolExecutor,
  currencyService,
  dashboardService
});

// Chat Service
const chatService = new ChatService({
  conversationRepo: conversationRepository,
  messageRepo: messageRepository,
  toolExecutor
});
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
  MessageTemplate: new MessageTemplateController(messageTemplateService),
  Financial: new FinancialController(financialService),
  Currency: new CurrencyController(currencyService),
  Agent: new AgentController(agentService),
  AIProvider: new AIProviderController(aiProviderService),
  Chat: new ChatController(chatService),
  Category: new CategoryController(categoryService)
};

// V2 Controllers
export const controllersV2 = {
  User: new UserControllerV2(userService),
};

// Export services for direct usage if needed
export const services = {
  notification: notificationService,
  email: emailProvider,
  billGenerator: billGeneratorService,
  subscription: subscriptionService,
  financial: financialService,
  currency: currencyService,
  aiProvider: aiProviderService,
  agent: agentService,
  webSearch: webSearchService,
  searchCache: searchCacheRepository,
  chat: chatService,
  category: categoryService
};
