import commonEn from '../../../public/locales/en/common.json';
import authEn from '../../../public/locales/en/auth.json';
import dashboardEn from '../../../public/locales/en/dashboard.json';
import subscriptionEn from '../../../public/locales/en/subscription.json';

import commonZh from '../../../public/locales/zh/common.json';
import authZh from '../../../public/locales/zh/auth.json';
import dashboardZh from '../../../public/locales/zh/dashboard.json';
import subscriptionZh from '../../../public/locales/zh/subscription.json';

import commonJa from '../../../public/locales/ja/common.json';
import authJa from '../../../public/locales/ja/auth.json';
import dashboardJa from '../../../public/locales/ja/dashboard.json';
import subscriptionJa from '../../../public/locales/ja/subscription.json';

// Export resources for i18n initialization
export const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    dashboard: dashboardEn,
    subscription: subscriptionEn,
  },
  zh: {
    common: commonZh,
    auth: authZh,
    dashboard: dashboardZh,
    subscription: subscriptionZh,
  },
  ja: {
    common: commonJa,
    auth: authJa,
    dashboard: dashboardJa,
    subscription: subscriptionJa,
  },
} as const;
