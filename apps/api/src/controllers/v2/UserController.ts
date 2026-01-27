import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../services/UserService';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../../constants/BusinessCode';

/**
 * 用户控制器 V2
 * 示例：返回数据结构发生变化
 */
export class UserController {
  constructor(private userService: UserService) {}

  /**                                                                                                     
   * 获取所有用户 (V2)
   * GET /users
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userService.getAllUsers();
      // V2 变更：返回 meta 信息
      res.status(StatusCodes.OK).json({ 
        apiVersion: 'v2.0',
        status: 'success', 
        code: BusinessCode.SUCCESS,
        data: { 
          users,
          meta: {
            total: users.length,
            page: 1
          }
        } 
      });
    } catch (error) {
      next(error);
    }
  };

  // ... 其他方法可以复用或覆盖
  disable = async (req: Request, res: Response, next: NextFunction) => {
      // 简单复用逻辑，实际中可能不同
      try {
        const { id } = req.params;
        await this.userService.disableUser(id);
        res.status(StatusCodes.OK).json({ 
          apiVersion: 'v2.0',
          status: 'success', 
          code: BusinessCode.SUCCESS,
          message: 'User disabled (v2)' 
        });
      } catch (error) {
        next(error);
      }
  };

   delete = async (req: Request, res: Response, next: NextFunction) => {
     try {
      const { id } = req.params;
      await this.userService.deleteUser(id);
      res.status(StatusCodes.OK).json({ 
        apiVersion: 'v2.0',
        status: 'success', 
        code: BusinessCode.SUCCESS,
        message: 'User deleted (v2)' 
      });
    } catch (error) {
      next(error);
    }
  };
}
