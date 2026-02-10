import { RouteVersions } from '../route-registry';
import { controllersV1 } from '../../core/container';
import { authMiddleware } from '../../core/container';

export const categoryRegistry: Record<string, RouteVersions> = {
  // Read: all authenticated users
  'GET /categories': {
    v1: {
      handler: controllersV1.Category.list,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /categories/:id': {
    v1: {
      handler: controllersV1.Category.getById,
      middlewares: [authMiddleware.authenticate]
    }
  },
  // Write: admin only (system-level categories)
  'POST /categories': {
    v1: {
      handler: controllersV1.Category.create,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin]
    }
  },
  'PATCH /categories/:id': {
    v1: {
      handler: controllersV1.Category.update,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin]
    }
  },
  'DELETE /categories/:id': {
    v1: {
      handler: controllersV1.Category.delete,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin]
    }
  }
};
