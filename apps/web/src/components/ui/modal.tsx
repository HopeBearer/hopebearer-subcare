'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function Modal({ isOpen, onClose, title, children, className, headerClassName }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className={cn(
        "relative z-50 w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200",
        className
      )}>
        <div className={cn("flex items-center justify-between mb-4", headerClassName)}>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>
        
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
