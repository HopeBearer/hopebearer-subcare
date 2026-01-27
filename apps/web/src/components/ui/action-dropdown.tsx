'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionItem {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionDropdownProps {
  items: ActionItem[];
  className?: string;
}

export function ActionDropdown({ items, className }: ActionDropdownProps) {
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

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
            "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 transition-opacity shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50",
            isOpen ? "opacity-100 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300" : ""
        )}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-48 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-30 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const isDanger = item.variant === 'danger';
            
            return (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group mb-1 text-left text-sm font-medium",
                  isDanger 
                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10" 
                    : "text-secondary dark:text-gray-300 hover:bg-primary-pale dark:hover:bg-white/5 hover:text-primary dark:hover:text-primary"
                )}
              >
                {Icon && (
                  <Icon 
                    className={cn(
                      "w-4 h-4 transition-colors", 
                      isDanger ? "text-red-500" : "text-gray-400 dark:text-gray-400 group-hover:text-primary"
                    )} 
                  />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
