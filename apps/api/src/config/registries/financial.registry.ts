import { RouteVersions } from '../route-registry';
import { controllersV1 } from '../../core/container';
import { authMiddleware } from '../../core/container';

export const financialRegistry: Record<string, RouteVersions> = {
  'GET /finance/overview': {
    v1: {
      handler: controllersV1.Financial.getOverview,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /finance/history': {
    v1: {
      handler: controllersV1.Financial.getHistory,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'GET /finance/pending': {
    v1: {
      handler: controllersV1.Financial.getPendingBills,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'PATCH /finance/records/:id/confirm': {
    v1: {
      handler: controllersV1.Financial.confirmPayment,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'POST /finance/records/:id/cancel': {
    v1: {
      handler: controllersV1.Financial.cancelRenewal,
      middlewares: [authMiddleware.authenticate]
    }
  }
};
