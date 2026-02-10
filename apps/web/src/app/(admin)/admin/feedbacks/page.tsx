'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  FeedbackItem,
  FeedbackStats,
  FeedbackFilters,
} from '@/services';
import {
  MessageCircle,
  Loader2,
  Trash2,
  Eye,
  ArrowLeft,
  X,
  Save,
  Filter,
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'OPEN', label: '待处理' },
  { value: 'IN_PROGRESS', label: '处理中' },
  { value: 'RESOLVED', label: '已解决' },
  { value: 'CLOSED', label: '已关闭' },
];

const TYPE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: '功能建议' },
  { value: 'question', label: '问题咨询' },
  { value: 'other', label: '其他' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'LOW', label: '低' },
  { value: 'NORMAL', label: '普通' },
  { value: 'HIGH', label: '高' },
  { value: 'URGENT', label: '紧急' },
];

function TypeIcon({ type }: { type: string }) {
  const config: Record<string, { icon: typeof Bug; color: string }> = {
    bug: { icon: Bug, color: 'text-red-500' },
    feature: { icon: Lightbulb, color: 'text-yellow-500' },
    question: { icon: HelpCircle, color: 'text-blue-500' },
    other: { icon: MoreHorizontal, color: 'text-gray-500' },
  };
  const c = config[type] || config.other;
  const Icon = c.icon;
  return <Icon className={cn('w-4 h-4', c.color)} />;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  const labels: Record<string, string> = {
    OPEN: '待处理',
    IN_PROGRESS: '处理中',
    RESOLVED: '已解决',
    CLOSED: '已关闭',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', colors[status] || colors.OPEN)}>
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    NORMAL: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', colors[priority] || colors.NORMAL)}>
      {priority}
    </span>
  );
}

export default function AdminFeedbacksPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FeedbackFilters>({ page: 1, limit: 20 });
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [editForm, setEditForm] = useState<{ status: string; priority: string; adminNote: string }>({
    status: '',
    priority: '',
    adminNote: '',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [listResult, statsResult] = await Promise.all([
        adminService.getFeedbacks(filters),
        adminService.getFeedbackStats(),
      ]);
      setItems(listResult.items);
      setTotal(listResult.total);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
      toast.error('获取反馈数据失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = (item: FeedbackItem) => {
    setSelectedItem(item);
    setEditForm({
      status: item.status,
      priority: item.priority,
      adminNote: item.adminNote || '',
    });
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      const updated = await adminService.updateFeedback(selectedItem.id, editForm);
      setSelectedItem(updated);
      toast.success('反馈已更新');
      await fetchData();
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此反馈？')) return;
    setDeletingId(id);
    try {
      await adminService.deleteFeedback(id);
      toast.success('反馈已删除');
      setSelectedItem(null);
      await fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Detail View
  if (selectedItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedItem(null)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TypeIcon type={selectedItem.type} />
              {selectedItem.title}
            </h2>
            <p className="text-sm text-secondary mt-0.5">
              {selectedItem.user?.email || selectedItem.userId} · {new Date(selectedItem.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <button
            onClick={() => handleDelete(selectedItem.id)}
            disabled={deletingId === selectedItem.id}
            className="flex items-center gap-1 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm transition-colors"
          >
            {deletingId === selectedItem.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            删除
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface rounded-2xl border border-base p-6">
              <div className="flex gap-2 mb-4">
                <StatusBadge status={selectedItem.status} />
                <PriorityBadge priority={selectedItem.priority} />
                <span className="px-2 py-0.5 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-secondary">
                  {selectedItem.type}
                </span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedItem.content}
              </div>
            </div>
          </div>

          {/* Admin Panel */}
          <div className="space-y-4">
            <div className="bg-surface rounded-2xl border border-base p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">管理操作</h3>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">状态</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">优先级</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {PRIORITY_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">管理员备注</label>
                <textarea
                  value={editForm.adminNote}
                  onChange={(e) => setEditForm({ ...editForm, adminNote: e.target.value })}
                  rows={4}
                  placeholder="处理备注..."
                  className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存更改
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-xl border border-base p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-secondary">总反馈数</p>
          </div>
          {stats.statusDistribution.map((s) => (
            <div key={s.status} className="bg-surface rounded-xl border border-base p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</p>
              <p className="text-xs text-secondary flex items-center gap-1">
                <StatusBadge status={s.status} />
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-surface rounded-xl border border-base p-4">
        <Filter className="w-4 h-4 text-secondary" />
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
          className="px-3 py-1.5 border border-base rounded-lg bg-surface text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label} 状态</option>
          ))}
        </select>
        <select
          value={filters.type || ''}
          onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined, page: 1 })}
          className="px-3 py-1.5 border border-base rounded-lg bg-surface text-sm"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label} 类型</option>
          ))}
        </select>
        <select
          value={filters.priority || ''}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined, page: 1 })}
          className="px-3 py-1.5 border border-base rounded-lg bg-surface text-sm"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label} 优先级</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center text-secondary">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无反馈数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="text-left px-6 py-3 font-medium text-secondary">类型</th>
                  <th className="text-left px-6 py-3 font-medium text-secondary">标题</th>
                  <th className="text-left px-6 py-3 font-medium text-secondary">用户</th>
                  <th className="text-left px-6 py-3 font-medium text-secondary">状态</th>
                  <th className="text-left px-6 py-3 font-medium text-secondary">优先级</th>
                  <th className="text-left px-6 py-3 font-medium text-secondary">时间</th>
                  <th className="text-right px-6 py-3 font-medium text-secondary">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-3"><TypeIcon type={item.type} /></td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleViewDetail(item)}
                        className="text-left text-gray-900 dark:text-white hover:text-primary transition-colors font-medium"
                      >
                        {item.title}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-secondary text-xs">
                      {item.user?.name || item.user?.email || '-'}
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-6 py-3"><PriorityBadge priority={item.priority} /></td>
                    <td className="px-6 py-3 text-secondary text-xs">
                      {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewDetail(item)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > (filters.limit || 20) && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-base">
            <p className="text-sm text-secondary">共 {total} 条</p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                disabled={(filters.page || 1) <= 1}
                className="px-3 py-1 text-sm border border-base rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                disabled={(filters.page || 1) * (filters.limit || 20) >= total}
                className="px-3 py-1 text-sm border border-base rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
