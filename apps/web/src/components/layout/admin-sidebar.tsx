'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ScrollText,
  FolderTree,
  Package,
  Mail,
  Bot,
  ArrowLeft,
  DollarSign,
  CreditCard,
  Bell,
  MessageSquare,
  Search,
  Settings,
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '概览',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: '仪表盘' },
    ],
  },
  {
    title: '用户与权限',
    items: [
      { href: '/admin/users', icon: Users, label: '用户管理' },
    ],
  },
  {
    title: '内容管理',
    items: [
      { href: '/admin/categories', icon: FolderTree, label: '分类管理' },
      { href: '/admin/templates', icon: Package, label: '订阅模板' },
      { href: '/admin/message-templates', icon: Mail, label: '消息模板' },
    ],
  },
  {
    title: '数据与监控',
    items: [
      { href: '/admin/payments', icon: CreditCard, label: '支付记录' },
      { href: '/admin/exchange-rates', icon: DollarSign, label: '汇率管理' },
      { href: '/admin/notifications', icon: Bell, label: '通知管理' },
      { href: '/admin/ai-monitoring', icon: MessageSquare, label: 'AI 监控' },
      { href: '/admin/search-usage', icon: Search, label: '搜索用量' },
    ],
  },
  {
    title: '系统',
    items: [
      { href: '/admin/logs', icon: ScrollText, label: '系统日志' },
      { href: '/admin/ai-providers', icon: Bot, label: 'AI 供应商' },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside className="w-72 h-screen bg-surface border-r border-base flex flex-col fixed left-0 top-0 z-50">
      {/* Logo Section — 与主侧边栏保持一致 */}
      <div className="flex items-center gap-3 px-8 pt-8">
        <img src="/images/logo.png" alt="SubCare Logo" className="h-8 w-auto" />
        <span className="font-logo font-normal text-3xl text-gray-900 dark:text-white tracking-tight">
          SubCare
        </span>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
          Admin
        </span>
      </div>

      {/* Navigation — 分组侧边栏 */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={group.title} className={cn(gi > 0 && 'mt-5')}>
            <p className="px-4 mb-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group',
                      active
                        ? 'bg-primary-soft text-primary font-medium shadow-sm'
                        : 'text-secondary hover:bg-primary-pale hover:text-primary dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4.5 h-4.5 transition-colors',
                        active ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
                      )}
                    />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Back to User Side */}
      <div className="border-t border-base p-4 mt-auto">
        <a
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
          <span>返回用户端</span>
        </a>
      </div>
    </aside>
  );
}
