import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const scheduledJobRegistry: Record<string, RouteVersions> = {
  'GET /admin/jobs': {
    v1: {
      handler: controllersV1.ScheduledJob.getJobs,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/jobs/:id': {
    v1: {
      handler: controllersV1.ScheduledJob.getJobDetail,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'POST /admin/jobs/:name/trigger': {
    v1: {
      handler: controllersV1.ScheduledJob.triggerJob,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'PATCH /admin/jobs/:id/toggle': {
    v1: {
      handler: controllersV1.ScheduledJob.toggleJob,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
};
