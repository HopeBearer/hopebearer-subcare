import { RouteVersions } from '../route-registry';
import { controllersV1 } from '../../core/container';
import { authMiddleware } from '../../core/container';

export const currencyRegistry: Record<string, RouteVersions> = {
  'GET /currency/preview-convert': {
    v1: {
      handler: controllersV1.Financial.previewConversion,
      middlewares: [authMiddleware.authenticate]
    }
  }
};
