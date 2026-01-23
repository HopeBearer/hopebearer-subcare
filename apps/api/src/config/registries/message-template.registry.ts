import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

// TODO: Admin middleware
export const messageTemplateRegistry: Record<string, RouteVersions> = {
  'POST /message-templates': {
    v1: {
      handler: (req, res, next) => controllersV1.MessageTemplate.create(req, res).catch(next),
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /message-templates': {
    v1: {
      handler: (req, res, next) => controllersV1.MessageTemplate.list(req, res).catch(next),
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /message-templates/:id': {
    v1: {
      handler: (req, res, next) => controllersV1.MessageTemplate.get(req, res).catch(next),
      middlewares: [authMiddleware.authenticate]
    }
  },
  'PATCH /message-templates/:id': {
    v1: {
      handler: (req, res, next) => controllersV1.MessageTemplate.update(req, res).catch(next),
      middlewares: [authMiddleware.authenticate]
    }
  },
  'DELETE /message-templates/:id': {
    v1: {
      handler: (req, res, next) => controllersV1.MessageTemplate.delete(req, res).catch(next),
      middlewares: [authMiddleware.authenticate]
    }
  }
};
