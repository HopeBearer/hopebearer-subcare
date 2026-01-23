import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { MessageTemplateService } from '../../services/MessageTemplateService';
import { AppError } from '../../utils/AppError';

export class MessageTemplateController {
  constructor(private messageTemplateService: MessageTemplateService) {}

  /**
   * Create a new template
   */
  async create(req: Request, res: Response) {
    const template = await this.messageTemplateService.createTemplate(req.body);
    res.status(StatusCodes.CREATED).json({
      success: true,
      data: template,
    });
  }

  /**
   * Update an existing template
   */
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const template = await this.messageTemplateService.updateTemplate(id, req.body);
    res.status(StatusCodes.OK).json({
      success: true,
      data: template,
    });
  }

  /**
   * Get all templates
   */
  async list(req: Request, res: Response) {
    const templates = await this.messageTemplateService.getAllTemplates();
    res.status(StatusCodes.OK).json({
      success: true,
      data: templates,
    });
  }

  /**
   * Get a single template
   */
  async get(req: Request, res: Response) {
    const { id } = req.params;
    const template = await this.messageTemplateService.getTemplate(id);
    if (!template) {
      throw new AppError('NOT_FOUND', StatusCodes.NOT_FOUND, { message: 'Template not found' });
    }
    res.status(StatusCodes.OK).json({
      success: true,
      data: template,
    });
  }

  /**
   * Delete a template
   */
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.messageTemplateService.deleteTemplate(id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Template deleted',
    });
  }
}
