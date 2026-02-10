import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const feedbackRegistry: Record<string, RouteVersions> = {
  // ===== 管理员接口 =====
  'GET /admin/feedbacks': {
    v1: {
      handler: controllersV1.Feedback.getAll,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/feedbacks/stats': {
    v1: {
      handler: controllersV1.Feedback.getStats,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/feedbacks/:id': {
    v1: {
      handler: controllersV1.Feedback.getById,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'PATCH /admin/feedbacks/:id': {
    v1: {
      handler: controllersV1.Feedback.update,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'DELETE /admin/feedbacks/:id': {
    v1: {
      handler: controllersV1.Feedback.delete,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },

  // ===== 用户接口 =====
  'POST /feedbacks': {
    v1: {
      handler: controllersV1.Feedback.create,
      middlewares: [authMiddleware.authenticate],
    },
  },
  'GET /feedbacks': {
    v1: {
      handler: controllersV1.Feedback.getMyFeedbacks,
      middlewares: [authMiddleware.authenticate],
    },
  },
};
