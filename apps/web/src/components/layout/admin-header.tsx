'use client';

import { useAuthStore } from '@/store';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { cn } from '@/lib/utils';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/admin': { title: '管理仪表盘', subtitle: '平台运营数据概览' },
  '/admin/users': { title: '用户管理', subtitle: '管理平台用户账户与角色' },
  '/admin/logs': { title: '系统日志', subtitle: '查看系统运行日志与错误记录' },
  '/admin/categories': { title: '分类管理', subtitle: '管理订阅分类与预算限额' },
  '/admin/templates': { title: '订阅模板', subtitle: '管理订阅服务模板与定价方案' },
  '/admin/message-templates': { title: '消息模板', subtitle: '管理邮件与通知模板' },
  '/admin/ai-providers': { title: 'AI 供应商', subtitle: '管理 AI 模型供应商与配置' },
};

export function AdminHeader() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  const pageInfo = pageTitles[pathname || ''] || { title: '管理后台', subtitle: '' };

  const handleLogout = () => {
    logout();
    window.location.replace('/login');
  };

  return (
    <header className="h-16 px-8 flex items-center justify-between bg-surface border-b border-base shadow-sm flex-none">
      <div className="flex flex-col justify-center">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <p className="text-xs text-secondary mt-0.5 leading-snug">{pageInfo.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        {/* User Info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {user?.name || 'Admin'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 ease group',
            'bg-transparent hover:bg-red-50 dark:hover:bg-red-900/10'
          )}
        >
          <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-red-500 dark:group-hover:text-red-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors group-hover:text-red-500 dark:group-hover:text-red-400">
            退出
          </span>
        </button>
      </div>
    </header>
  );
}
