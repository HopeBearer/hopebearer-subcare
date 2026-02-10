import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const messageTemplateRegistry: Record<string, RouteVersions> = {
  'POST /message-templates': {
    v1: {
      handler: controllersV1.MessageTemplate.create,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /message-templates': {
    v1: {
      handler: controllersV1.MessageTemplate.list,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /message-templates/:id': {
    v1: {
      handler: controllersV1.MessageTemplate.get,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'PATCH /message-templates/:id': {
    v1: {
      handler: controllersV1.MessageTemplate.update,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'DELETE /message-templates/:id': {
    v1: {
      handler: controllersV1.MessageTemplate.delete,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
};
