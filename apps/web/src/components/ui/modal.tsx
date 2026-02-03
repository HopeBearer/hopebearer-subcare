'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function Modal({ isOpen, onClose, title, children, className, headerClassName }: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={handleContainerClick}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
      />
      
      {/* Content */}
      <div 
        className={cn(
          "relative z-[9999] w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200",
          className
        )}
        onClick={handleContainerClick}
      >
        <div className={cn("flex items-center justify-between mb-4", headerClassName)}>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">{title}</div>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
          </Button>
        </div>
        
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
