import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';
import { Role } from '@subcare/database';

export const subscriptionRegistry: Record<string, RouteVersions> = {
  'POST /subscriptions': {
    v1: { 
      handler: controllersV1.Subscription.create,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /subscriptions': {
    v1: { 
      handler: controllersV1.Subscription.list,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /subscriptions/stats': {
    v1: { 
      handler: controllersV1.Subscription.stats,
      middlewares: [authMiddleware.authenticate, authMiddleware.authorize([Role.ADMIN])]
    }
  },
};
