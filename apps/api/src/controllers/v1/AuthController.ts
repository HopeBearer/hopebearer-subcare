import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/AuthService';
import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../../constants/BusinessCode';

// 注册请求验证 schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

// 登录请求验证 schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// 刷新 Token 请求验证 schema
const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

/**
 * 认证控制器
 * 处理所有与认证相关的 HTTP 请求
 */
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 处理用户注册
   * POST /auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证请求体
      const validatedData = registerSchema.parse(req.body);
      // 调用服务层注册逻辑
      const result = await this.authService.register(validatedData);
      
      // 返回创建成功响应
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        code: BusinessCode.CREATED,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 处理用户登录
   * POST /auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证请求体
      const validatedData = loginSchema.parse(req.body);
      // 调用服务层登录逻辑
      const result = await this.authService.login(validatedData);
      
      // 返回登录成功响应
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 处理 Token 刷新
   * POST /auth/refresh
   */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证请求体
      const validatedData = refreshTokenSchema.parse(req.body);
      // 调用服务层刷新逻辑
      const result = await this.authService.refresh(validatedData.refreshToken);

      // 返回新 Token
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
