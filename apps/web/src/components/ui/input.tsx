import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    // 监听语言变化，确保组件重新渲染
    const { t, i18n } = useTranslation();
    
    // 尝试翻译错误信息，如果翻译失败（即 key 不存在），则回退到原始错误信息
    // 注意：如果 error 是 "Field is required" 这种普通英文，t 会直接返回它（如果没找到 key）
    // 如果 error 是 "error.42200.EMAIL_INVALID" 这种 key，t 会返回对应的翻译
    const errorMessage = error ? t(error) : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-base font-medium text-secondary mb-1">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'input-base',
            error && 'error',
            className
          )}
          {...props}
        />
        {errorMessage && <div className="text-sm mb-1 text-error" key={`${errorMessage}-${i18n.language}`}>{errorMessage}</div>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
