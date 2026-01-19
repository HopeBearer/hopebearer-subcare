import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'flex items-center justify-center px-4 py-2 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm active-scale',
          {
            'bg-primary hover:bg-primary-hover text-white shadow-sm': variant === 'primary',
            'border border-base hover:bg-gray-50 text-secondary': variant === 'outline',
            'hover:bg-gray-100 text-secondary': variant === 'ghost',
          },
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin mr-2 w-4 h-4" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
