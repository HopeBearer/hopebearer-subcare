'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Wrench, Brain, ChevronDown } from 'lucide-react';
import { Message } from '@/services';
import { BotAvatar, UserAvatar } from './avatars';
import { SavedToolCallCard, SavedToolCall } from './tool-call-card';
import { MarkdownRenderer } from './markdown-renderer';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { t } = useTranslation('common');
  const [showThinking, setShowThinking] = useState(false);
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  // Tool messages are typically hidden
  if (isTool) {
    return null;
  }

  const hasThinkingSteps = message.thinkingSteps && message.thinkingSteps.length > 0;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasMetadata = hasThinkingSteps || hasToolCalls;

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "flex gap-4 py-4 px-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar */}
      {!isUser && <BotAvatar />}

      {/* Message Content */}
      <div
        className={cn(
          "max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
          isUser 
            ? "bg-primary text-white rounded-br-md" 
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="space-y-2">
            {/* 思考过程 + 工具调用（折叠式，位于内容上方） */}
            {hasMetadata && (
              <div>
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
                >
                  <Brain className="w-3 h-3" />
                  <span>
                    {hasThinkingSteps && hasToolCalls
                      ? t('chat.thinking_and_tools', {
                          thinkingCount: message.thinkingSteps!.length,
                          toolCount: message.toolCalls!.length
                        })
                      : hasThinkingSteps
                        ? t('chat.thinking_steps_count', {
                            count: message.thinkingSteps!.length
                          })
                        : t('tools.used_count', { count: message.toolCalls!.length })
                    }
                  </span>
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    showThinking && "rotate-180"
                  )} />
                </button>
                
                {showThinking && (
                  <div className="space-y-2 mt-1 mb-2">
                    {/* 思考步骤 */}
                    {hasThinkingSteps && (
                      <div className="space-y-1">
                        {message.thinkingSteps!.map((step, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500"
                          >
                            <Brain className="w-3 h-3 flex-shrink-0" />
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 工具调用历史 */}
                    {hasToolCalls && (
                      <div className="space-y-1.5">
                        {(message.toolCalls as SavedToolCall[]).map((call, index) => (
                          <SavedToolCallCard key={index} toolCall={call} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 分割线 */}
                <div className="border-t border-gray-200 dark:border-gray-700" />
              </div>
            )}

            {/* 消息内容（始终在工具/思考下方） */}
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && <UserAvatar />}
    </div>
  );
}
