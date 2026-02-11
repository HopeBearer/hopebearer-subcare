import { i18n } from '../i18n';
import { toast } from 'sonner';
import { UseFormReturn } from 'react-hook-form';

export interface ApiErrorResponse {
  status: string;
  code: number;
  reason: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors?: Array<{ field: string; reason: string; params?: Record<string, any> }>;
}

/**
 * 获取错误文案
 * 优先级：error.code.reason > error.code > error.UNKNOWN
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getErrorMessage = (code: number, reason?: string, params?: Record<string, any>): string => {
  // 如果没有 code 和 reason，视为网络或未知错误
  if (!code && !reason) {
    return i18n.t('error.network') || 'Network error';
  }

  // 尝试特定 reason 的 key
  if (reason) {
    const key = `error.${code}.${reason}`;
    if (i18n.exists(key)) {
      return i18n.t(key, params);
    }
  }

  // 尝试 code 的通用 key
  const codeKey = `error.${code}`;
  if (i18n.exists(codeKey)) {
    return i18n.t(codeKey, params);
  }

  // 回退到默认未知错误
  return i18n.t('error.UNKNOWN') || 'Unknown error';
};

/**
 * 根据登录失败状态选择合适的提示文案
 * - freezeSeconds > 0: 刚触发冻结 → "账号已被冻结 X 分钟"
 * - remaining === 0 && nextFreezeMinutes: 最后机会 → "再次失败将被冻结 X 分钟"
 * - remaining > 0: 普通失败 → "密码错误，还剩 X 次机会"
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getLoginAttemptMessage = (code: number, reason: string, params?: Record<string, any>): string => {
  // 刚触发冻结
  if (params?.freezeSeconds) {
    const minutes = Math.ceil(params.freezeSeconds / 60);
    return getErrorMessage(code, 'ACCOUNT_FROZEN', { minutes });
  }
  // 最后一次免惩罚机会已用完，下次将冻结
  if (params?.remaining === 0 && params?.nextFreezeMinutes) {
    return getErrorMessage(code, 'LAST_ATTEMPT_WARNING', { minutes: params.nextFreezeMinutes });
  }
  // 普通失败，显示剩余次数
  return getErrorMessage(code, reason, params);
};

/**
 * 解析字段错误
 */
export const parseFieldErrors = (response: ApiErrorResponse) => {
  if (!response.errors) return {};
  const fieldErrors: Record<string, string> = {};
  response.errors.forEach((err) => {
    const key = `error.${response.code}.${err.reason}`;
    fieldErrors[err.field] = i18n.t(key, err.params) || err.reason;
  });
  return fieldErrors;
};

/**
 * 统一 API 错误处理
 * 该函数主要用于在组件中处理拦截器未处理的错误（主要是 42200 表单错误）
 * @param error Axios 错误对象
 * @param form React Hook Form 实例（可选）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleApiError = (error: any, form?: UseFormReturn<any>) => {
  if (error.response?.data) {
    const data = error.response.data as ApiErrorResponse;
    const { code, reason, params, errors } = data;

    // 处理表单校验错误 (42200)
    if (code === 42200) {
      // 仅当提供了 form 实例且存在 errors 数组时映射到字段
      if (errors && errors.length > 0 && form) {
        errors.forEach((err) => {
          // 这里我们存储 key 而不是翻译后的文案，以便在渲染时翻译
          const key = `common:error.${code}.${err.reason}`;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          form.setError(err.field as any, {
            type: 'server',
            // 存储错误 key 和参数，以便组件层可以使用 t(message, params)
            message: key
          });
        });
        return;
      }

      // 如果无法映射到字段（无 form 或无 errors），则显示全局提示作为回退
      const message = getErrorMessage(code, reason, params);
      toast.error(message);
      return;
    }

    // 尝试将通用业务错误映射到特定字段（如果可能）
    // 例如：INVALID_CREDENTIALS -> password 字段错误
    if (form) {
      if (reason === 'USER_NOT_FOUND') {
        const message = getLoginAttemptMessage(code, reason, params);
        form.setError('email', { type: 'server', message });
        return;
      }

      if (reason === 'INVALID_PASSWORD') {
        const message = getLoginAttemptMessage(code, reason, params);
        form.setError('password', { type: 'server', message });
        form.setValue('password', '');
        return;
      }

      if (reason === 'CAPTCHA_INVALID' || reason === 'CAPTCHA_REQUIRED') {
        form.setError('captchaCode', {
          type: 'server',
          message: `common:error.${code}.${reason}`
        });
        return;
      }

      if (reason === 'USER_ALREADY_EXISTS') {
        form.setError('email', {
          type: 'server',
          message: `common:error.${code}.${reason}`
        });
        return;
      }

      if (reason === 'INVALID_CREDENTIALS') {
        form.setError('password', {
          type: 'server',
          message: `common:error.${code}.${reason}`
        });
        return;
      }

      // 冻结期间再次尝试 → 在 password 字段下方提示剩余冻结时间
      if (reason === 'TOO_MANY_ATTEMPTS') {
        const message = getErrorMessage(code, reason, params);
        form.setError('password', { type: 'server', message });
        return;
      }
    }

    // 无 form 时的 TOO_MANY_ATTEMPTS 回退到 toast
    if (reason === 'TOO_MANY_ATTEMPTS') {
      const message = getErrorMessage(code, reason, params);
      toast.error(message);
      return;
    }

    // Registration disabled — show a toast
    if (reason === 'REGISTRATION_DISABLED') {
      const message = getErrorMessage(code, reason, params);
      toast.error(message);
      return;
    }

    // 其他错误 (如 500, 403) 已由全局拦截器处理，此处不再重复提示
    // 除非我们需要在这里做特殊处理
    return;
  }

  // 网络错误等已由拦截器处理
};
