import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const notificationRegistry: Record<string, RouteVersions> = {
  'GET /notifications': {
    v1: {
      handler: (req, res, next) => controllersV1.Notification.getNotifications(req, res).catch(next),
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /notifications/unread-count': {
    v1: {
      handler: (req, res, next) => controllersV1.Notification.getUnreadCount(req, res).catch(next),
      middlewares: [authMiddleware.authenticate]
    }
  },
  'PATCH /notifications/:id/read': {
    v1: {
      handler: (req, res, next) => controllersV1.Notification.markAsRead(req, res).catch(next),
      middlewares: [authMiddleware.authenticate]
    }
  },
  'PATCH /notifications/read-all': {
    v1: {
      handler: (req, res, next) => controllersV1.Notification.markAllAsRead(req, res).catch(next),
      middlewares: [authMiddleware.authenticate]
    }
  }
};
