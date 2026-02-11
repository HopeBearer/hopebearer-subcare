import { SubscriptionTemplate } from '@subcare/database';
import { TemplateRepository } from '../repositories/TemplateRepository';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';

export interface CreateTemplateDTO {
  name: string;
  displayName?: string;
  description?: string;
  searchText: string;
  category?: string;
  icon?: string;
  website?: string;
  pricingPlans?: Record<string, unknown>;
  defaultCurrency?: string;
  defaultCycle?: string;
}

export interface UpdateTemplateDTO {
  name?: string;
  displayName?: string | null;
  description?: string | null;
  searchText?: string;
  category?: string | null;
  icon?: string | null;
  website?: string | null;
  pricingPlans?: Record<string, unknown> | null;
  defaultCurrency?: string;
  defaultCycle?: string;
}

export interface TemplateListOptions {
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export class TemplateService {
  constructor(private templateRepository: TemplateRepository) {}

  /**
   * 获取模板列表（分页+搜索）
   */
  async getTemplates(options: TemplateListOptions = {}): Promise<{
    items: SubscriptionTemplate[];
    total: number;
  }> {
    return this.templateRepository.search(options);
  }

  /**
   * 获取单个模板
   */
  async getTemplateById(id: string): Promise<SubscriptionTemplate> {
    const template = await this.templateRepository.findById(id);
    if (!template || template.deletedAt) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Template not found',
      });
    }
    return template;
  }

  /**
   * 创建订阅模板（仅管理员）
   */
  async createTemplate(data: CreateTemplateDTO): Promise<SubscriptionTemplate> {
    // 检查名称是否重复
    const existing = await this.templateRepository.findByName(data.name);
    if (existing && !existing.deletedAt) {
      throw new AppError('CONFLICT', StatusCodes.CONFLICT, {
        message: `Template "${data.name}" already exists`,
      });
    }

    return this.templateRepository.create({
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      searchText: data.searchText,
      category: data.category,
      icon: data.icon,
      website: data.website,
      pricingPlans: data.pricingPlans as object | undefined,
      defaultCurrency: data.defaultCurrency || 'CNY',
      defaultCycle: data.defaultCycle || 'monthly',
    });
  }

  /**
   * 更新订阅模板（仅管理员）
   */
  async updateTemplate(id: string, data: UpdateTemplateDTO): Promise<SubscriptionTemplate> {
    const template = await this.templateRepository.findById(id);
    if (!template || template.deletedAt) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Template not found',
      });
    }

    // 如果修改名称，检查是否重复
    if (data.name && data.name !== template.name) {
      const existing = await this.templateRepository.findByName(data.name);
      if (existing && !existing.deletedAt) {
        throw new AppError('CONFLICT', StatusCodes.CONFLICT, {
          message: `Template "${data.name}" already exists`,
        });
      }
    }

    return this.templateRepository.update(id, {
      ...data,
      pricingPlans: data.pricingPlans as object | undefined,
    });
  }

  /**
   * 删除订阅模板（软删除）
   */
  async deleteTemplate(id: string): Promise<void> {
    const template = await this.templateRepository.findById(id);
    if (!template || template.deletedAt) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Template not found',
      });
    }

    await this.templateRepository.softDelete(id);
  }

  /**
   * 获取所有模板分类
   */
  async getCategories(): Promise<string[]> {
    return this.templateRepository.findAllCategories();
  }
}
