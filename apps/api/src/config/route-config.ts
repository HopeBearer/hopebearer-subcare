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

  // Subscriptions
  'POST /subscriptions': 'v1',
  'GET /subscriptions': 'v1',
  'GET /subscriptions/stats': 'v1',

  // Users
  'GET /users': 'v2', // Switched to v2
  'PATCH /users/:id/disable': 'v2', // Switched to v2
  'DELETE /users/:id': 'v2' // Switched to v2
};
