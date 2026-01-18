import { Router } from 'express';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { SubscriptionService } from '../services/SubscriptionService';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { TokenService } from '../services/TokenService';
import { Role } from '@subcare/database';

const router: Router = Router();

// 初始化依赖
const subscriptionRepository = new SubscriptionRepository();
const subscriptionService = new SubscriptionService(subscriptionRepository);
const subscriptionController = new SubscriptionController(subscriptionService);

const tokenService = new TokenService();
const authMiddleware = new AuthMiddleware(tokenService);

// 应用认证中间件，保护所有订阅路由
router.use(authMiddleware.authenticate);

// 统计路由 (仅管理员)
router.get('/stats', authMiddleware.authorize([Role.ADMIN]), subscriptionController.stats);

// 普通用户路由
router.post('/', subscriptionController.create); // 创建订阅
router.get('/', subscriptionController.list);    // 获取我的订阅列表

export default router;
