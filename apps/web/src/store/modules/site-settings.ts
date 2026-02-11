import { create } from 'zustand';
import { api } from '@/lib/api';

/**
 * 站点公开设置（从 GET /settings/public 获取，无需认证）
 * a11: 用于前端动态展示站点信息 & 控制注册开关等
 */
export interface SiteSettings {
  'site.name': string;
  'site.description': string;
  'site.defaultCurrency': string;
  'security.registrationEnabled': boolean;
  'security.requireEmailVerification': boolean;
}

interface SiteSettingsState {
  settings: SiteSettings | null;
  loading: boolean;
  fetched: boolean;
  fetchSiteSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: SiteSettings = {
  'site.name': 'SubCare',
  'site.description': '智能订阅管理平台',
  'site.defaultCurrency': 'CNY',
  'security.registrationEnabled': true,
  'security.requireEmailVerification': false,
};

export const useSiteSettingsStore = create<SiteSettingsState>((set, get) => ({
  settings: null,
  loading: false,
  fetched: false,

  fetchSiteSettings: async () => {
    // 避免重复请求
    if (get().fetched || get().loading) return;

    set({ loading: true });
    try {
      const res: any = await api.get('/settings/public');
      set({
        settings: { ...DEFAULT_SETTINGS, ...res.data },
        fetched: true,
      });
    } catch {
      // 请求失败时使用默认值
      set({ settings: DEFAULT_SETTINGS, fetched: true });
    } finally {
      set({ loading: false });
    }
  },
}));
