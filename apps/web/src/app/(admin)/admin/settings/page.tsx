'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  SystemSettingsData,
  SystemSettingItem,
  SystemSettingFormData,
} from '@/services';
import {
  Settings,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  Pencil,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const GROUP_LABELS: Record<string, string> = {
  general: '通用设置',
  security: '安全设置',
  ai: 'AI 设置',
  notification: '通知设置',
};

const TYPE_OPTIONS = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'json', label: 'JSON' },
];

export default function AdminSettingsPage() {
  const [data, setData] = useState<SystemSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemSettingItem | null>(null);
  const [formData, setFormData] = useState<SystemSettingFormData>({
    key: '',
    value: '',
    type: 'string',
    group: 'general',
    label: '',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await adminService.getSystemSettings();
      setData(result);
      if (!activeGroup && result.groups.length > 0) {
        setActiveGroup(result.groups[0]);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('获取系统设置失败');
    } finally {
      setLoading(false);
    }
  }, [activeGroup]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ key: '', value: '', type: 'string', group: activeGroup || 'general', label: '' });
    setShowForm(true);
  };

  const handleEdit = (item: SystemSettingItem) => {
    setEditingItem(item);
    setFormData({
      key: item.key,
      value: item.value,
      type: item.type,
      group: item.group,
      label: item.label || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.key || formData.value === undefined) {
      toast.error('请填写 Key 和 Value');
      return;
    }
    setSaving(true);
    try {
      await adminService.upsertSetting(formData);
      setShowForm(false);
      setEditingItem(null);
      toast.success(editingItem ? '设置已更新' : '设置已创建');
      await fetchData();
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: SystemSettingItem) => {
    if (!confirm(`确定删除设置 "${item.key}"？`)) return;
    setDeletingId(item.id);
    try {
      await adminService.deleteSetting(item.id);
      toast.success('设置已删除');
      await fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const renderValue = (item: SystemSettingItem) => {
    if (item.type === 'boolean') {
      return (
        <span className={cn(
          'px-2 py-0.5 rounded-md text-xs font-medium',
          item.value === 'true'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        )}>
          {item.value === 'true' ? '开启' : '关闭'}
        </span>
      );
    }
    if (item.type === 'json') {
      return <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{item.value.slice(0, 60)}...</code>;
    }
    return <span className="text-gray-700 dark:text-gray-300">{item.value}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentSettings = data?.grouped[activeGroup] || [];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增设置
        </button>
      </div>

      {/* Group Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(data?.groups || []).map((group) => (
          <button
            key={group}
            onClick={() => setActiveGroup(group)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2',
              activeGroup === group
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {GROUP_LABELS[group] || group}
            <span className="text-xs opacity-75">
              ({data?.grouped[group]?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Settings Table */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
        {currentSettings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-secondary">
            <Settings className="w-12 h-12 mb-3 opacity-30" />
            <p>该分组暂无设置项</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="text-left px-6 py-3 font-medium text-secondary">Key</th>
                  <th className="text-left px-6 py-3 font-medium text-secondary">描述</th>
                  <th className="text-left px-6 py-3 font-medium text-secondary">值</th>
                  <th className="text-left px-6 py-3 font-medium text-secondary">类型</th>
                  <th className="text-left px-6 py-3 font-medium text-secondary">更新时间</th>
                  <th className="text-right px-6 py-3 font-medium text-secondary">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {currentSettings.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-3">
                      <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {item.key}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-secondary">{item.label || '-'}</td>
                    <td className="px-6 py-3">{renderValue(item)}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-secondary text-xs">
                      {new Date(item.updatedAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
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
      </div>

      {/* Modal: Add/Edit Setting */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl border border-base shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingItem ? '编辑设置' : '新增设置'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Key</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  disabled={!!editingItem}
                  placeholder="site.name"
                  className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">描述 (Label)</label>
                <input
                  type="text"
                  value={formData.label || ''}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="站点名称"
                  className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">分组</label>
                  <input
                    type="text"
                    value={formData.group || ''}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    placeholder="general"
                    className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">值</label>
                {formData.type === 'boolean' ? (
                  <select
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="true">true (开启)</option>
                    <option value="false">false (关闭)</option>
                  </select>
                ) : formData.type === 'json' ? (
                  <textarea
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    rows={4}
                    placeholder='{"key": "value"}'
                    className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <input
                    type={formData.type === 'number' ? 'number' : 'text'}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 border border-base rounded-xl bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-secondary hover:text-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
