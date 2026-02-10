import { Request, Response, NextFunction } from 'express';
import { logger } from '../infrastructure/logger/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // req.user is injected by auth middleware: { userId, email, role }
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    const logData = {
      domain: 'API',
      action: `${req.method} ${req.path}`,
      userId,
      ip: req.ip,
      metadata: {
        status,
        duration,
        userAgent: req.get('user-agent'),
        ...(userEmail && { userEmail }),
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
