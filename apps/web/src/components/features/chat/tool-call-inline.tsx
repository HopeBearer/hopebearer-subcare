'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CheckCircle, Loader2 } from 'lucide-react';
import { getToolIcon } from './tool-display';

// Tool call history item
export interface ToolCallHistoryItem {
  id: string;
  toolName: string;
  status: 'started' | 'completed';
  timestamp: number;
}

// Tool call inline card (compact, for inside message bubble)
interface ToolCallInlineProps {
  toolName: string;
  status: 'started' | 'completed';
}

export function ToolCallInline({ toolName, status }: ToolCallInlineProps) {
  const { t } = useTranslation('common');

  const icon = getToolIcon(toolName);
  const displayName = `${icon} ${t(`tools.names.${toolName}`, { defaultValue: toolName })}`;

  return (
    <div className={cn(
      "flex items-center gap-2 py-1.5 px-2.5 rounded-md text-xs transition-all duration-300",
      status === 'completed' 
        ? "bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
        : "bg-violet-100/50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
    )}>
      {status === 'completed' ? (
        <CheckCircle className="w-3.5 h-3.5" />
      ) : (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      )}
      <span className="truncate">{displayName}</span>
    </div>
  );
}
