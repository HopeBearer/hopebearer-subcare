'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  FeedbackItem,
  FeedbackListResult,
  FeedbackCreateData,
} from '@/services';
import {
  MessageSquareText,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Bug,
  Lightbulb,
  HelpCircle,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Circle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

const TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug 报告', icon: Bug, color: 'text-red-500' },
  { value: 'feature', label: '功能建议', icon: Lightbulb, color: 'text-amber-500' },
  { value: 'question', label: '问题咨询', icon: HelpCircle, color: 'text-blue-500' },
  { value: 'other', label: '其他', icon: MoreHorizontal, color: 'text-gray-500' },
];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Circle; color: string; bg: string }> = {
  OPEN: { label: '待处理', icon: Circle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  IN_PROGRESS: { label: '处理中', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  RESOLVED: { label: '已解决', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  CLOSED: { label: '已关闭', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/50' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: '低', color: 'text-gray-500' },
  NORMAL: { label: '普通', color: 'text-blue-500' },
  HIGH: { label: '高', color: 'text-orange-500' },
  URGENT: { label: '紧急', color: 'text-red-500' },
};

export default function UserFeedbacksPage() {
  const [data, setData] = useState<FeedbackListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [form, setForm] = useState<FeedbackCreateData>({
    type: 'bug',
    title: '',
    content: '',
    priority: 'NORMAL',
  });
  const limit = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.getMyFeedbacks(page, limit);
      setData(result);
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
      toast.error('获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('请填写标题');
      return;
    }
    if (!form.content.trim()) {
      toast.error('请填写详细内容');
      return;
    }

    setSubmitting(true);
    try {
      await adminService.createFeedback(form);
      toast.success('反馈提交成功，我们会尽快处理');
      setShowCreate(false);
      setForm({ type: 'bug', title: '', content: '', priority: 'NORMAL' });
      fetchData();
    } catch (error) {
      console.error('Failed to create feedback:', error);
      toast.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquareText className="w-6 h-6 text-primary" />
            我的反馈
          </h1>
          <p className="text-sm text-secondary mt-1">
            提交 bug 报告、功能建议或问题咨询
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          新建反馈
        </button>
      </div>

      {/* Feedback List */}
      {loading && !data ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquareText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-secondary text-lg">暂无反馈记录</p>
          <p className="text-sm text-secondary mt-1">点击右上角"新建反馈"提交您的第一条反馈</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((item) => {
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.OPEN;
            const typeOption = TYPE_OPTIONS.find((t) => t.value === item.type);
            const StatusIcon = statusConfig.icon;
            const TypeIcon = typeOption?.icon || MoreHorizontal;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedFeedback(item)}
                className="bg-surface border border-base rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('p-2 rounded-xl', statusConfig.bg)}>
                    <TypeIcon className={cn('w-5 h-5', typeOption?.color || 'text-gray-500')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-secondary line-clamp-2">{item.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-secondary">
                      <span className={cn('flex items-center gap-1', statusConfig.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                      <span className={cn(PRIORITY_CONFIG[item.priority]?.color)}>
                        {PRIORITY_CONFIG[item.priority]?.label || item.priority}
                      </span>
                      <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-secondary px-3">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Feedback Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="新建反馈">
        <div className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              反馈类型
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-sm',
                    form.type === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-base hover:border-gray-300 dark:hover:border-gray-600 text-secondary'
                  )}
                >
                  <opt.icon className={cn('w-5 h-5', form.type === opt.value ? 'text-primary' : opt.color)} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              优先级
            </label>
            <div className="flex gap-2">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setForm((f) => ({ ...f, priority: key }))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-sm transition-all',
                    form.priority === key
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-base text-secondary hover:border-gray-300'
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="简要描述问题或建议..."
              className="w-full px-4 py-2.5 border border-base rounded-xl bg-surface text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              详细描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="请详细描述您遇到的问题或建议..."
              rows={5}
              className="w-full px-4 py-2.5 border border-base rounded-xl bg-surface text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl border border-base text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              提交反馈
            </button>
          </div>
        </div>
      </Modal>

      {/* Feedback Detail Modal */}
      <Modal
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        title="反馈详情"
      >
        {selectedFeedback && (() => {
          const statusConfig = STATUS_CONFIG[selectedFeedback.status] || STATUS_CONFIG.OPEN;
          const typeOption = TYPE_OPTIONS.find((t) => t.value === selectedFeedback.type);
          const StatusIcon = statusConfig.icon;

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium', statusConfig.bg, statusConfig.color)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig.label}
                </span>
                <span className="text-sm text-secondary">
                  {typeOption?.label || selectedFeedback.type}
                </span>
                <span className={cn('text-sm', PRIORITY_CONFIG[selectedFeedback.priority]?.color)}>
                  {PRIORITY_CONFIG[selectedFeedback.priority]?.label}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedFeedback.title}
              </h3>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedFeedback.content}
              </div>

              {selectedFeedback.adminNote && (
                <div className="border-l-4 border-primary bg-primary/5 rounded-r-xl p-4">
                  <p className="text-sm font-medium text-primary mb-1">管理员回复</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedFeedback.adminNote}
                  </p>
                </div>
              )}

              <div className="text-xs text-secondary">
                提交于 {new Date(selectedFeedback.createdAt).toLocaleString('zh-CN')}
                {selectedFeedback.updatedAt !== selectedFeedback.createdAt && (
                  <> · 更新于 {new Date(selectedFeedback.updatedAt).toLocaleString('zh-CN')}</>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
