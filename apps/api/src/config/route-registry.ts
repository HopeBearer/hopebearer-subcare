import { RequestHandler } from 'express';
import { authRegistry } from './registries/auth.registry';
import { subscriptionRegistry } from './registries/subscription.registry';
import { userRegistry } from './registries/user.registry';

export interface RouteImplementation {
  handler: RequestHandler;
  middlewares?: RequestHandler[];
}

export interface RouteVersions {
  [version: string]: RouteImplementation;
}

/**
 * 路由注册表
 * 聚合所有模块的路由定义
 */
export const routeRegistry: Record<string, RouteVersions> = {
  ...authRegistry,
  ...subscriptionRegistry,
  ...userRegistry,
};
