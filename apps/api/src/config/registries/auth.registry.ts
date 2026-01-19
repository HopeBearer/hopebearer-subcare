import { controllersV1 } from '../../core/container';
import { RouteVersions } from '../route-registry';

export const authRegistry: Record<string, RouteVersions> = {
  'POST /auth/register': {
    v1: { handler: controllersV1.Auth.register }
  },
  'GET /auth/captcha': {
    v1: { handler: controllersV1.Auth.getCaptcha }
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
};
