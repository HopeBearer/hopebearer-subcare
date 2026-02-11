import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const systemSettingRegistry: Record<string, RouteVersions> = {
  // a11: 公开接口，前端读取站点设置（无需认证）
  'GET /settings/public': {
    v1: {
      handler: controllersV1.SystemSetting.getPublicSettings,
    },
  },
  'GET /admin/settings': {
    v1: {
      handler: controllersV1.SystemSetting.getSettings,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/settings/groups': {
    v1: {
      handler: controllersV1.SystemSetting.getGroups,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'GET /admin/settings/:key': {
    v1: {
      handler: controllersV1.SystemSetting.getSettingByKey,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'PUT /admin/settings': {
    v1: {
      handler: controllersV1.SystemSetting.upsertSetting,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'PATCH /admin/settings/batch': {
    v1: {
      handler: controllersV1.SystemSetting.batchUpdate,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
  'DELETE /admin/settings/:id': {
    v1: {
      handler: controllersV1.SystemSetting.deleteSetting,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin],
    },
  },
};
