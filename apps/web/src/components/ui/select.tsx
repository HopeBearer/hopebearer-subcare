'use client';

import { useState, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface Option {
  label: string;
  value: string;
}

export interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  name?: string;
  onBlur?: () => void;
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ value, onChange, options, placeholder, label, error, className, id, disabled, onBlur, name }, ref) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const handleRef = (node: HTMLButtonElement) => {
      triggerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as any).current = node;
    };

    // Close on scroll (except internal) or resize
    useEffect(() => {
      if (!isOpen) return;

      const handleScroll = (e: Event) => {
        // If scrolling the dropdown content itself, don't close
        if (dropdownRef.current && (e.target === dropdownRef.current || dropdownRef.current.contains(e.target as Node))) {
            return;
        }
        setIsOpen(false);
      };
      
      window.addEventListener('scroll', handleScroll, { capture: true });
      window.addEventListener('resize', handleScroll);

      return () => {
        window.removeEventListener('scroll', handleScroll, { capture: true });
        window.removeEventListener('resize', handleScroll);
      };
    }, [isOpen]);

    const toggleOpen = () => {
      if (disabled) return;
      if (!isOpen) {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setCoords({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width
          });
        }
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    const selectedOption = options.find(opt => opt.value === value);
    const errorMessage = error ? t(error) : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-base font-medium text-secondary mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <button
            type="button"
            id={id}
            ref={handleRef}
            name={name}
            onBlur={onBlur}
            onClick={toggleOpen}
            className={cn(
              'input-base flex items-center justify-between pr-3 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors w-full text-left',
              error && 'error',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            disabled={disabled}
          >
            <span className={cn("block truncate", !selectedOption && "text-gray-400")}>
              {selectedOption ? selectedOption.label : placeholder || "Select..."}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200", isOpen && "transform rotate-180")} />
          </button>

          {isOpen && mounted && coords && createPortal(
             <>
               <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
               <div 
                 ref={dropdownRef}
                 className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-200 p-1.5"
                 style={{ 
                    top: coords.top, 
                    left: coords.left, 
                    width: coords.width 
                 }}
               >
                 {options.map((option) => (
                   <div
                     key={option.value}
                     className={cn(
                       "px-4 py-2.5 text-sm cursor-pointer rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between transition-colors mb-1 last:mb-0",
                       option.value === value ? "bg-primary-pale text-primary font-medium" : "text-gray-700 dark:text-gray-300"
                     )}
                     onClick={(e) => {
                       e.stopPropagation();
                       onChange?.(option.value);
                       setIsOpen(false);
                     }}
                   >
                     <span className="truncate">{option.label}</span>
                     {option.value === value && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                   </div>
                 ))}
               </div>
             </>,
             document.body
          )}
        </div>
        {errorMessage && <div className="text-sm mb-1 text-error" key={`${errorMessage}-${i18n.language}`}>{errorMessage}</div>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
