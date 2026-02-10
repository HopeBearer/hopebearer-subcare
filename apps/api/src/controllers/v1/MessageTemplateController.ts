import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { MessageTemplateService } from '../../services/MessageTemplateService';
import { AppError } from '../../utils/AppError';
import { BusinessCode } from '../../constants/BusinessCode';
import { z } from 'zod';

const createMessageTemplateSchema = z.object({
  key: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  channel: z.enum(['email', 'in-app']),
});

const updateMessageTemplateSchema = z.object({
  key: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  channel: z.enum(['email', 'in-app']).optional(),
});

export class MessageTemplateController {
  constructor(private messageTemplateService: MessageTemplateService) {}

  /**
   * Create a new template
   * POST /api/message-templates
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createMessageTemplateSchema.parse(req.body);
      const template = await this.messageTemplateService.createTemplate(validatedData);
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
   * Update an existing template
   * PATCH /api/message-templates/:id
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validatedData = updateMessageTemplateSchema.parse(req.body);
      const template = await this.messageTemplateService.updateTemplate(id, validatedData);
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
   * Get all templates
   * GET /api/message-templates
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await this.messageTemplateService.getAllTemplates();
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { templates },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single template
   * GET /api/message-templates/:id
   */
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const template = await this.messageTemplateService.getTemplate(id);
      if (!template) {
        throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, { message: 'Template not found' });
      }
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
   * Delete a template
   * DELETE /api/message-templates/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.messageTemplateService.deleteTemplate(id);
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
