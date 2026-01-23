import { Request, Response, NextFunction } from 'express';
import { logger } from '../infrastructure/logger/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Extend Request type to include user if it exists (usually added by auth middleware)
    const userId = (req as any).user?.id;

    const logData = {
      domain: 'API',
      action: `${req.method} ${req.path}`,
      userId,
      ip: req.ip,
      metadata: {
        status,
        duration,
        userAgent: req.get('user-agent'),
      },
    };

    if (status >= 400) {
      logger.error({
        ...logData,
        error: `Request failed with status ${status}`,
      });
    } else {
      logger.info(logData);
    }
  });

  next();
};
