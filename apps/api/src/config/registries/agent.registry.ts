import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const agentRegistry: Record<string, RouteVersions> = {
  'POST /agent/config': {
    v1: { 
      handler: controllersV1.Agent.configure,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /agent/config': {
    v1: { 
      handler: controllersV1.Agent.getConfig,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /agent/recommendations': {
    v1: { 
      handler: controllersV1.Agent.getRecommendations,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'POST /agent/models': {
    v1: { 
      handler: controllersV1.Agent.getModels,
      middlewares: [authMiddleware.authenticate]
    }
  }
};
