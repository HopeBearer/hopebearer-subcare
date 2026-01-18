import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { TokenService } from '../services/TokenService';

const router: Router = Router();

// 初始化依赖
const userRepository = new UserRepository();
const tokenService = new TokenService();
const authService = new AuthService(userRepository, tokenService);
const authController = new AuthController(authService);

// 注册路由
router.post('/register', authController.register); // 用户注册
router.post('/login', authController.login);       // 用户登录
router.post('/refresh', authController.refresh);   // 刷新 Token

export default router;
