import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../constants/BusinessCode';

/**
 * 全局错误处理中间件
 * 捕获所有未处理的异常，并格式化为标准 JSON 响应
 */
export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 默认错误状态码和消息
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let businessCode = BusinessCode.INTERNAL_ERROR;
  let message = 'Internal Server Error';

  // 如果是自定义 AppError，使用其中定义的状态码和消息
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    businessCode = err.businessCode;
    message = err.message;
  } else {
    // 记录非预期错误
    console.error('Unexpected Error:', err);
    // TODO: 这里可以尝试映射 Zod 错误或其他已知库的错误
  }

  // 返回格式化的 JSON 错误响应
  res.status(statusCode).json({
    status: 'error',
    code: businessCode,
    message,
    // 在开发环境下返回堆栈信息，便于调试
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
