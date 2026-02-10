'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  AdminNotificationListResult,
  AdminNotificationStats,
  AdminNotificationFilters,
} from '@/services';
import {
  Bell,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  MailCheck,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  system: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', label: '系统' },
  billing: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', label: '账单' },
  security: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', label: '安全' },
  marketing: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', label: '营销' },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  NORMAL: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  HIGH: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
  URGENT: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
};

function StatCard({ title, value, icon: Icon, color, bgColor }: {
  title: string;
  value: string | number;
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
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [list, setList] = useState<AdminNotificationListResult | null>(null);
  const [stats, setStats] = useState<AdminNotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminNotificationFilters>({ page: 1, limit: 20 });
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', content: '', type: 'system', priority: 'NORMAL' });
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, statsData] = await Promise.all([
        adminService.getAdminNotifications(filters),
        adminService.getNotificationStats(),
      ]);
      setList(listData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = list ? Math.ceil(list.total / (filters.limit || 20)) : 0;

  const handleBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    setSending(true);
    try {
      const result = await adminService.broadcastNotification(broadcastForm);
      toast.success(`已向 ${result.targetUsers} 位用户发送通知`);
      setBroadcastOpen(false);
      setBroadcastForm({ title: '', content: '', type: 'system', priority: 'NORMAL' });
      fetchData();
    } catch (error) {
      console.error('Broadcast failed:', error);
      toast.error('发送失败');
    } finally {
      setSending(false);
    }
  };

  if (loading && !list) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setBroadcastOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Send className="w-4 h-4" />
          广播通知
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="通知总数" value={stats.total.toLocaleString()} icon={Bell} color="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-900/20" />
          <StatCard title="未读通知" value={stats.unread.toLocaleString()} icon={Mail} color="text-orange-600" bgColor="bg-orange-50 dark:bg-orange-900/20" />
          <StatCard title="已读率" value={`${stats.readRate}%`} icon={MailCheck} color="text-green-600" bgColor="bg-green-50 dark:bg-green-900/20" />
          <StatCard
            title="高优先级"
            value={stats.priorityDistribution.filter((p) => p.priority === 'HIGH' || p.priority === 'URGENT').reduce((a, b) => a + b.count, 0)}
            icon={AlertTriangle}
            color="text-red-600"
            bgColor="bg-red-50 dark:bg-red-900/20"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-32">
          <Select
            value={filters.type || ''}
            onChange={(val) => setFilters((p) => ({ ...p, type: val || undefined, page: 1 }))}
            placeholder="全部类型"
            options={[
              { value: '', label: '全部类型' },
              { value: 'system', label: '系统' },
              { value: 'billing', label: '账单' },
              { value: 'security', label: '安全' },
              { value: 'marketing', label: '营销' },
            ]}
          />
        </div>
        <div className="w-36">
          <Select
            value={filters.priority || ''}
            onChange={(val) => setFilters((p) => ({ ...p, priority: val || undefined, page: 1 }))}
            placeholder="全部优先级"
            options={[
              { value: '', label: '全部优先级' },
              { value: 'LOW', label: 'Low' },
              { value: 'NORMAL', label: 'Normal' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' },
            ]}
          />
        </div>
        <div className="w-28">
          <Select
            value={filters.isRead || ''}
            onChange={(val) => setFilters((p) => ({ ...p, isRead: val || undefined, page: 1 }))}
            placeholder="全部状态"
            options={[
              { value: '', label: '全部状态' },
              { value: 'false', label: '未读' },
              { value: 'true', label: '已读' },
            ]}
          />
        </div>
      </div>

      {/* List */}
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
                    <th className="text-left px-6 py-3 font-medium text-secondary">标题</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">用户</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">类型</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">优先级</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">状态</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base">
                  {list?.items.map((item) => {
                    const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.system;
                    const prioStyle = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.NORMAL;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-3">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-xs">
                            {item.title}
                          </p>
                          <p className="text-xs text-secondary truncate max-w-xs mt-0.5">
                            {item.content.slice(0, 60)}{item.content.length > 60 ? '...' : ''}
                          </p>
                        </td>
                        <td className="px-6 py-3 text-sm text-secondary">
                          {item.user?.name || item.user?.email || '-'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', typeStyle.bg, typeStyle.text)}>
                            {typeStyle.label}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', prioStyle.bg, prioStyle.text)}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {item.isRead ? (
                            <span className="text-xs text-green-600 dark:text-green-400">已读</span>
                          ) : (
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">未读</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs text-secondary whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    );
                  })}
                  {(!list || list.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                        暂无通知数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {list && list.total > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-base">
                <p className="text-sm text-secondary">共 {list.total} 条</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, (p.page || 1) - 1) }))}
                    disabled={(filters.page || 1) <= 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-secondary">{filters.page || 1} / {totalPages}</span>
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

      {/* Broadcast Modal */}
      <Modal isOpen={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="广播系统通知">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题</label>
            <input
              value={broadcastForm.title}
              onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="通知标题"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">内容</label>
            <textarea
              rows={4}
              value={broadcastForm.content}
              onChange={(e) => setBroadcastForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="通知内容..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select
                label="类型"
                value={broadcastForm.type}
                onChange={(val) => setBroadcastForm((f) => ({ ...f, type: val }))}
                options={[
                  { value: 'system', label: '系统' },
                  { value: 'marketing', label: '营销' },
                  { value: 'billing', label: '账单' },
                ]}
              />
            </div>
            <div>
              <Select
                label="优先级"
                value={broadcastForm.priority}
                onChange={(val) => setBroadcastForm((f) => ({ ...f, priority: val }))}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'NORMAL', label: 'Normal' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'URGENT', label: 'Urgent' },
                ]}
              />
            </div>
          </div>
          <p className="text-xs text-secondary">
            * 广播将发送给所有活跃用户
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setBroadcastOpen(false)}
              className="px-4 py-2 text-sm text-secondary hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleBroadcast}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发送
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
