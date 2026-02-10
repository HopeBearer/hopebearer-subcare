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
import { agentRegistry } from './registries/agent.registry';
import { aiProviderRegistry } from './registries/ai-provider.registry';
import { chatRegistry } from './registries/chat.registry';
import { categoryRegistry } from './registries/category.registry';
import { adminDashboardRegistry } from './registries/admin-dashboard.registry';
import { adminManagementRegistry } from './registries/admin-management.registry';
import { templateRegistry } from './registries/template.registry';
import { systemSettingRegistry } from './registries/system-setting.registry';
import { scheduledJobRegistry } from './registries/scheduled-job.registry';
import { feedbackRegistry } from './registries/feedback.registry';

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
  ...agentRegistry,
  ...aiProviderRegistry,
  ...chatRegistry,
  ...categoryRegistry,
  ...adminDashboardRegistry,
  ...adminManagementRegistry,
  ...templateRegistry,
  ...systemSettingRegistry,
  ...scheduledJobRegistry,
  ...feedbackRegistry,
};
