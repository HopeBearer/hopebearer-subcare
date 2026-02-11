'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  LoginAttemptItem,
  LoginAttemptListResult,
  LoginAttemptStats,
} from '@/services';
import {
  ShieldAlert,
  Loader2,
  Trash2,
  Unlock,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Snowflake,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'frozen' | 'expired';

const STATUS_TABS: { value: StatusFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: '全部', icon: ShieldAlert },
  { value: 'frozen', label: '冻结中', icon: Snowflake },
  { value: 'expired', label: '已过期', icon: Clock },
];

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

export default function AdminSecurityPage() {
  const [data, setData] = useState<LoginAttemptListResult | null>(null);
  const [stats, setStats] = useState<LoginAttemptStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [page, setPage] = useState(1);
  const [unfreezing, setUnfreezing] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [listResult, statsResult] = await Promise.all([
        adminService.getLoginAttempts({
          page,
          limit: 20,
          status: statusFilter,
          email: emailSearch || undefined,
        }),
        adminService.getLoginAttemptStats(),
      ]);
      setData(listResult);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to fetch login attempts:', error);
      toast.error('获取登录尝试数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, emailSearch]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // 倒计时刷新冻结秒数
  useEffect(() => {
    if (!data?.items.some((i) => i.isFrozen)) return;
    const timer = setInterval(() => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) => {
            if (!item.isFrozen || item.remainingSeconds <= 0) return item;
            const newSeconds = item.remainingSeconds - 1;
            return {
              ...item,
              remainingSeconds: newSeconds,
              isFrozen: newSeconds > 0,
            };
          }),
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [data?.items.some((i) => i.isFrozen)]);

  const handleUnfreeze = async (item: LoginAttemptItem) => {
    if (!confirm(`确定解冻账号 "${item.email}"？此操作将删除该记录。`)) return;
    setUnfreezing(item.id);
    try {
      await adminService.unfreezeLoginAttempt(item.id);
      toast.success(`已解冻 ${item.email}`);
      await fetchData();
    } catch (error) {
      console.error('Unfreeze failed:', error);
      toast.error('解冻失败');
    } finally {
      setUnfreezing(null);
    }
  };

  const handleClean = async () => {
    if (!confirm('确定清理所有已过期的登录尝试记录？')) return;
    setCleaning(true);
    try {
      const result = await adminService.cleanExpiredLoginAttempts();
      toast.success(`已清理 ${result.cleaned} 条过期记录`);
      await fetchData();
    } catch (error) {
      console.error('Clean failed:', error);
      toast.error('清理失败');
    } finally {
      setCleaning(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    // fetchData will be triggered by useEffect
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface rounded-2xl border border-base p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-secondary">总记录数</p>
            </div>
          </div>
          <div className="bg-surface rounded-2xl border border-base p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Snowflake className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.frozenCount}</p>
              <p className="text-xs text-secondary">当前冻结</p>
            </div>
          </div>
          <div className="bg-surface rounded-2xl border border-base p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total - stats.frozenCount}</p>
              <p className="text-xs text-secondary">已过期 / 未冻结</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex gap-2">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === tab.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                placeholder="搜索邮箱..."
                className="pl-9 pr-3 py-1.5 border border-base rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-56"
              />
            </div>
          </form>

          {/* Actions */}
          <button
            onClick={() => fetchData()}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={handleClean}
            disabled={cleaning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            清理过期
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
        {(!data?.items || data.items.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-secondary">
            <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
            <p>暂无登录尝试记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="text-left px-6 py-3 font-medium text-secondary">邮箱</th>
                  <th className="text-center px-4 py-3 font-medium text-secondary">失败次数</th>
                  <th className="text-center px-4 py-3 font-medium text-secondary">状态</th>
                  <th className="text-center px-4 py-3 font-medium text-secondary">剩余冻结时间</th>
                  <th className="text-left px-4 py-3 font-medium text-secondary">最后失败时间</th>
                  <th className="text-right px-6 py-3 font-medium text-secondary">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {data.items.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors',
                      item.isFrozen && 'bg-red-50/30 dark:bg-red-900/5'
                    )}
                  >
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs">{item.email}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold',
                        item.count >= 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        item.count >= 6 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      )}>
                        {item.count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.isFrozen ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <Snowflake className="w-3 h-3" />
                          冻结中
                        </span>
                      ) : item.lockedUntil ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          已过期
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <AlertTriangle className="w-3 h-3" />
                          计数中
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {item.isFrozen ? (
                        <span className="text-red-600 dark:text-red-400 font-mono font-medium">
                          {formatCountdown(item.remainingSeconds)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">
                      {formatDateTime(item.lastAttemptAt)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleUnfreeze(item)}
                        disabled={unfreezing === item.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="解冻（删除记录）"
                      >
                        {unfreezing === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        解冻
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-secondary">
          <span>
            共 {meta.total} 条，第 {meta.page}/{meta.totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm transition-colors',
                    page === pageNum
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={page >= meta.totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
