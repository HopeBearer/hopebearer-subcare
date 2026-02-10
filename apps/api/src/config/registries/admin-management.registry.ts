import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const adminManagementRegistry: Record<string, RouteVersions> = {
  // ===== 汇率管理 =====
  'GET /admin/exchange-rates': {
    v1: {
      handler: controllersV1.AdminManagement.getExchangeRates,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'POST /admin/exchange-rates/sync': {
    v1: {
      handler: controllersV1.AdminManagement.syncExchangeRates,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'PATCH /admin/exchange-rates/:id': {
    v1: {
      handler: controllersV1.AdminManagement.updateExchangeRate,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },

  // ===== 支付记录总览 =====
  'GET /admin/payments': {
    v1: {
      handler: controllersV1.AdminManagement.getPaymentRecords,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/payments/stats': {
    v1: {
      handler: controllersV1.AdminManagement.getPaymentStats,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },

  // ===== 通知管理 =====
  'GET /admin/notifications': {
    v1: {
      handler: controllersV1.AdminManagement.getNotifications,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/notifications/stats': {
    v1: {
      handler: controllersV1.AdminManagement.getNotificationStats,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'POST /admin/notifications/broadcast': {
    v1: {
      handler: controllersV1.AdminManagement.broadcastNotification,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },

  // ===== AI 对话监控 =====
  'GET /admin/ai-chat/stats': {
    v1: {
      handler: controllersV1.AdminManagement.getAIChatStats,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/ai-chat/conversations': {
    v1: {
      handler: controllersV1.AdminManagement.getConversations,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },

  // ===== 搜索用量管理 =====
  'GET /admin/search-usage': {
    v1: {
      handler: controllersV1.AdminManagement.getSearchUsageStats,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'POST /admin/search-usage/clean-cache': {
    v1: {
      handler: controllersV1.AdminManagement.cleanExpiredCache,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'PATCH /admin/search-usage/limit': {
    v1: {
      handler: controllersV1.AdminManagement.updateSearchLimit,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },

  // ===== 用户 AI 配置概览 =====
  'GET /admin/user-ai-configs/stats': {
    v1: {
      handler: controllersV1.AdminManagement.getUserAIConfigStats,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },

  // ===== API 使用分析 =====
  'GET /admin/api-analytics/overview': {
    v1: {
      handler: controllersV1.AdminManagement.getApiAnalyticsOverview,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/api-analytics/trend': {
    v1: {
      handler: controllersV1.AdminManagement.getApiAnalyticsTrend,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/api-analytics/hourly': {
    v1: {
      handler: controllersV1.AdminManagement.getApiAnalyticsHourly,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/api-analytics/top-endpoints': {
    v1: {
      handler: controllersV1.AdminManagement.getApiTopEndpoints,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/api-analytics/errors': {
    v1: {
      handler: controllersV1.AdminManagement.getApiErrorTrend,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/api-analytics/top-users': {
    v1: {
      handler: controllersV1.AdminManagement.getApiTopUsers,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
};
