'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CheckCircle, Wrench, ChevronDown, HelpCircle } from 'lucide-react';
import { CollapsibleContent } from './collapsible-content';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  getToolIcon, 
  formatDuration, 
  getToolResultSummary, 
  getToolResultDisplay,
  sanitizeToolResult 
} from './tool-display';

// Saved tool call record type (loaded from database)
export interface SavedToolCall {
  name: string;
  arguments: string;
  result?: any;
  status: string;
  duration?: number;
}

interface SavedToolCallCardProps {
  toolCall: SavedToolCall;
}

export function SavedToolCallCard({ toolCall }: SavedToolCallCardProps) {
  const { t } = useTranslation('common');
  const [expandLevel, setExpandLevel] = useState(0); // 0: collapsed, 1: summary, 2: detailed JSON

  const icon = getToolIcon(toolCall.name);
  const displayName = `${icon} ${t(`tools.names.${toolCall.name}`, { defaultValue: toolCall.name })}`;
  const isSuccess = toolCall.status === 'completed';
  const summary = getToolResultSummary(toolCall.name, toolCall.result, t);
  const duration = formatDuration(toolCall.duration);
  const displayData = getToolResultDisplay(toolCall.name, toolCall.result, t);

  const handleClick = () => {
    setExpandLevel(prev => (prev + 1) % 3);
  };

  return (
    <div className={cn(
      "rounded-lg border transition-all duration-200",
      isSuccess 
        ? "bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
        : "bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    )}>
      <button
        onClick={handleClick}
        className="w-full flex items-center justify-between gap-2 py-2 px-3 text-xs hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isSuccess ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
          ) : (
            <Wrench className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <span className={cn(
            "font-medium flex-shrink-0",
            isSuccess ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
          )}>
            {displayName}
          </span>
          <span className="text-gray-500 dark:text-gray-400 truncate">
            — {summary}
          </span>
          {toolCall.name === 'get_spending_summary' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('tools.tooltips.get_spending_summary')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {duration && (
            <span className="text-gray-400 dark:text-gray-500 text-[10px] flex-shrink-0">
              {duration}
            </span>
          )}
        </div>
        {toolCall.result && (
          <ChevronDown className={cn(
            "w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-300",
            expandLevel > 0 && "rotate-180"
          )} />
        )}
      </button>
      
      {/* First level expand: User-friendly info summary */}
      {displayData.items.length > 0 && (
        <CollapsibleContent isOpen={expandLevel >= 1}>
          <div className="px-3 pb-2">
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-md p-2 text-xs space-y-1">
              {displayData.items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 min-w-[60px]">{item.label}:</span>
                  <span className="text-gray-700 dark:text-gray-300 break-words">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      )}

      {/* Second level expand: Detailed JSON data */}
      {toolCall.result && (
        <CollapsibleContent isOpen={expandLevel >= 2}>
          <div className="px-3 pb-2">
            <div className="text-[10px] text-gray-400 mb-1">{t('tools.labels.detailed_data')}</div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2 text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
              <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">
                {JSON.stringify(sanitizeToolResult(toolCall.result), null, 2)}
              </pre>
            </div>
          </div>
        </CollapsibleContent>
      )}
    </div>
  );
}
