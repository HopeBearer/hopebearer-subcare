import { RouteVersions } from '../route-registry';
import { controllersV1 } from '../../core/container';
import { authMiddleware } from '../../core/container';

export const currencyRegistry: Record<string, RouteVersions> = {
  'GET /currencies': {
    v1: {
      handler: controllersV1.Currency.getRates,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /currency/convert': {
    v1: {
      handler: controllersV1.Currency.convert,
      middlewares: [authMiddleware.authenticate]
    }
  },
  // Keep existing if needed, or deprecate
  'GET /currency/preview-convert': {
    v1: {
      handler: controllersV1.Financial.previewConversion,
      middlewares: [authMiddleware.authenticate]
    }
  }
};
