/**
 * 业务状态码枚举
 * 用于在 API 响应中提供更细粒度的错误分类
 */
export enum BusinessCode {
  SUCCESS = 20000,          // 成功
  CREATED = 20100,          // 创建成功
  BAD_REQUEST = 40000,      // 请求参数错误
  UNAUTHORIZED = 40100,     // 未授权（未登录或 Token 无效）
  FORBIDDEN = 40300,        // 禁止访问（无权限）
  NOT_FOUND = 40400,        // 资源不存在
  CONFLICT = 40900,         // 资源冲突（如重复创建）
  VALIDATION_ERROR = 42200, // 数据验证失败
  INTERNAL_ERROR = 50000,   // 服务器内部错误
}
