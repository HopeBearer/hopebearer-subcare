import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/UserService';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../../constants/BusinessCode';

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
   * 禁用用户
   * PATCH /users/:id/disable
   */
  disable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.userService.disableUser(id);
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
