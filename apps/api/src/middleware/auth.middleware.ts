import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/TokenService';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { Role } from '@subcare/database';

/**
 * 认证和授权中间件
 */
export class AuthMiddleware {
  constructor(private tokenService: TokenService) {}

  /**
   * 认证中间件
   * 验证请求头中的 Bearer Token，如果有效则将用户信息注入到 req.user
   */
  authenticate = (req: Request, res: Response, next: NextFunction) => {
    // 获取 Authorization 头
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('TOKEN_MISSING', StatusCodes.UNAUTHORIZED, { message: 'No token provided' }));
    }

    // 提取 Token
    const token = authHeader.split(' ')[1];
    try {
      // 验证 Token
      const payload = this.tokenService.verifyAccessToken(token) as any;
      // 将用户信息存入请求对象
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch (error) {
      next(new AppError('TOKEN_INVALID', StatusCodes.UNAUTHORIZED, { message: 'Invalid token' }));
    }
  };

  /**
   * 授权中间件
   * 检查用户角色是否在允许的角色列表中
   * @param roles 允许的角色列表
   */
  authorize = (roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // 确保用户已通过认证
      if (!req.user) {
        return next(new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, { message: 'Not authenticated' }));
      }

      // 检查角色权限
      if (!roles.includes(req.user.role)) {
        return next(new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, { message: 'Not authorized' }));
      }

      next();
    };
  };
}
