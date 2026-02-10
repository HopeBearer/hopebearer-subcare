'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ApiResponse } from '@subcare/types';
import { FolderTree, Plus, Pencil, Trash2, Loader2, Save, X, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { toast } from 'sonner';

interface CategoryItem {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  budgetLimit: string | number | null;
  createdAt: string;
  _count?: {
    subscriptions: number;
  };
}

interface CategoryForm {
  name: string;
  icon: string;
  color: string;
  budgetLimit: string;
}

const PRESET_COLORS = [
  '#A5A6F6', '#E879F9', '#FCD34D', '#34D399', '#60A5FA',
  '#F87171', '#818CF8', '#FB923C', '#9CA3AF', '#F472B6',
  '#2DD4BF', '#FACC15', '#A78BFA', '#38BDF8', '#4ADE80',
  '#FB7185', '#C084FC', '#FBBF24',
];

const PRESET_ICONS = [
  '🎬', '📺', '🔧', '📊', '☁️', '⚡', '📚', '💬', '📦',
  '🎮', '🎵', '💻', '📱', '🌐', '🔒', '💼', '🏠', '🚀',
  '🎨', '📷', '🛒', '💰', '📝', '🔔', '❤️', '⭐', '🏢', '🍿',
];

const defaultForm: CategoryForm = { name: '', icon: '📂', color: '#9CA3AF', budgetLimit: '' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [form, setForm] = useState<CategoryForm>(defaultForm);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<unknown, ApiResponse<{ categories: CategoryItem[] }>>('/categories');
      // Filter only system categories (userId === null in backend)
      setCategories(res.data?.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(defaultForm);
    setEditModalOpen(true);
  };

  const openEditDialog = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      icon: cat.icon || '📂',
      color: cat.color || '#9CA3AF',
      budgetLimit: cat.budgetLimit ? String(cat.budgetLimit) : '',
    });
    setEditModalOpen(true);
  };

  const openDeleteDialog = (cat: CategoryItem) => {
    setDeletingCategory(cat);
    setDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('分类名称不能为空');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        icon: form.icon || undefined,
        color: form.color || undefined,
        budgetLimit: form.budgetLimit ? Number(form.budgetLimit) : undefined,
      };

      if (editingId) {
        await api.patch(`/categories/${editingId}`, payload);
        toast.success('分类更新成功');
      } else {
        await api.post('/categories', payload);
        toast.success('分类创建成功');
      }

      setEditModalOpen(false);
      fetchCategories();
    } catch (error: unknown) {
      // Error toast handled by global interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await api.delete(`/categories/${deletingCategory.id}`);
      toast.success('分类删除成功');
      setDeleteModalOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (error: unknown) {
      // Error toast handled by global interceptor
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary">共 {categories.length} 个分类</span>
        <button
          onClick={openCreateDialog}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增分类
        </button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-surface rounded-2xl border border-base p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ backgroundColor: (cat.color || '#94a3b8') + '20' }}
                >
                  {cat.icon || '📂'}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{cat.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full border border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: cat.color || '#94a3b8' }}
                    />
                    <span className="text-xs text-secondary">{cat.color || '#94a3b8'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditDialog(cat)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary transition-colors"
                  title="编辑"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDeleteDialog(cat)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {cat.budgetLimit && (
              <p className="text-xs text-secondary mt-3">
                预算限额: ¥{Number(cat.budgetLimit).toLocaleString()}
              </p>
            )}
            {cat._count?.subscriptions !== undefined && (
              <p className="text-xs text-secondary mt-1">
                关联订阅: {cat._count.subscriptions} 个
              </p>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full text-center py-12 text-secondary">
            <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无分类</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingId ? '编辑分类' : '新增分类'}
        className="max-w-md"
      >
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              分类名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="如: Entertainment, Tools..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={50}
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              图标
            </label>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-gray-200 dark:border-gray-700"
                style={{ backgroundColor: (form.color || '#9CA3AF') + '20' }}
              >
                {form.icon}
              </div>
              <span className="text-sm text-secondary">点击选择图标</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setForm((prev) => ({ ...prev, icon }))}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                    form.icon === icon && 'ring-2 ring-primary bg-primary/10'
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              颜色
            </label>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700"
                style={{ backgroundColor: form.color }}
              />
              <div className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-secondary" />
                <input
                  type="text"
                  value={form.color.replace('#', '')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                    setForm((prev) => ({ ...prev, color: `#${val}` }));
                  }}
                  className="w-20 px-2 py-1 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  className={cn(
                    'w-7 h-7 rounded-lg border-2 transition-all',
                    form.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Budget Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              预算限额 (可选)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary">¥</span>
              <input
                type="number"
                value={form.budgetLimit}
                onChange={(e) => setForm((prev) => ({ ...prev, budgetLimit: e.target.value }))}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                min={0}
                step={0.01}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setEditModalOpen(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? '保存修改' : '创建分类'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingCategory(null);
        }}
        onConfirm={handleDelete}
        title="删除分类"
        description={
          deletingCategory
            ? `确定要删除分类 "${deletingCategory.name}" 吗？如果有订阅关联此分类，删除将会失败。`
            : ''
        }
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  );
}
