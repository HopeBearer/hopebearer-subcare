import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const aiProviderRegistry: Record<string, RouteVersions> = {
  'GET /ai-providers': {
    v1: { 
      handler: controllersV1.AIProvider.getProviders,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /ai-providers/:id': {
    v1: { 
      handler: controllersV1.AIProvider.getProviderById,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /ai-providers/:id/models': {
    v1: { 
      handler: controllersV1.AIProvider.getModels,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'POST /ai-providers/:id/models': {
    v1: { 
      handler: controllersV1.AIProvider.fetchModels,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /ai-providers/slug/:slug/models': {
    v1: { 
      handler: controllersV1.AIProvider.getModelsBySlug,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'POST /ai-providers/:id/sync': {
    v1: { 
      handler: controllersV1.AIProvider.syncProvider,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin]
    }
  },
  'POST /ai-providers/sync-all': {
    v1: { 
      handler: controllersV1.AIProvider.syncAllProviders,
      middlewares: [authMiddleware.authenticate, authMiddleware.requireAdmin]
    }
  }
};
