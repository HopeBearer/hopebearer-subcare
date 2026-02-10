import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/UserService';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../../constants/BusinessCode';
import { Role } from '@subcare/database';
import { logger } from '../../infrastructure/logger/logger';

/**
 * 用户控制器
 * 处理与用户管理相关的 HTTP 请求
 */
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * 获取所有用户
   * GET /users
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userService.getAllUsers();
      res.status(StatusCodes.OK).json({ 
        status: 'success', 
        code: BusinessCode.SUCCESS,
        data: { users } 
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取当前用户详情
   * GET /users/profile
   */
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const user = await this.userService.getUserById(userId);
      
      if (!user) {
         // Should not happen if authenticated properly
         throw new Error("User not found");
      }

      res.status(StatusCodes.OK).json({ 
        status: 'success', 
        code: BusinessCode.SUCCESS,
        data: { user } 
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新当前用户资料/偏好
   * PATCH /users/profile
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const { currency, monthlyBudget, name, bio } = req.body;
      
      // Cast to any temporarily until Prisma Client is regenerated with the new field
      const user = await this.userService.updateUser(userId, { currency, monthlyBudget, name, bio } as any);
      
      // Remove sensitive data
      const { password: _p, refreshToken: _r, ...rest } = user;

      res.status(StatusCodes.OK).json({ 
        status: 'success', 
        code: BusinessCode.SUCCESS,
        data: { user: rest },
        message: 'Profile updated'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取用户详情（管理员使用）
   * GET /users/:id/detail
   */
  getDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const detail = await this.userService.getUserDetail(id);
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: detail,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 修改用户角色（管理员使用）
   * PATCH /users/:id/role
   */
  changeRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const operatorId = req.user?.userId;

      if (!role || !Object.values(Role).includes(role)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          code: BusinessCode.BAD_REQUEST,
          message: 'Invalid role. Must be USER or ADMIN.',
        });
      }

      const user = await this.userService.changeUserRole(id, role as Role, operatorId!);

      // Audit log
      logger.audit({
        domain: 'ADMIN',
        action: 'CHANGE_USER_ROLE',
        userId: operatorId,
        ip: req.ip,
        metadata: { targetUserId: id, newRole: role },
      });

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { user },
        message: `User role changed to ${role}`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 禁用用户
   * PATCH /users/:id/disable
   */
  disable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.userService.disableUser(id);

      logger.audit({
        domain: 'ADMIN',
        action: 'DISABLE_USER',
        userId: req.user?.userId,
        ip: req.ip,
        metadata: { targetUserId: id },
      });

      res.status(StatusCodes.OK).json({ 
        status: 'success', 
        code: BusinessCode.SUCCESS,
        message: 'User disabled' 
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 删除用户
   * DELETE /users/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
     try {
      const { id } = req.params;
      await this.userService.deleteUser(id);

      logger.audit({
        domain: 'ADMIN',
        action: 'DELETE_USER',
        userId: req.user?.userId,
        ip: req.ip,
        metadata: { targetUserId: id },
      });

      res.status(StatusCodes.OK).json({ 
        status: 'success', 
        code: BusinessCode.SUCCESS,
        message: 'User deleted' 
      });
    } catch (error) {
      next(error);
    }
  };
}
