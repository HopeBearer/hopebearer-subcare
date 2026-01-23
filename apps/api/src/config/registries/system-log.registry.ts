import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

// TODO: Add Admin Role Middleware
export const systemLogRegistry: Record<string, RouteVersions> = {
  'GET /system-logs': {
    v1: {
      handler: (req, res, next) => controllersV1.SystemLog.getLogs(req, res).catch(next),
      middlewares: [authMiddleware.authenticate] // Should restrict to admin
    }
  },
  'GET /system-logs/:id': {
    v1: {
      handler: (req, res, next) => controllersV1.SystemLog.getLogById(req, res).catch(next),
      middlewares: [authMiddleware.authenticate] // Should restrict to admin
    }
  }
};
