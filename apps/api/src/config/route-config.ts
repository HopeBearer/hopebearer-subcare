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
  'GET /auth/captcha': 'v1',

  // Subscriptions
  'POST /subscriptions': 'v1',
  'GET /subscriptions': 'v1',
  'PATCH /subscriptions/:id': 'v1',
  'DELETE /subscriptions/:id': 'v1',
  'GET /subscriptions/stats': 'v1',
  'GET /subscriptions/upcoming': 'v1',

  // Dashboard
  'GET /dashboard/stats': 'v1',
  'GET /dashboard/trend': 'v1',
  'GET /dashboard/distribution': 'v1',

  // Users
  'GET /users': 'v2', // Switched to v2
  'PATCH /users/:id/disable': 'v2', // Switched to v2
  'DELETE /users/:id': 'v2', // Switched to v2

  // Notifications
  'GET /notifications': 'v1',
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
