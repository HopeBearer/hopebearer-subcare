import { BusinessCode } from '../constants/BusinessCode';

/**
 * 自定义应用错误类
 * 用于封装 API 请求过程中发生的错误，包含 HTTP 状态码、业务状态码和操作标志
 */
export class AppError extends Error {
  public readonly statusCode: number;   // HTTP 状态码
  public readonly businessCode: number; // 业务状态码
  public readonly isOperational: boolean; // 是否为可预期的操作错误

  constructor(
    message: string, 
    statusCode: number, 
    businessCode?: number,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    // 如果未提供业务状态码，则根据 HTTP 状态码进行映射默认值
    this.businessCode = businessCode || this.mapStatusToBusinessCode(statusCode);
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    // 捕获堆栈跟踪，排除构造函数调用本身
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 将 HTTP 状态码映射到业务状态码
   * @param status HTTP 状态码
   * @returns 对应的业务状态码
   */
  private mapStatusToBusinessCode(status: number): number {
    switch (status) {
      case 400: return BusinessCode.BAD_REQUEST;
      case 401: return BusinessCode.UNAUTHORIZED;
      case 403: return BusinessCode.FORBIDDEN;
      case 404: return BusinessCode.NOT_FOUND;
      case 409: return BusinessCode.CONFLICT;
      case 422: return BusinessCode.VALIDATION_ERROR;
      case 500: return BusinessCode.INTERNAL_ERROR;
      default: return BusinessCode.INTERNAL_ERROR;
    }
  }
}
