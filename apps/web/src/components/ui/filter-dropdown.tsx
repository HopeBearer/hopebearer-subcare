'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  className?: string;
  placeholder?: string;
}

export function FilterDropdown({ 
  value, 
  options, 
  onChange, 
  icon, 
  className,
  placeholder = 'Select' 
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(o => o.value === value);
  const label = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={cn('relative z-20', className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group',
          'hover:bg-primary-pale',
          isOpen ? 'bg-primary-soft text-primary' : 'bg-transparent text-gray-700'
        )}
      >
        {icon && <span className={cn("text-gray-500 group-hover:text-primary transition-colors", isOpen && "text-primary")}>{icon}</span>}
        <span className={cn("text-sm font-medium whitespace-nowrap")}>
          {label}
        </span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-gray-400 transition-transform duration-200 ml-1',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      <div
        className={cn(
          'absolute right-0 top-full mt-2 min-w-[160px] p-2 bg-white rounded-xl shadow-md ring-1 ring-black/5 py-1 overflow-hidden origin-top-right transition-all duration-200 ease z-30',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 visible'
            : 'opacity-0 scale-95 -translate-y-2 invisible'
        )}
      >
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
            className={cn(
              'w-full text-left px-4 py-2 mb-1 text-sm rounded-md flex items-center justify-between transition-colors',
              'hover:bg-primary-pale',
              value === option.value
                ? 'text-primary font-medium bg-primary-pale'
                : 'text-gray-600'
            )}
          >
            <span>{option.label}</span>
            {value === option.value && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}
