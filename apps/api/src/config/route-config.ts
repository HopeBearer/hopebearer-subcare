/**
 * 路由版本配置
 * Key: METHOD Path
 * Value: Version
 * 
 * 修改此配置即可切换接口版本
 */
export const routeConfig: Record<string, string> = {
  // Auth
  'POST /auth/register': 'v1',
  'POST /auth/login': 'v1',
  'POST /auth/refresh': 'v1',
  'POST /auth/forgot-password': 'v1',
  'POST /auth/reset-password': 'v1',
  'POST /auth/verify-reset-token': 'v1',
  'POST /auth/verification-code/register': 'v1',
  'POST /auth/verification-code/send': 'v1',
  'POST /auth/change-password': 'v1',
  'GET /auth/captcha': 'v1',
  'GET /auth/public-key': 'v1',

  // Subscriptions
  'POST /subscriptions': 'v1',
  'GET /subscriptions': 'v1',
  'PATCH /subscriptions/:id': 'v1',
  'DELETE /subscriptions/:id': 'v1',
  'GET /subscriptions/stats': 'v1',
  'GET /subscriptions/upcoming': 'v1',
  'GET /subscriptions/check-conflict': 'v1',
  'GET /subscriptions/names': 'v1',
  'GET /subscriptions/:id/history': 'v1', // New

  // Dashboard
  'GET /dashboard/stats': 'v1',
  'GET /dashboard/trend': 'v1',
  'GET /dashboard/distribution': 'v1',

  // Financial Analysis
  'GET /finance/overview': 'v1', // New
  'GET /finance/history': 'v1',  // New
  'GET /finance/pending': 'v1',
  'PATCH /finance/records/:id/confirm': 'v1',
  'POST /finance/records/:id/cancel': 'v1',

  // Currency
  'GET /currencies': 'v1',
  'GET /currency/convert': 'v1',
  'GET /currency/preview-convert': 'v1',

  // Agent (AI)
  'POST /agent/config': 'v1',
  'POST /agent/models': 'v1',
  'GET /agent/config': 'v1',
  'GET /agent/recommendations': 'v1',

  // AI Providers & Models
  'GET /ai-providers': 'v1',
  'POST /ai-providers': 'v1',
  'GET /ai-providers/:id': 'v1',
  'PATCH /ai-providers/:id': 'v1',
  'GET /ai-providers/:id/models': 'v1',
  'POST /ai-providers/:id/models': 'v1',
  'POST /ai-providers/:id/models/manual': 'v1',
  'DELETE /ai-providers/:id/models/:modelId': 'v1',
  'GET /ai-providers/slug/:slug/models': 'v1',
  'POST /ai-providers/:id/sync': 'v1',
  'POST /ai-providers/sync-all': 'v1',

  // Users
  'GET /users': 'v2',
  'GET /users/profile': 'v1', // Profile before :id
  'PATCH /users/profile': 'v1',
  'PATCH /users/:id/disable': 'v2',
  'DELETE /users/:id': 'v2',

  // Notifications
  'GET /notifications': 'v1',
  'GET /notifications/settings': 'v1',
  'PATCH /notifications/settings': 'v1',
  'PATCH /notifications/settings/category': 'v1',
  'GET /notifications/unread-count': 'v1',
  'PATCH /notifications/:id/read': 'v1',
  'PATCH /notifications/read-all': 'v1',

  // System Logs
  'GET /system-logs': 'v1',
  'GET /system-logs/export': 'v1',
  'GET /system-logs/:id': 'v1',

  // Message Templates
  'POST /message-templates': 'v1',
  'GET /message-templates': 'v1',
  'GET /message-templates/:id': 'v1',
  'PATCH /message-templates/:id': 'v1',
  'DELETE /message-templates/:id': 'v1',

  // Chat (AI Conversations)
  'POST /chat/conversations': 'v1',
  'GET /chat/conversations': 'v1',
  'GET /chat/conversations/:id': 'v1',
  'PATCH /chat/conversations/:id': 'v1',
  'DELETE /chat/conversations/:id': 'v1',
  'GET /chat/conversations/:id/messages': 'v1',
  'POST /chat/conversations/:id/messages': 'v1',

  // Categories
  'GET /categories': 'v1',
  'GET /categories/:id': 'v1',
  'POST /categories': 'v1',
  'PATCH /categories/:id': 'v1',
  'DELETE /categories/:id': 'v1',

  // Admin Dashboard
  'GET /admin/stats': 'v1',
  'GET /admin/stats/users': 'v1',
  'GET /admin/stats/subscriptions': 'v1',

  // Admin Management - Exchange Rates
  'GET /admin/exchange-rates': 'v1',
  'POST /admin/exchange-rates/sync': 'v1',
  'PATCH /admin/exchange-rates/:id': 'v1',

  // Admin Management - Payments
  'GET /admin/payments': 'v1',
  'GET /admin/payments/stats': 'v1',

  // Admin Management - Notifications
  'GET /admin/notifications': 'v1',
  'GET /admin/notifications/stats': 'v1',
  'POST /admin/notifications/broadcast': 'v1',

  // Admin Management - AI Chat
  'GET /admin/ai-chat/stats': 'v1',
  'GET /admin/ai-chat/conversations': 'v1',

  // Admin Management - Search Usage
  'GET /admin/search-usage': 'v1',
  'POST /admin/search-usage/clean-cache': 'v1',
  'PATCH /admin/search-usage/limit': 'v1',

  // Admin Management - User AI Configs
  'GET /admin/user-ai-configs/stats': 'v1',

  // Admin - User Management (extended)
  'GET /users/:id/detail': 'v1',
  'PATCH /users/:id/role': 'v1',

  // Subscription Templates
  'GET /templates': 'v1',
  'GET /templates/categories': 'v1',
  'GET /templates/:id': 'v1',
  'POST /templates': 'v1',
  'PATCH /templates/:id': 'v1',
  'DELETE /templates/:id': 'v1',

  // Admin - System Settings
  'GET /admin/settings': 'v1',
  'GET /admin/settings/groups': 'v1',
  'GET /admin/settings/:key': 'v1',
  'PUT /admin/settings': 'v1',
  'PATCH /admin/settings/batch': 'v1',
  'DELETE /admin/settings/:id': 'v1',

  // Admin - Scheduled Jobs
  'GET /admin/jobs': 'v1',
  'GET /admin/jobs/:id': 'v1',
  'POST /admin/jobs/:name/trigger': 'v1',
  'PATCH /admin/jobs/:id/toggle': 'v1',

  // Admin - Feedbacks
  'GET /admin/feedbacks': 'v1',
  'GET /admin/feedbacks/stats': 'v1',
  'GET /admin/feedbacks/:id': 'v1',
  'PATCH /admin/feedbacks/:id': 'v1',
  'DELETE /admin/feedbacks/:id': 'v1',

  // User - Feedbacks
  'POST /feedbacks': 'v1',
  'GET /feedbacks': 'v1',

  // Admin - API Analytics
  'GET /admin/api-analytics/overview': 'v1',
  'GET /admin/api-analytics/trend': 'v1',
  'GET /admin/api-analytics/hourly': 'v1',
  'GET /admin/api-analytics/top-endpoints': 'v1',
  'GET /admin/api-analytics/errors': 'v1',
  'GET /admin/api-analytics/top-users': 'v1'
};
