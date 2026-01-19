import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface border border-base rounded-2xl shadow-sm p-6',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export { Card };
