'use client';

import { Bot, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store';

// Bot Avatar Component - supports light/dark mode
interface BotAvatarProps {
  isThinking?: boolean;
}

export function BotAvatar({ isThinking }: BotAvatarProps) {
  return (
    <div className="relative flex-shrink-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 dark:from-primary dark:to-primary-600 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-900">
        <Bot className="w-4 h-4 text-white" />
      </div>
      {isThinking && (
        <div className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        </div>
      )}
    </div>
  );
}

// User Avatar Component - shows user's initial
export function UserAvatar() {
  const { user } = useAuthStore();
  const initial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-900">
      <span className="text-sm font-bold text-primary">{initial}</span>
    </div>
  );
}
