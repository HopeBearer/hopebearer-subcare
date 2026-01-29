import { RequestHandler } from 'express';
import { authRegistry } from './registries/auth.registry';
import { subscriptionRegistry } from './registries/subscription.registry';
import { userRegistry } from './registries/user.registry';
import { dashboardRegistry } from './registries/dashboard.registry';
import { notificationRegistry } from './registries/notification.registry';
import { systemLogRegistry } from './registries/system-log.registry';
import { messageTemplateRegistry } from './registries/message-template.registry';
import { financialRegistry } from './registries/financial.registry';
import { currencyRegistry } from './registries/currency.registry';

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
  ...dashboardRegistry,
  ...notificationRegistry,
  ...systemLogRegistry,
  ...messageTemplateRegistry,
  ...financialRegistry,
  ...currencyRegistry,
};
