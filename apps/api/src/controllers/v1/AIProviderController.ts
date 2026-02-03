import { Request, Response, NextFunction } from 'express';
import { AIProviderService } from '../../services/AIProviderService';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../../constants/BusinessCode';
import { z } from 'zod';

const modelFilterSchema = z.object({
  isFree: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  supportsImages: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  supportsTools: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  search: z.string().optional()
}).partial();

export class AIProviderController {
  constructor(private aiProviderService: AIProviderService) {}

  /**
   * Get all providers
   * GET /api/v1/ai-providers
   */
  getProviders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = await this.aiProviderService.getProviders();
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: providers
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get provider by ID
   * GET /api/v1/ai-providers/:id
   */
  getProviderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const provider = await this.aiProviderService.getProviderById(id);
      
      if (!provider) {
        return res.status(StatusCodes.NOT_FOUND).json({
          status: 'error',
          code: BusinessCode.ERROR,
          message: 'Provider not found'
        });
      }

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: provider
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get models for a provider
   * GET /api/v1/ai-providers/:id/models
   */
  getModels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const filters = modelFilterSchema.parse(req.query);
      
      const models = await this.aiProviderService.getModelsByProviderId(id, filters);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: models
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get models by provider slug
   * GET /api/v1/ai-providers/slug/:slug/models
   */
  getModelsBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const filters = modelFilterSchema.parse(req.query);
      
      const models = await this.aiProviderService.getModelsByProviderSlug(slug, filters);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: models
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Manually trigger sync for a provider (Admin only)
   * POST /api/v1/ai-providers/:id/sync
   */
  syncProvider = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.aiProviderService.syncModelsFromProvider(id);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
        message: `Synced ${result.added} new models, updated ${result.updated}, removed ${result.removed}`
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Sync all providers (Admin only)
   * POST /api/v1/ai-providers/sync-all
   */
  syncAllProviders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await this.aiProviderService.syncAllProviders();
      
      const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
      const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
      const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: results,
        message: `Synced all providers: ${totalAdded} added, ${totalUpdated} updated, ${totalRemoved} removed`
      });
    } catch (error) {
      next(error);
    }
  };
}
