import { Router } from 'express';
import authRoutes from './auth.routes';
import subscriptionRoutes from './subscription.routes';
import userRoutes from './user.routes';

const router: Router = Router();

/**
 * API 路由注册
 * 统一前缀 /v1
 */
router.use('/v1/auth', authRoutes);                 // 认证模块
router.use('/v1/subscriptions', subscriptionRoutes); // 订阅模块
router.use('/v1/users', userRoutes);                 // 用户模块

export default router;
