import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { CategoryService, CreateCategoryDTO, UpdateCategoryDTO } from '../../services/CategoryService';
import { AppError } from '../../utils/AppError';
import { BusinessCode } from '../../constants/BusinessCode';
import { logger } from '../../infrastructure/logger/logger';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  budgetLimit: z.number().positive().optional()
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  budgetLimit: z.number().positive().nullable().optional()
});

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  /**
   * 获取用户可用的所有分类（系统默认 + 用户自定义）
   * GET /api/categories
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, {
          message: 'Not authenticated'
        });
      }

      const categories = await this.categoryService.getCategories(req.user.userId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { categories }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取单个分类
   * GET /api/categories/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, {
          message: 'Not authenticated'
        });
      }

      const category = await this.categoryService.getCategoryById(req.params.id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 创建用户自定义分类
   * POST /api/categories
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, {
          message: 'Not authenticated'
        });
      }

      const validatedData = createCategorySchema.parse(req.body);
      const category = await this.categoryService.createCategory(req.user.userId, validatedData);

      logger.audit({
        domain: 'ADMIN',
        action: 'CREATE_CATEGORY',
        userId: req.user.userId,
        ip: req.ip,
        metadata: { categoryId: category.id, name: category.name },
      });

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新分类
   * PATCH /api/categories/:id
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, {
          message: 'Not authenticated'
        });
      }

      const validatedData = updateCategorySchema.parse(req.body);
      const category = await this.categoryService.updateCategory(
        req.params.id,
        req.user.userId,
        validatedData as UpdateCategoryDTO
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 删除分类
   * DELETE /api/categories/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, {
          message: 'Not authenticated'
        });
      }

      await this.categoryService.deleteCategory(req.params.id, req.user.userId);

      logger.audit({
        domain: 'ADMIN',
        action: 'DELETE_CATEGORY',
        userId: req.user.userId,
        ip: req.ip,
        metadata: { categoryId: req.params.id },
      });

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
