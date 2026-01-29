import { controllersV1, authMiddleware } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const authRegistry: Record<string, RouteVersions> = {
  'POST /auth/register': {
    v1: { handler: controllersV1.Auth.register }
  },
  'GET /auth/captcha': {
    v1: { handler: controllersV1.Auth.getCaptcha }
  },
  'GET /auth/public-key': {
    v1: { handler: controllersV1.Auth.getPublicKey }
  },
  'POST /auth/login': {
    v1: { handler: controllersV1.Auth.login }
  },
  'POST /auth/refresh': {
    v1: { handler: controllersV1.Auth.refresh }
  },
  'POST /auth/forgot-password': {
    v1: { handler: controllersV1.Auth.forgotPassword }
  },
  'POST /auth/reset-password': {
    v1: { handler: controllersV1.Auth.resetPassword }
  },
  'POST /auth/verify-reset-token': {
    v1: { handler: controllersV1.Auth.verifyResetToken }
  },
  'POST /auth/verification-code/send': {
    v1: { 
      handler: controllersV1.Auth.sendVerificationCode,
      middlewares: [authMiddleware.authenticate]
    }
  },
  'POST /auth/change-password': {
    v1: { 
      handler: controllersV1.Auth.changePassword,
      middlewares: [authMiddleware.authenticate]
    }
  },
};
