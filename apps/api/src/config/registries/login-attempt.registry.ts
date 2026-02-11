import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const loginAttemptRegistry: Record<string, RouteVersions> = {
  'GET /admin/login-attempts': {
    v1: {
      handler: controllersV1.LoginAttempt.getList,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/login-attempts/stats': {
    v1: {
      handler: controllersV1.LoginAttempt.getStats,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'DELETE /admin/login-attempts/:id': {
    v1: {
      handler: controllersV1.LoginAttempt.unfreeze,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'POST /admin/login-attempts/clean': {
    v1: {
      handler: controllersV1.LoginAttempt.cleanExpired,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
};
