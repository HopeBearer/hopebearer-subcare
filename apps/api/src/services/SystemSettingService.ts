import { SystemSettingRepository } from '../repositories/SystemSettingRepository';
import { SystemLogRepository } from '../repositories/SystemLogRepository';

interface SettingInput {
  key: string;
  value: string;
  type?: string;
  group?: string;
  label?: string;
}

export class SystemSettingService {
  // Simple in-memory cache with TTL
  private cache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  constructor(
    private settingRepository: SystemSettingRepository,
    private systemLogRepository: SystemLogRepository,
  ) {}

  /**
   * 清除缓存（设置更新后调用）
   */
  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取所有设置，按分组聚合
   */
  async getAllSettings(group?: string) {
    const settings = await this.settingRepository.findAll(group);

    // 按分组聚合
    const grouped: Record<string, Array<{
      id: string;
      key: string;
      value: string;
      type: string;
      group: string;
      label: string | null;
      parsedValue: unknown;
      updatedAt: Date;
    }>> = {};

    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = [];
      grouped[s.group].push({
        id: s.id,
        key: s.key,
        value: s.value,
        type: s.type,
        group: s.group,
        label: s.label,
        parsedValue: this.parseValue(s.value, s.type),
        updatedAt: s.updatedAt,
      });
    }

    return {
      settings,
      grouped,
      groups: Object.keys(grouped),
      total: settings.length,
    };
  }

  /**
   * 获取单个设置
   */
  async getByKey(key: string) {
    const setting = await this.settingRepository.findByKey(key);
    if (!setting) return null;
    return {
      ...setting,
      parsedValue: this.parseValue(setting.value, setting.type),
    };
  }

  /**
   * 获取设置值（简便方法，带缓存）
   */
  async getValue<T = string>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const setting = await this.settingRepository.findByKey(key);
    if (!setting) return defaultValue as T;

    const parsed = this.parseValue(setting.value, setting.type) as T;

    // Store in cache
    this.cache.set(key, { value: parsed, expiresAt: Date.now() + this.CACHE_TTL_MS });

    return parsed;
  }

  /**
   * 创建或更新设置
   */
  async upsertSetting(input: SettingInput, adminUserId?: string) {
    const existing = await this.settingRepository.findByKey(input.key);
    const oldValue = existing?.value;

    const result = await this.settingRepository.upsert(input.key, {
      value: input.value,
      type: input.type || 'string',
      group: input.group || 'general',
      label: input.label,
    });

    // Clear cache for this key
    this.clearCache(input.key);

    // 写入审计日志
    await this.systemLogRepository.create({
      level: 'AUDIT',
      domain: 'SYSTEM',
      action: existing ? 'update_setting' : 'create_setting',
      userId: adminUserId || null,
      metadata: {
        key: input.key,
        oldValue: oldValue || null,
        newValue: input.value,
        group: input.group || 'general',
      },
    });

    return result;
  }

  /**
   * 批量更新设置
   */
  async batchUpdateSettings(items: Array<{ key: string; value: string }>, adminUserId?: string) {
    // 获取旧值用于审计
    const oldSettings = await this.settingRepository.findAll();
    const oldMap = new Map(oldSettings.map((s) => [s.key, s.value]));

    const results = await this.settingRepository.batchUpdate(items);

    // Clear cache for updated keys
    for (const item of items) {
      this.clearCache(item.key);
    }

    // 写入审计日志
    for (const item of items) {
      const oldValue = oldMap.get(item.key);
      if (oldValue !== item.value) {
        await this.systemLogRepository.create({
          level: 'AUDIT',
          domain: 'SYSTEM',
          action: 'update_setting',
          userId: adminUserId || null,
          metadata: {
            key: item.key,
            oldValue: oldValue || null,
            newValue: item.value,
          },
        });
      }
    }

    return { updated: results.length };
  }

  /**
   * 删除设置
   */
  async deleteSetting(id: string, adminUserId?: string) {
    const setting = await this.settingRepository.findById(id);
    if (!setting) throw new Error('Setting not found');

    await this.settingRepository.delete(id);

    // Clear cache
    this.clearCache(setting.key);

    await this.systemLogRepository.create({
      level: 'AUDIT',
      domain: 'SYSTEM',
      action: 'delete_setting',
      userId: adminUserId || null,
      metadata: { key: setting.key, value: setting.value },
    });

    return { deleted: true };
  }

  /**
   * 获取所有分组
   */
  async getGroups() {
    return this.settingRepository.findGroups();
  }

  /**
   * 解析设置值
   */
  private parseValue(value: string, type: string): unknown {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }
}
