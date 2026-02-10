'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  MessageTemplateItem,
  MessageTemplateFormData,
} from '@/services';
import { Mail, Plus, Pencil, Trash2, Loader2, Save, Eye, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';

const CHANNEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  email: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    label: 'Email',
  },
  'in-app': {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    label: 'In-App',
  },
};

const defaultForm: MessageTemplateFormData = {
  key: '',
  title: '',
  content: '',
  channel: 'email',
};

export default function AdminMessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<MessageTemplateItem | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplateItem | null>(null);
  const [form, setForm] = useState<MessageTemplateFormData>(defaultForm);
  const [previewMode, setPreviewMode] = useState<'source' | 'preview'>('source');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getMessageTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(defaultForm);
    setEditModalOpen(true);
  };

  const openEditDialog = (template: MessageTemplateItem) => {
    setEditingId(template.id);
    setForm({
      key: template.key,
      title: template.title,
      content: template.content,
      channel: template.channel,
    });
    setEditModalOpen(true);
  };

  const openDeleteDialog = (template: MessageTemplateItem) => {
    setDeletingTemplate(template);
    setDeleteModalOpen(true);
  };

  const openPreview = (template: MessageTemplateItem) => {
    setPreviewTemplate(template);
    setPreviewMode('preview');
    setPreviewModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.key.trim() || !form.title.trim() || !form.content.trim()) {
      toast.error('Key、标题和内容不能为空');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await adminService.updateMessageTemplate(editingId, form);
        toast.success('模板更新成功');
      } else {
        await adminService.createMessageTemplate(form);
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
      await adminService.deleteMessageTemplate(deletingTemplate.id);
      toast.success('模板删除成功');
      setDeleteModalOpen(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch {
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
      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary">共 {templates.length} 个模板</span>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 font-medium text-secondary">Key</th>
              <th className="text-left px-4 py-3 font-medium text-secondary">标题</th>
              <th className="text-left px-4 py-3 font-medium text-secondary">渠道</th>
              <th className="text-left px-4 py-3 font-medium text-secondary">内容预览</th>
              <th className="text-right px-4 py-3 font-medium text-secondary">操作</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => {
              const channelStyle = CHANNEL_STYLES[template.channel] || CHANNEL_STYLES.email;
              return (
                <tr
                  key={template.id}
                  className="border-b border-base last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                      {template.key}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                    {template.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        channelStyle.bg,
                        channelStyle.text
                      )}
                    >
                      {channelStyle.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-secondary truncate max-w-xs">
                      {template.content.replace(/<[^>]*>/g, '').slice(0, 80)}...
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openPreview(template)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500 transition-colors"
                        title="预览"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
              );
            })}
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-secondary">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无消息模板</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingId ? '编辑消息模板' : '新增消息模板'}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
                placeholder="如: reset-password"
                disabled={!!editingId}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
            </div>

            {/* Channel */}
            <Select
              label="渠道"
              value={form.channel}
              onChange={(value) => setForm((prev) => ({ ...prev, channel: value }))}
              options={[
                { label: 'Email', value: 'email' },
                { label: 'In-App', value: 'in-app' },
              ]}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="模板标题"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Content Editor with Preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                内容 (HTML/Markdown) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode('source')}
                  className={cn(
                    'px-2 py-1 text-xs rounded-md transition-colors',
                    previewMode === 'source'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Code className="w-3 h-3 inline mr-1" />
                  源码
                </button>
                <button
                  onClick={() => setPreviewMode('preview')}
                  className={cn(
                    'px-2 py-1 text-xs rounded-md transition-colors',
                    previewMode === 'preview'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  预览
                </button>
              </div>
            </div>
            {previewMode === 'source' ? (
              <textarea
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="HTML 或 Markdown 内容..."
                rows={10}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-4 min-h-60 overflow-auto">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              </div>
            )}
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
              disabled={saving || !form.key.trim() || !form.title.trim() || !form.content.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? '保存修改' : '创建模板'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      {previewTemplate && (
        <Modal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewTemplate(null);
          }}
          title={`预览: ${previewTemplate.title}`}
          className="max-w-2xl"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-secondary">Key:</span>
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                {previewTemplate.key}
              </span>
              <span className="text-secondary">渠道:</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  CHANNEL_STYLES[previewTemplate.channel]?.bg,
                  CHANNEL_STYLES[previewTemplate.channel]?.text
                )}
              >
                {CHANNEL_STYLES[previewTemplate.channel]?.label || previewTemplate.channel}
              </span>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-6 min-h-48 overflow-auto">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingTemplate(null);
        }}
        onConfirm={handleDelete}
        title="删除消息模板"
        description={
          deletingTemplate
            ? `确定要删除消息模板 "${deletingTemplate.title}" (${deletingTemplate.key}) 吗？此操作不可撤销。`
            : ''
        }
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  );
}
