import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { UserService } from '../services/UserService';
import { UserRepository } from '../repositories/UserRepository';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { TokenService } from '../services/TokenService';
import { Role } from '@subcare/database';

const router: Router = Router();

// 初始化依赖
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

const tokenService = new TokenService();
const authMiddleware = new AuthMiddleware(tokenService);

// 应用认证中间件，保护所有用户路由
router.use(authMiddleware.authenticate);

// 路由定义 (仅管理员可访问)
router.get('/', authMiddleware.authorize([Role.ADMIN]), userController.list); // 获取用户列表
router.patch('/:id/disable', authMiddleware.authorize([Role.ADMIN]), userController.disable); // 禁用用户
router.delete('/:id', authMiddleware.authorize([Role.ADMIN]), userController.delete); // 删除用户

export default router;
