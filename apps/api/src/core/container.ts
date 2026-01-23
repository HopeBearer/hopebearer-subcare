import { AuthController } from '../controllers/v1/AuthController';
import { SubscriptionController } from '../controllers/v1/SubscriptionController';
import { DashboardController } from '../controllers/v1/DashboardController';
import { UserController } from '../controllers/v1/UserController';
import { UserController as UserControllerV2 } from '../controllers/v2/UserController';
import { AuthService } from '../services/AuthService';
import { SubscriptionService } from '../services/SubscriptionService';
import { DashboardService } from '../services/DashboardService';
import { UserService } from '../services/UserService';
import { TokenService } from '../services/TokenService';
import { CurrencyService } from '../services/CurrencyService';
import { UserRepository } from '../repositories/UserRepository';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { AuthMiddleware } from '../middleware/auth.middleware';

// Services & Repositories
const userRepository = new UserRepository();
const subscriptionRepository = new SubscriptionRepository();
const tokenService = new TokenService();
const currencyService = new CurrencyService();

const authService = new AuthService(userRepository, tokenService);
const userService = new UserService(userRepository);
const subscriptionService = new SubscriptionService(subscriptionRepository);
const dashboardService = new DashboardService(subscriptionRepository, userRepository, currencyService);

// Middleware
export const authMiddleware = new AuthMiddleware(tokenService);

// V1 Controllers
export const controllersV1 = {
  Auth: new AuthController(authService),
  User: new UserController(userService),
  Subscription: new SubscriptionController(subscriptionService),
  Dashboard: new DashboardController(dashboardService)
};

// V2 Controllers
export const controllersV2 = {
  User: new UserControllerV2(userService),
  // Reuse V1 for others if not changed, or leave undefined if not supported in V2 specific container
  // For registry, we will point to specific instances.
};
