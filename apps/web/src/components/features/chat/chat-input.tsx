'use client';

import { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/hooks';
import { useChatStore } from '@/store';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, isLoading, placeholder }: ChatInputProps) {
  const { t } = useTranslation('common');
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messages = useChatStore(state => state.messages);
  const CONTEXT_MESSAGE_LIMIT = 12;

  const estimatedContextTokens = useMemo(() => {
    const recent = messages.slice(-CONTEXT_MESSAGE_LIMIT);
    const estimateTokens = (text: string) => {
      const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
      const nonCjkCount = text.length - cjkCount;
      return cjkCount + Math.ceil(nonCjkCount / 4);
    };
    return recent.reduce((sum, msg) => sum + estimateTokens(msg.content || ''), 0);
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Handle submit
  const handleSubmit = () => {
    if (!message.trim() || disabled || isLoading) return;
    onSend(message.trim());
    setMessage('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2 shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all min-h-[52px]">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('chat.placeholder')}
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              "flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 py-2",
              "min-h-[36px] max-h-[200px] leading-[1.4]",
              (disabled || isLoading) && "opacity-50 cursor-not-allowed"
            )}
            style={{ 
              display: 'flex',
              alignItems: 'center'
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || disabled || isLoading}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all self-center",
              message.trim() && !disabled && !isLoading
                ? "bg-primary text-white hover:bg-primary-600 shadow-md hover:shadow-lg"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Hint text */}
        <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
          <span>
            上下文记忆：{Math.min(messages.length, CONTEXT_MESSAGE_LIMIT)} 条 / ~{estimatedContextTokens} tokens
          </span>
          <span>
            按 Enter 发送，Shift + Enter 换行
          </span>
        </div>
      </div>
    </div>
  );
}
