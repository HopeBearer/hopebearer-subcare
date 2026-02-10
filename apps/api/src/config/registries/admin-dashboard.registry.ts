import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const adminDashboardRegistry: Record<string, RouteVersions> = {
  'GET /admin/stats': {
    v1: {
      handler: controllersV1.AdminDashboard.getStats,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/stats/users': {
    v1: {
      handler: controllersV1.AdminDashboard.getUserGrowth,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/stats/subscriptions': {
    v1: {
      handler: controllersV1.AdminDashboard.getSubscriptionStats,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
};
