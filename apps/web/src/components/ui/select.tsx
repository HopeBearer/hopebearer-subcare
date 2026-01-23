import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const { t, i18n } = useTranslation();
    const errorMessage = error ? t(error) : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-base font-medium text-secondary mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            ref={ref}
            className={cn(
              'input-base appearance-none pr-10',
              error && 'error',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {errorMessage && <div className="text-sm mb-1 text-error" key={`${errorMessage}-${i18n.language}`}>{errorMessage}</div>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
