import { Category } from "@subcare/database";
import { CategoryRepository } from "../repositories/CategoryRepository";
import { AppError } from "../utils/AppError";
import { StatusCodes } from "http-status-codes";

export interface CreateCategoryDTO {
  name: string;
  icon?: string;
  color?: string;
  budgetLimit?: number;
}

export interface UpdateCategoryDTO {
  name?: string;
  icon?: string;
  color?: string;
  budgetLimit?: number;
}

export class CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  /**
   * 获取用户可用的所有分类
   */
  async getCategories(userId: string): Promise<Category[]> {
    return this.categoryRepository.findAllByUserId(userId);
  }

  /**
   * 获取系统默认分类
   */
  async getSystemCategories(): Promise<Category[]> {
    return this.categoryRepository.findSystemCategories();
  }

  /**
   * 根据 ID 获取分类
   */
  async getCategoryById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Category not found'
      });
    }
    return category;
  }

  /**
   * 根据名称获取分类（用于 AI Agent）
   */
  async getCategoryByName(name: string, userId?: string): Promise<Category | null> {
    return this.categoryRepository.findByName(name, userId);
  }

  /**
   * 创建用户自定义分类
   */
  async createCategory(userId: string, data: CreateCategoryDTO): Promise<Category> {
    // 检查名称是否已存在
    const existing = await this.categoryRepository.findByName(data.name, userId);
    if (existing) {
      throw new AppError('CONFLICT', StatusCodes.CONFLICT, {
        message: `Category "${data.name}" already exists`
      });
    }

    return this.categoryRepository.create({
      name: data.name,
      icon: data.icon,
      color: data.color || '#9CA3AF',
      budgetLimit: data.budgetLimit,
      user: { connect: { id: userId } }
    });
  }

  /**
   * 更新分类（仅限用户自定义分类）
   */
  async updateCategory(id: string, userId: string, data: UpdateCategoryDTO): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    
    if (!category) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Category not found'
      });
    }

    // 系统分类不能修改
    if (category.userId === null) {
      throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, {
        message: 'System categories cannot be modified'
      });
    }

    // 验证归属
    if (category.userId !== userId) {
      throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, {
        message: 'You can only modify your own categories'
      });
    }

    // 如果修改名称，检查是否重复
    if (data.name && data.name !== category.name) {
      const existing = await this.categoryRepository.findByName(data.name, userId);
      if (existing) {
        throw new AppError('CONFLICT', StatusCodes.CONFLICT, {
          message: `Category "${data.name}" already exists`
        });
      }
    }

    return this.categoryRepository.update(id, data);
  }

  /**
   * 删除分类（仅限用户自定义分类）
   */
  async deleteCategory(id: string, userId: string): Promise<void> {
    const category = await this.categoryRepository.findById(id);
    
    if (!category) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'Category not found'
      });
    }

    // 系统分类不能删除
    if (category.userId === null) {
      throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, {
        message: 'System categories cannot be deleted'
      });
    }

    // 验证归属
    if (category.userId !== userId) {
      throw new AppError('FORBIDDEN', StatusCodes.FORBIDDEN, {
        message: 'You can only delete your own categories'
      });
    }

    // 检查是否有订阅在使用
    const subscriptionCount = await this.categoryRepository.countSubscriptions(id);
    if (subscriptionCount > 0) {
      throw new AppError('CONFLICT', StatusCodes.CONFLICT, {
        message: `Cannot delete category with ${subscriptionCount} active subscriptions. Please reassign them first.`
      });
    }

    await this.categoryRepository.softDelete(id);
  }

  /**
   * 初始化系统默认分类
   */
  async initializeDefaults(): Promise<void> {
    await this.categoryRepository.initializeDefaults();
  }

  /**
   * 验证分类 ID 是否有效（用于 AI Agent）
   */
  async validateCategoryId(categoryId: string, userId: string): Promise<boolean> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) return false;
    
    // 系统分类或用户自己的分类都有效
    return category.userId === null || category.userId === userId;
  }
}
