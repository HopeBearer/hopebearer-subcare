import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { TemplateService } from '../../services/TemplateService';
import { BusinessCode } from '../../constants/BusinessCode';
import { logger } from '../../infrastructure/logger/logger';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().max(200).optional(),
  description: z.string().optional(),
  searchText: z.string().min(1),
  category: z.string().max(50).optional(),
  icon: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  pricingPlans: z.record(z.unknown()).optional(),
  defaultCurrency: z.string().max(3).optional(),
  defaultCycle: z.enum(['monthly', 'yearly', 'weekly', 'daily']).optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  displayName: z.string().max(200).nullable().optional(),
  description: z.string().nullable().optional(),
  searchText: z.string().min(1).optional(),
  category: z.string().max(50).nullable().optional(),
  icon: z.string().nullable().optional(),
  website: z.string().url().optional().or(z.literal('')).or(z.null()),
  pricingPlans: z.record(z.unknown()).nullable().optional(),
  defaultCurrency: z.string().max(3).optional(),
  defaultCycle: z.enum(['monthly', 'yearly', 'weekly', 'daily']).optional(),
});

export class TemplateController {
  constructor(private templateService: TemplateService) {}

  /**
   * 获取模板列表
   * GET /api/templates
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, category, page, limit } = req.query;
      const result = await this.templateService.getTemplates({
        query: query as string,
        category: category as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取单个模板
   * GET /api/templates/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await this.templateService.getTemplateById(req.params.id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 创建模板
   * POST /api/templates
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createTemplateSchema.parse(req.body);
      const template = await this.templateService.createTemplate(validatedData);

      logger.audit({
        domain: 'ADMIN',
        action: 'CREATE_TEMPLATE',
        userId: req.user?.userId,
        ip: req.ip,
        metadata: { templateId: template.id, name: template.name },
      });

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        code: BusinessCode.CREATED,
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 更新模板
   * PATCH /api/templates/:id
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = updateTemplateSchema.parse(req.body);
      const template = await this.templateService.updateTemplate(req.params.id, validatedData);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 删除模板
   * DELETE /api/templates/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.templateService.deleteTemplate(req.params.id);

      logger.audit({
        domain: 'ADMIN',
        action: 'DELETE_TEMPLATE',
        userId: req.user?.userId,
        ip: req.ip,
        metadata: { templateId: req.params.id },
      });

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取模板分类列表
   * GET /api/templates/categories
   */
  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.templateService.getCategories();

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  };
}
