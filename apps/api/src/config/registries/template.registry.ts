import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const templateRegistry: Record<string, RouteVersions> = {
  'GET /templates': {
    v1: {
      handler: controllersV1.Template.list,
      middlewares: [authMiddleware.authenticate],
    },
  },
  'GET /templates/categories': {
    v1: {
      handler: controllersV1.Template.getCategories,
      middlewares: [authMiddleware.authenticate],
    },
  },
  'GET /templates/:id': {
    v1: {
      handler: controllersV1.Template.getById,
      middlewares: [authMiddleware.authenticate],
    },
  },
  'POST /templates': {
    v1: {
      handler: controllersV1.Template.create,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'PATCH /templates/:id': {
    v1: {
      handler: controllersV1.Template.update,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'DELETE /templates/:id': {
    v1: {
      handler: controllersV1.Template.delete,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
};
