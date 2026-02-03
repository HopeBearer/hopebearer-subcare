'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const variantStyles = {
    danger: {
      icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
    },
    warning: {
      icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
    },
    default: {
      icon: 'bg-lavender/10 dark:bg-lavender/20 text-lavender',
      button: 'bg-lavender hover:bg-lavender-hover text-white shadow-lavender/20',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className="max-w-md"
    >
      <div className="flex flex-col items-center text-center">
        <div className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center mb-4",
          styles.icon
        )}>
          <AlertTriangle className="w-7 h-7" />
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {description}
        </p>

        <div className="flex gap-3 w-full">
          <Button
            variant="ghost"
            className="flex-1 h-11 rounded-xl bg-transparent hover:bg-primary-pale dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-primary transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            disabled={loading || isLoading}
          >
            {cancelText}
          </Button>
          <Button
            className={cn("flex-1 h-11 shadow-lg", styles.button)}
            onClick={(e) => {
              e.stopPropagation();
              handleConfirm();
            }}
            isLoading={loading || isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
