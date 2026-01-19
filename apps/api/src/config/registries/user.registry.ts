import { controllersV1, controllersV2, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';
import { Role } from '@subcare/database';

export const userRegistry: Record<string, RouteVersions> = {
  'GET /users': {
    v1: { 
      handler: controllersV1.User.list,
      middlewares: [authMiddleware.authenticate, authMiddleware.authorize([Role.ADMIN])]
    },
    v2: { 
      handler: controllersV2.User.list,
      middlewares: [authMiddleware.authenticate, authMiddleware.authorize([Role.ADMIN])]
    }
  },
  'PATCH /users/:id/disable': {
    v1: { 
      handler: controllersV1.User.disable,
      middlewares: [authMiddleware.authenticate, authMiddleware.authorize([Role.ADMIN])]
    },
    v2: { 
      handler: controllersV2.User.disable,
      middlewares: [authMiddleware.authenticate, authMiddleware.authorize([Role.ADMIN])]
    }
  },
  'DELETE /users/:id': {
    v1: { 
      handler: controllersV1.User.delete,
      middlewares: [authMiddleware.authenticate, authMiddleware.authorize([Role.ADMIN])]
    },
    v2: { 
      handler: controllersV2.User.delete,
      middlewares: [authMiddleware.authenticate, authMiddleware.authorize([Role.ADMIN])]
    }
  }
};
