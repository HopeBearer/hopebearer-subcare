import { Request, Response, NextFunction } from 'express';
import { AgentService } from '../services/AgentService';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../constants/BusinessCode';
import { z } from 'zod';

const configSchema = z.object({
  provider: z.enum(['openai', 'deepseek', 'anthropic']),
  apiKey: z.string().min(1),
  model: z.string().optional(),
  baseUrl: z.string().optional()
});

export class AgentController {
  private agentService: AgentService;

  constructor() {
    this.agentService = new AgentService();
  }

  /**
   * Configure AI Provider
   * POST /api/v1/agent/config
   */
  configure = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const data = configSchema.parse(req.body);
      
      await this.agentService.configureAI(userId, data);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        message: 'AI configuration saved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get AI Configuration Status
   * GET /api/v1/agent/config
   */
  getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const config = await this.agentService.getConfig(userId);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: config
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get AI Recommendations
   * GET /api/v1/agent/recommendations
   */
  getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const { focus, forceRefresh } = req.query;

      const result = await this.agentService.getRecommendations({
        userId,
        focus: focus as string,
        forceRefresh: forceRefresh === 'true'
      });
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
