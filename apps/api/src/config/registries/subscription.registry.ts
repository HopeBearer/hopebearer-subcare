import { RouteVersions } from '../route-registry';
import { controllersV1 } from '../../core/container';
import { authMiddleware } from '../../core/container';

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
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /subscriptions/upcoming': {
    v1: {
      handler: controllersV1.Subscription.upcoming,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'PATCH /subscriptions/:id': {
    v1: {
      handler: controllersV1.Subscription.update,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'DELETE /subscriptions/:id': {
    v1: {
      handler: controllersV1.Subscription.delete,
      middlewares: [authMiddleware.authenticate]
    }
  },
  // New route
  'GET /subscriptions/:id/history': {
    v1: {
      handler: controllersV1.Subscription.history,
      middlewares: [authMiddleware.authenticate]
    }
  }
};
