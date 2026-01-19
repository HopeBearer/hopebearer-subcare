import { Router, Request, Response, NextFunction } from 'express';
import { routeRegistry } from '../../config/route-registry';
import { routeConfig } from '../../config/route-config';
import { AppError } from '../../utils/AppError';
import { StatusCodes } from 'http-status-codes';

export class VersionedRouter {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // 遍历配置中的所有路由
    Object.entries(routeConfig).forEach(([routeKey, version]) => {
      const [method, path] = routeKey.split(' ');
      
      // 检查注册表中是否存在定义
      const routeDef = routeRegistry[routeKey];
      if (!routeDef) {
        console.warn(`Route definition not found for ${routeKey}`);
        return;
      }

      // 获取指定版本的实现
      const implementation = routeDef[version];
      if (!implementation) {
        console.error(`Version ${version} not found for route ${routeKey}`);
        return;
      }

      const { handler, middlewares = [] } = implementation;

      // 注册到 Express Router
      // 这里的 path 需要去除统一前缀（如 /api/v1），或者在 app.ts 中挂载到根路径
      // 假设我们挂载在 /api 下，且这里 path 包含 /auth 等前缀
      
      // 注意：Express Router 方法是小写的 (get, post...)
      const routerMethod = method.toLowerCase() as keyof Router;
      
      if (this.router[routerMethod]) {
        // 使用配置的 handler 和 middlewares
        // 由于 Controller 方法定义为箭头函数 (list = async (...) => {})，
        // 这里的 handler 已经绑定了正确的 this 上下文，无需手动 bind。
        
        (this.router as any)[routerMethod](path, ...middlewares, handler);
        console.log(`Mapped [${method}] ${path} -> ${version}`);
      }
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
