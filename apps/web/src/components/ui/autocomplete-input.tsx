'use client';

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import Fuse from 'fuse.js';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Search } from 'lucide-react';

export interface AutocompleteOption {
  name: string;
  icon?: string | null;
}

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: AutocompleteOption) => void;
  label?: string;
  error?: string;
  placeholder?: string;
}

export const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ className, error, label, id, options, value, onChange, onSelectOption, placeholder, ...props }, ref) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<AutocompleteOption[]>([]);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const [mounted, setMounted] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync forwarded ref with local ref
    const handleRef = (node: HTMLInputElement) => {
        inputRef.current = node;
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            (ref as any).current = node;
        }
    };

    // Initialize Fuse
    const fuse = new Fuse(options, {
      keys: ['name'],
      threshold: 0.3,
      ignoreLocation: true
    });

    useEffect(() => {
      if (!value || value.trim() === '') {
        setSuggestions(options.slice(0, 5)); 
        return;
      }

      const results = fuse.search(value);
      setSuggestions(results.map(r => r.item).slice(0, 5));
    }, [value, options]);

    // Handle clicks outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        // If clicking input, do nothing (handled by onFocus/onClick)
        if (inputRef.current && inputRef.current.contains(event.target as Node)) {
            return;
        }
        // If clicking dropdown, do nothing (handled by list item onClick)
        if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
            return;
        }
        setIsOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update coordinates with viewport check
    const updateCoords = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // Assume dropdown max height is ~240px (max-h-60)
            const dropdownHeight = 240;
            
            let top = rect.bottom + 4;
            let maxHeight = '15rem'; // max-h-60
            
            // If not enough space below, try above
            if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                top = rect.top - 4 - dropdownHeight; // This is rough, ideally we measure content
                // Better approach: align bottom of dropdown to top of input
                // Since we use fixed positioning top/left, we can't easily say 'bottom: xxx' without changing style
                // But we can limit height.
            }
            
            // For simplicity in fixed layout: if close to bottom, limit height
            if (spaceBelow < dropdownHeight) {
                // If really tight, maybe render above? 
                // Let's stick to below but limit height if needed, or allow it to be scrollable within limits
                // Actually, fixed position allows it to overlay everything.
            }

            setCoords({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
            });
        }
    };

    const openDropdown = () => {
        updateCoords();
        setIsOpen(true);
        if (!value) {
            setSuggestions(options.slice(0, 5));
        }
    };

    // Close on scroll (window) / resize
    useEffect(() => {
        if (!isOpen) return;
        
        const handleWindowScroll = (e: Event) => {
            // Ignore scroll events originating from the dropdown itself or its children
            if (dropdownRef.current && (e.target === dropdownRef.current || dropdownRef.current.contains(e.target as Node))) {
                return;
            }
            setIsOpen(false);
        };

        window.addEventListener('scroll', handleWindowScroll, { capture: true });
        window.addEventListener('resize', handleWindowScroll);
        return () => {
            window.removeEventListener('scroll', handleWindowScroll, { capture: true });
            window.removeEventListener('resize', handleWindowScroll);
        };
    }, [isOpen]);

    const handleSelect = (option: AutocompleteOption) => {
      onChange(option.name);
      if (onSelectOption) {
        onSelectOption(option);
      }
      setIsOpen(false);
    };

    const handleCreateNew = () => {
      setIsOpen(false);
    };
    
    const errorMessage = error ? t(error) : undefined;
    const showDropdown = isOpen && (suggestions.length > 0 || (value && !suggestions.some(s => s.name.toLowerCase() === value.trim().toLowerCase())));

    return (
      <div className="w-full relative group" ref={containerRef}>
        {label && (
          <label htmlFor={id} className="block text-base font-medium text-secondary mb-1">
            {label}
          </label>
        )}
        <div className="relative">
             <input
              id={id}
              ref={handleRef}
              type="text"
              autoComplete="off"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                openDropdown();
              }}
              onFocus={openDropdown}
              onClick={openDropdown} // Also open on click if focused
              className={cn(
                'input-base pr-10',
                error && 'error',
                className
              )}
              placeholder={placeholder}
              {...props}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
            </div>
        </div>
       
        {errorMessage && <div className="text-sm mb-1 text-error" key={`${errorMessage}-${i18n.language}`}>{errorMessage}</div>}

        {/* Portal Dropdown */}
        {showDropdown && coords && mounted && createPortal(
          <div 
            ref={dropdownRef}
            className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
            style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                maxHeight: '15rem' 
            }}
            onMouseDown={(e) => {
              // Prevent input blur when clicking inside dropdown (including scrollbar)
              e.preventDefault();
            }}
          >
            <ul 
                className="overflow-y-auto flex-1 overscroll-contain pointer-events-auto"
            >
              {suggestions.length > 0 && (
                <li className="px-3 py-2 text-xs font-semibold text-gray-400 bg-gray-50 dark:bg-gray-700/50 uppercase tracking-wider">
                  {t('existing_services', { defaultValue: 'Existing Services' })}
                </li>
              )}
              
              {suggestions.map((option, idx) => (
                <li
                  key={`${option.name}-${idx}`}
                  onClick={() => handleSelect(option)}
                  className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between group/item transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {option.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 dark:text-gray-200 group-hover/item:text-primary transition-colors">
                        {option.name}
                    </span>
                  </div>
                  {option.name.toLowerCase() === value.trim().toLowerCase() && (
                      <Check className="w-4 h-4 text-green-500" />
                  )}
                </li>
              ))}
              
              {/* No results or fixed bottom */}
              {value && !suggestions.some(s => s.name.toLowerCase() === value.trim().toLowerCase()) && (
                  <li 
                    onClick={handleCreateNew}
                    className="px-4 py-3 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 text-primary"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                    </div>
                    <span className="font-medium">
                        {t('create_new', { defaultValue: 'Create new' })} "{value}"
                    </span>
                  </li>
              )}
            </ul>
          </div>,
          document.body
        )}
      </div>
    );
  }
);

AutocompleteInput.displayName = 'AutocompleteInput';
