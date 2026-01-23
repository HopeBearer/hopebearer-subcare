import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const dashboardRegistry: Record<string, RouteVersions> = {
  'GET /dashboard/stats': {
    v1: { 
      handler: controllersV1.Dashboard.getStats,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /dashboard/trend': {
    v1: { 
      handler: controllersV1.Dashboard.getTrend,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /dashboard/distribution': {
    v1: { 
      handler: controllersV1.Dashboard.getDistribution,
      middlewares: [authMiddleware.authenticate]
    }
  }
};
