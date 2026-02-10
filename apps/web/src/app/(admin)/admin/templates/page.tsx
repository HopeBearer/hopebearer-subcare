'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  SubscriptionTemplateItem,
  TemplateFormData,
} from '@/services';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  Search,
  Globe,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';

const CYCLE_LABELS: Record<string, string> = {
  monthly: '月付',
  yearly: '年付',
  weekly: '周付',
  daily: '日付',
};

const defaultForm: TemplateFormData = {
  name: '',
  displayName: '',
  description: '',
  searchText: '',
  category: '',
  icon: '',
  website: '',
  defaultCurrency: 'CNY',
  defaultCycle: 'monthly',
};

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<SubscriptionTemplateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Dialog states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<SubscriptionTemplateItem | null>(null);
  const [form, setForm] = useState<TemplateFormData>(defaultForm);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getTemplates({
        query: searchQuery || undefined,
        page,
        limit,
      });
      setTemplates(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const totalPages = Math.ceil(total / limit);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(defaultForm);
    setEditModalOpen(true);
  };

  const openEditDialog = (template: SubscriptionTemplateItem) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      displayName: template.displayName || '',
      description: template.description || '',
      searchText: template.searchText,
      category: template.category || '',
      icon: template.icon || '',
      website: template.website || '',
      defaultCurrency: template.defaultCurrency || 'CNY',
      defaultCycle: template.defaultCycle || 'monthly',
    });
    setEditModalOpen(true);
  };

  const openDeleteDialog = (template: SubscriptionTemplateItem) => {
    setDeletingTemplate(template);
    setDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.searchText.trim()) {
      toast.error('名称和搜索关键词不能为空');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await adminService.updateTemplate(editingId, form);
        toast.success('模板更新成功');
      } else {
        await adminService.createTemplate(form);
        toast.success('模板创建成功');
      }
      setEditModalOpen(false);
      fetchTemplates();
    } catch {
      // Error toast handled by global interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      await adminService.deleteTemplate(deletingTemplate.id);
      toast.success('模板删除成功');
      setDeleteModalOpen(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch {
      // Error toast handled by global interceptor
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTemplates();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模板名称..."
              className="pl-9 pr-3 py-2 text-sm border border-base rounded-xl bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
            />
          </div>
          <span className="text-sm text-secondary">共 {total} 个模板</span>
        </form>
        <button
          onClick={openCreateDialog}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增模板
        </button>
      </div>

      {/* Template Table */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-secondary">名称</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">分类</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">默认货币</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">默认周期</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">网站</th>
                <th className="text-right px-4 py-3 font-medium text-secondary">操作</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-base last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {template.icon && <span className="text-base">{template.icon}</span>}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                        {template.displayName && template.displayName !== template.name && (
                          <p className="text-xs text-secondary">{template.displayName}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {template.category ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {template.category}
                      </span>
                    ) : (
                      <span className="text-xs text-secondary">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{template.defaultCurrency}</td>
                  <td className="px-4 py-3 text-xs">
                    {CYCLE_LABELS[template.defaultCycle] || template.defaultCycle}
                  </td>
                  <td className="px-4 py-3">
                    {template.website ? (
                      <a
                        href={template.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        访问
                      </a>
                    ) : (
                      <span className="text-xs text-secondary">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditDialog(template)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(template)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-secondary">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>暂无订阅模板</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-base">
            <span className="text-xs text-secondary">
              第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingId ? '编辑订阅模板' : '新增订阅模板'}
        className="max-w-lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="如: Netflix"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              显示名称
            </label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
              placeholder="如: Netflix 奈飞"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Search Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              搜索关键词 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.searchText}
              onChange={(e) => setForm((prev) => ({ ...prev, searchText: e.target.value }))}
              placeholder="搜索关键词，逗号分隔"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                分类
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="如: Streaming"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                图标
              </label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                placeholder="如: 🎬 或 URL"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              网站
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Default Currency */}
            <Select
              label="默认货币"
              value={form.defaultCurrency}
              onChange={(value) => setForm((prev) => ({ ...prev, defaultCurrency: value }))}
              options={[
                { label: 'CNY', value: 'CNY' },
                { label: 'USD', value: 'USD' },
                { label: 'EUR', value: 'EUR' },
                { label: 'GBP', value: 'GBP' },
                { label: 'JPY', value: 'JPY' },
              ]}
            />

            {/* Default Cycle */}
            <Select
              label="默认周期"
              value={form.defaultCycle}
              onChange={(value) => setForm((prev) => ({ ...prev, defaultCycle: value }))}
              options={[
                { label: '月付', value: 'monthly' },
                { label: '年付', value: 'yearly' },
                { label: '周付', value: 'weekly' },
                { label: '日付', value: 'daily' },
              ]}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="模板描述..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 mt-4 border-t border-base">
          <button
            onClick={() => setEditModalOpen(false)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.searchText.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingId ? '保存修改' : '创建模板'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingTemplate(null);
        }}
        onConfirm={handleDelete}
        title="删除模板"
        description={
          deletingTemplate
            ? `确定要删除订阅模板 "${deletingTemplate.name}" 吗？此操作不可撤销。`
            : ''
        }
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  );
}
