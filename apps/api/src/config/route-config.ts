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
  'GET /currency/preview-convert': 'v1',

  // Agent (AI)
  'POST /agent/config': 'v1',
  'GET /agent/config': 'v1',
  'GET /agent/recommendations': 'v1',

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
  'GET /system-logs/:id': 'v1',

  // Message Templates
  'POST /message-templates': 'v1',
  'GET /message-templates': 'v1',
  'GET /message-templates/:id': 'v1',
  'PATCH /message-templates/:id': 'v1',
  'DELETE /message-templates/:id': 'v1'
};
