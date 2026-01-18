import { Role } from '@subcare/database';

// 扩展 Express 的全局类型定义
declare global {
  namespace Express {
    // 扩展 Request 接口，添加 user 属性
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
