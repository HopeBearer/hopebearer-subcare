'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminService, AdminSearchUsageStats } from '@/services';
import {
  Search,
  Loader2,
  Trash2,
  Database,
  TrendingUp,
  Gauge,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function StatCard({ title, value, subtitle, icon: Icon, color, bgColor }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-base p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-secondary font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-secondary mt-1">{subtitle}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      </div>
    </div>
  );
}

export default function AdminSearchUsagePage() {
  const [data, setData] = useState<AdminSearchUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await adminService.getSearchUsageStats();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch search usage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCleanCache = async () => {
    setCleaning(true);
    try {
      const result = await adminService.cleanExpiredCache();
      toast.success(`已清理 ${result.cleaned} 条过期缓存`);
      fetchData();
    } catch (error) {
      console.error('Clean failed:', error);
      toast.error('清理失败');
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-secondary py-20">获取数据失败</div>
    );
  }

  const usageColor = data.currentMonth.usagePercent > 80
    ? 'text-red-600'
    : data.currentMonth.usagePercent > 50
      ? 'text-amber-600'
      : 'text-green-600';

  const barColor = data.currentMonth.usagePercent > 80
    ? 'bg-red-500'
    : data.currentMonth.usagePercent > 50
      ? 'bg-amber-500'
      : 'bg-green-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          搜索用量管理
        </h1>
        <button
          onClick={handleCleanCache}
          disabled={cleaning || data.cache.expired === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
        >
          <Trash2 className={cn('w-4 h-4', cleaning && 'animate-spin')} />
          清理过期缓存 ({data.cache.expired})
        </button>
      </div>

      {/* Current Month Usage */}
      <div className="bg-surface rounded-2xl border border-base p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" />
              当月用量 ({data.currentMonth.month})
            </h3>
            <p className="text-xs text-secondary mt-1">Tavily 搜索 API 月度配额</p>
          </div>
          <div className="text-right">
            <p className={cn('text-3xl font-bold', usageColor)}>
              {data.currentMonth.usagePercent}%
            </p>
            <p className="text-xs text-secondary">
              {data.currentMonth.count} / {data.currentMonth.limit}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(data.currentMonth.usagePercent, 100)}%` }}
          />
        </div>

        <div className="flex justify-between mt-2 text-xs text-secondary">
          <span>已用: {data.currentMonth.count}</span>
          <span>剩余: {data.currentMonth.remaining}</span>
        </div>

        {data.currentMonth.usagePercent > 80 && (
          <div className="mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm">月度配额使用已超过 80%，请注意控制用量</p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="缓存总数"
          value={data.cache.total}
          subtitle={`活跃 ${data.cache.active} / 过期 ${data.cache.expired}`}
          icon={Database}
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          title="本月调用"
          value={data.currentMonth.count}
          subtitle={`额度 ${data.currentMonth.limit}`}
          icon={Search}
          color="text-green-600"
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          title="历史月份"
          value={data.history.length}
          subtitle="有使用记录的月份数"
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* History Table */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-base">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            月度使用历史
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base bg-gray-50/50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 font-medium text-secondary">月份</th>
                <th className="text-right px-6 py-3 font-medium text-secondary">调用次数</th>
                <th className="text-right px-6 py-3 font-medium text-secondary">额度上限</th>
                <th className="text-right px-6 py-3 font-medium text-secondary">使用率</th>
                <th className="text-left px-6 py-3 font-medium text-secondary">进度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {data.history.map((item) => {
                const pct = item.limit > 0 ? ((item.count / item.limit) * 100) : 0;
                const pctColor = pct > 80 ? 'text-red-600' : pct > 50 ? 'text-amber-600' : 'text-green-600';
                const pctBarColor = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-green-500';
                return (
                  <tr key={item.month} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-3 font-mono font-semibold text-gray-900 dark:text-white">
                      {item.month}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-secondary">
                      {item.limit.toLocaleString()}
                    </td>
                    <td className={cn('px-6 py-3 text-right font-mono font-medium', pctColor)}>
                      {pct.toFixed(1)}%
                    </td>
                    <td className="px-6 py-3">
                      <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', pctBarColor)}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-secondary">
                    暂无使用记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
