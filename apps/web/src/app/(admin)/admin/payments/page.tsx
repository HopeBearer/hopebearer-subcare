'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  AdminPaymentListResult,
  AdminPaymentStats,
  AdminPaymentFilters,
} from '@/services';
import {
  CreditCard,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PAID: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', label: '已支付' },
  PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', label: '待支付' },
  UNPAID: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', label: '未支付' },
  FAILED: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', label: '失败' },
  REFUNDED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: '已退款' },
};

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
        <div className="flex-1">
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

export default function AdminPaymentsPage() {
  const [records, setRecords] = useState<AdminPaymentListResult | null>(null);
  const [stats, setStats] = useState<AdminPaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminPaymentFilters>({ page: 1, limit: 20 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsData, statsData] = await Promise.all([
        adminService.getPaymentRecords(filters),
        adminService.getPaymentStats(),
      ]);
      setRecords(recordsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = records ? Math.ceil(records.total / (filters.limit || 20)) : 0;

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  if (loading && !records) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const monthChange = stats
    ? stats.lastMonthAmount > 0
      ? (((stats.thisMonthAmount - stats.lastMonthAmount) / stats.lastMonthAmount) * 100).toFixed(1)
      : stats.thisMonthAmount > 0 ? '+100' : '0'
    : '0';

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总交易笔数"
            value={stats.totalCount.toLocaleString()}
            icon={CreditCard}
            color="text-blue-600"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            title="本月流水"
            value={`¥${stats.thisMonthAmount.toLocaleString()}`}
            subtitle={`环比 ${Number(monthChange) >= 0 ? '+' : ''}${monthChange}%`}
            icon={Number(monthChange) >= 0 ? TrendingUp : TrendingDown}
            color={Number(monthChange) >= 0 ? 'text-green-600' : 'text-red-600'}
            bgColor={Number(monthChange) >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}
          />
          <StatCard
            title="上月流水"
            value={`¥${stats.lastMonthAmount.toLocaleString()}`}
            icon={DollarSign}
            color="text-purple-600"
            bgColor="bg-purple-50 dark:bg-purple-900/20"
          />
          <StatCard
            title="异常笔数"
            value={stats.statusDistribution.filter((s) => s.status === 'FAILED' || s.status === 'REFUNDED').reduce((a, b) => a + b.count, 0)}
            subtitle="FAILED + REFUNDED"
            icon={AlertCircle}
            color="text-red-600"
            bgColor="bg-red-50 dark:bg-red-900/20"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-36">
          <Select
            value={filters.status || ''}
            onChange={(val) => handleFilterChange('status', val)}
            placeholder="全部状态"
            options={[
              { value: '', label: '全部状态' },
              { value: 'PAID', label: '已支付' },
              { value: 'PENDING', label: '待支付' },
              { value: 'UNPAID', label: '未支付' },
              { value: 'FAILED', label: '失败' },
              { value: 'REFUNDED', label: '已退款' },
            ]}
          />
        </div>
        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          className="px-3 py-2 text-sm border border-base rounded-xl bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          className="px-3 py-2 text-sm border border-base rounded-xl bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="text-left px-6 py-3 font-medium text-secondary">用户</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">订阅</th>
                    <th className="text-right px-6 py-3 font-medium text-secondary">金额</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">状态</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">账单日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base">
                  {records?.items.map((item) => {
                    const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.PAID;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {item.user?.name || item.user?.email || '-'}
                            </p>
                            {item.user?.name && (
                              <p className="text-xs text-secondary">{item.user.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                          {item.subscription?.name || '-'}
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                          {item.currency} {item.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', statusStyle.bg, statusStyle.text)}>
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-secondary text-xs">
                          {new Date(item.billingDate).toLocaleDateString('zh-CN')}
                        </td>
                      </tr>
                    );
                  })}
                  {(!records || records.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-secondary">
                        暂无支付记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {records && records.total > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-base">
                <p className="text-sm text-secondary">
                  共 {records.total} 条，合计 ¥{records.totalAmount.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, (p.page || 1) - 1) }))}
                    disabled={(filters.page || 1) <= 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-secondary">
                    {filters.page || 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setFilters((p) => ({ ...p, page: Math.min(totalPages, (p.page || 1) + 1) }))}
                    disabled={(filters.page || 1) >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
