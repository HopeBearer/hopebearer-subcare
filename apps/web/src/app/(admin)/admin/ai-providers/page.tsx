'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ApiResponse, AIProviderDTO } from '@subcare/types';
import {
  Bot, RefreshCw, Loader2, ExternalLink, ChevronDown, ChevronUp,
  Zap, Globe, Server, Plus, Pencil, Trash2, Power, PowerOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';

// ========== Types ==========
interface AIModelItem {
  id: string;
  modelId: string;
  name: string;
  description?: string;
  contextLength?: number;
  isFree: boolean;
}

interface ProviderForm {
  name: string;
  slug: string;
  baseUrl: string;
  modelsUrl: string;
  description: string;
  website: string;
  modelFetchStrategy: string;
  apiFormat: string;
  sortOrder: number;
}

interface ModelForm {
  modelId: string;
  name: string;
  description: string;
  contextLength: string;
  maxTokens: string;
  isFree: boolean;
}

const emptyProviderForm: ProviderForm = {
  name: '', slug: '', baseUrl: '', modelsUrl: '', description: '',
  website: '', modelFetchStrategy: 'DYNAMIC', apiFormat: 'OPENAI', sortOrder: 0,
};

const emptyModelForm: ModelForm = {
  modelId: '', name: '', description: '', contextLength: '', maxTokens: '', isFree: false,
};

const STRATEGY_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  DYNAMIC: { label: '动态获取', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300', desc: '需要用户 API Key 实时拉取模型列表' },
  PUBLIC: { label: '公开缓存', color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-300', desc: '公开 API，服务端定期缓存' },
  MANUAL: { label: '手动维护', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300', desc: '管理员手动添加和维护模型' },
};

const FORMAT_LABELS: Record<string, string> = {
  OPENAI: 'OpenAI 兼容',
  ANTHROPIC: 'Anthropic',
  CUSTOM: '自定义',
};

// ========== Main Component ==========
export default function AdminAIProvidersPage() {
  const [providers, setProviders] = useState<AIProviderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [models, setModels] = useState<Record<string, AIModelItem[]>>({});
  const [modelsLoading, setModelsLoading] = useState<string | null>(null);

  // Provider modal
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerForm, setProviderForm] = useState<ProviderForm>(emptyProviderForm);
  const [providerSaving, setProviderSaving] = useState(false);

  // Model modal
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [modelTargetProvider, setModelTargetProvider] = useState<{ id: string; name: string } | null>(null);
  const [modelForm, setModelForm] = useState<ModelForm>(emptyModelForm);
  const [modelSaving, setModelSaving] = useState(false);

  // Delete confirmation
  const [deletingModel, setDeletingModel] = useState<{ providerId: string; modelId: string; name: string } | null>(null);

  // ========== Data Fetching ==========
  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<unknown, ApiResponse<AIProviderDTO[]>>('/ai-providers?includeInactive=true');
      const data = res.data;
      setProviders(Array.isArray(data) ? data : (data as { providers?: AIProviderDTO[] })?.providers || []);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const fetchModels = async (providerId: string) => {
    try {
      setModelsLoading(providerId);
      const res = await api.get<unknown, ApiResponse<AIModelItem[]>>(`/ai-providers/${providerId}/models`);
      const data = res.data;
      setModels((prev) => ({ ...prev, [providerId]: Array.isArray(data) ? data : [] }));
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setModelsLoading(null);
    }
  };

  // ========== Provider Actions ==========
  const handleSync = async (providerId: string) => {
    try {
      setSyncing(providerId);
      const res = await api.post<unknown, ApiResponse<{ added: number; updated: number; removed: number }>>(`/ai-providers/${providerId}/sync`);
      toast.success(`同步完成: 新增 ${res.data.added}, 更新 ${res.data.updated}, 移除 ${res.data.removed}`);
      fetchProviders();
      if (expandedProvider === providerId) fetchModels(providerId);
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      await api.post('/ai-providers/sync-all');
      toast.success('所有供应商同步完成');
      fetchProviders();
    } catch (error) {
      console.error('Failed to sync all:', error);
    } finally {
      setSyncingAll(false);
    }
  };

  const toggleExpand = (providerId: string) => {
    if (expandedProvider === providerId) {
      setExpandedProvider(null);
    } else {
      setExpandedProvider(providerId);
      if (!models[providerId]) fetchModels(providerId);
    }
  };

  const handleToggleActive = async (provider: AIProviderDTO) => {
    try {
      await api.patch(`/ai-providers/${provider.id}`, { isActive: !provider.isActive });
      toast.success(provider.isActive ? '已禁用' : '已启用');
      fetchProviders();
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  };

  // ========== Provider CRUD ==========
  const openCreateProvider = () => {
    setEditingProviderId(null);
    setProviderForm(emptyProviderForm);
    setProviderModalOpen(true);
  };

  const openEditProvider = (provider: AIProviderDTO) => {
    setEditingProviderId(provider.id);
    setProviderForm({
      name: provider.name,
      slug: provider.slug,
      baseUrl: provider.baseUrl,
      modelsUrl: provider.modelsUrl || '',
      description: provider.description || '',
      website: provider.website || '',
      modelFetchStrategy: provider.modelFetchStrategy,
      apiFormat: provider.apiFormat,
      sortOrder: provider.sortOrder,
    });
    setProviderModalOpen(true);
  };

  const handleSaveProvider = async () => {
    if (!providerForm.name || !providerForm.slug || !providerForm.baseUrl) {
      toast.error('请填写必填项');
      return;
    }
    try {
      setProviderSaving(true);
      if (editingProviderId) {
        await api.patch(`/ai-providers/${editingProviderId}`, {
          name: providerForm.name,
          baseUrl: providerForm.baseUrl,
          modelsUrl: providerForm.modelsUrl || undefined,
          description: providerForm.description || undefined,
          website: providerForm.website || undefined,
          modelFetchStrategy: providerForm.modelFetchStrategy,
          apiFormat: providerForm.apiFormat,
          sortOrder: providerForm.sortOrder,
        });
        toast.success('供应商已更新');
      } else {
        await api.post('/ai-providers', providerForm);
        toast.success('供应商已创建');
      }
      setProviderModalOpen(false);
      fetchProviders();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '操作失败');
    } finally {
      setProviderSaving(false);
    }
  };

  // ========== Model CRUD ==========
  const openAddModel = (provider: AIProviderDTO) => {
    setModelTargetProvider({ id: provider.id, name: provider.name });
    setModelForm(emptyModelForm);
    setModelModalOpen(true);
  };

  const handleSaveModel = async () => {
    if (!modelTargetProvider || !modelForm.modelId || !modelForm.name) {
      toast.error('请填写模型 ID 和名称');
      return;
    }
    try {
      setModelSaving(true);
      await api.post(`/ai-providers/${modelTargetProvider.id}/models/manual`, {
        modelId: modelForm.modelId,
        name: modelForm.name,
        description: modelForm.description || undefined,
        contextLength: modelForm.contextLength ? parseInt(modelForm.contextLength) : undefined,
        maxTokens: modelForm.maxTokens ? parseInt(modelForm.maxTokens) : undefined,
        isFree: modelForm.isFree,
      });
      toast.success('模型已添加');
      setModelModalOpen(false);
      fetchModels(modelTargetProvider.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '添加失败');
    } finally {
      setModelSaving(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!deletingModel) return;
    try {
      await api.delete(`/ai-providers/${deletingModel.providerId}/models/${deletingModel.modelId}`);
      toast.success('模型已删除');
      setDeletingModel(null);
      fetchModels(deletingModel.providerId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '删除失败');
    }
  };

  // ========== Render ==========
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-sm text-secondary">共 {providers.length} 个供应商</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-secondary rounded-xl text-sm hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {syncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            同步全部
          </button>
          <button
            onClick={openCreateProvider}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增供应商
          </button>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {providers.map((provider) => {
          const isExpanded = expandedProvider === provider.id;
          const providerModels = models[provider.id] || [];
          const strategyInfo = STRATEGY_LABELS[provider.modelFetchStrategy] || STRATEGY_LABELS.MANUAL;
          const canSync = provider.modelFetchStrategy !== 'MANUAL';

          return (
            <div
              key={provider.id}
              className={cn(
                'bg-surface rounded-2xl border shadow-sm overflow-hidden transition-colors',
                provider.isActive ? 'border-base' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-70'
              )}
            >
              {/* Provider Header */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{provider.name}</p>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            provider.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          )}
                        >
                          {provider.isActive ? '启用' : '禁用'}
                        </span>
                        {provider.isBuiltIn && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300">
                            内置
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-secondary font-mono">{provider.slug}</p>
                    </div>
                  </div>
                  {/* Edit / Toggle */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditProvider(provider)}
                      className="p-1.5 text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(provider)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        provider.isActive
                          ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                      title={provider.isActive ? '禁用' : '启用'}
                    >
                      {provider.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-secondary">格式:</span>
                    <span className="text-gray-900 dark:text-white">{FORMAT_LABELS[provider.apiFormat] || provider.apiFormat}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-secondary">策略:</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', strategyInfo.color)}>
                      {strategyInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Globe className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-secondary">Base:</span>
                    <span className="text-gray-900 dark:text-white font-mono truncate">{provider.baseUrl}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-base">
                  {canSync && (
                    <button
                      onClick={() => handleSync(provider.id)}
                      disabled={syncing === provider.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {syncing === provider.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      同步模型
                    </button>
                  )}
                  <button
                    onClick={() => openAddModel(provider)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增模型
                  </button>
                  <button
                    onClick={() => toggleExpand(provider.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-secondary hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? '收起模型' : `查看模型 (${providerModels.length || '...'})`}
                  </button>
                  {provider.website && (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-secondary hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ml-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      官网
                    </a>
                  )}
                </div>
              </div>

              {/* Models List (expanded) */}
              {isExpanded && (
                <div className="border-t border-base bg-gray-50/50 dark:bg-gray-800/20">
                  {modelsLoading === provider.id ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : providerModels.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-secondary">模型 ID</th>
                            <th className="text-left px-4 py-2 font-medium text-secondary">名称</th>
                            <th className="text-left px-4 py-2 font-medium text-secondary">上下文长度</th>
                            <th className="text-left px-4 py-2 font-medium text-secondary">免费</th>
                            <th className="text-right px-4 py-2 font-medium text-secondary">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {providerModels.map((model) => (
                            <tr
                              key={model.id}
                              className="border-b border-base/50 last:border-0 hover:bg-white dark:hover:bg-gray-800/40"
                            >
                              <td className="px-4 py-2 font-mono text-gray-900 dark:text-white">{model.modelId}</td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{model.name}</td>
                              <td className="px-4 py-2 text-secondary">
                                {model.contextLength ? `${(model.contextLength / 1000).toFixed(0)}K` : '-'}
                              </td>
                              <td className="px-4 py-2">
                                {model.isFree ? (
                                  <span className="text-green-600 dark:text-green-400 font-medium">✓</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  onClick={() => setDeletingModel({ providerId: provider.id, modelId: model.modelId, name: model.name })}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  title="删除模型"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-secondary text-xs">
                      {provider.modelFetchStrategy === 'MANUAL'
                        ? '暂无模型，请手动添加'
                        : '暂无模型数据，请同步获取'}
                    </div>
                  )}
                  <div className="px-4 py-2 text-xs text-secondary border-t border-base/50">
                    共 {providerModels.length} 个模型
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {providers.length === 0 && (
          <div className="text-center py-12 text-secondary">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无 AI 供应商</p>
            <button onClick={openCreateProvider} className="mt-3 text-primary text-sm hover:underline">
              新增第一个供应商
            </button>
          </div>
        )}
      </div>

      {/* ==================== Provider Modal ==================== */}
      <Modal
        isOpen={providerModalOpen}
        onClose={() => setProviderModalOpen(false)}
        title={editingProviderId ? '编辑供应商' : '新增供应商'}
        className="max-w-lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={providerForm.name}
                onChange={(e) => setProviderForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="如: OpenAI"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={providerForm.slug}
                onChange={(e) => setProviderForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="如: openai"
                disabled={!!editingProviderId}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Base URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={providerForm.baseUrl}
              onChange={(e) => setProviderForm((p) => ({ ...p, baseUrl: e.target.value }))}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="模型获取策略"
              value={providerForm.modelFetchStrategy}
              onChange={(value) => setProviderForm((p) => ({ ...p, modelFetchStrategy: value }))}
              options={[
                { label: '动态获取 (DYNAMIC)', value: 'DYNAMIC' },
                { label: '公开缓存 (PUBLIC)', value: 'PUBLIC' },
                { label: '手动维护 (MANUAL)', value: 'MANUAL' },
              ]}
            />
            <Select
              label="API 格式"
              value={providerForm.apiFormat}
              onChange={(value) => setProviderForm((p) => ({ ...p, apiFormat: value }))}
              options={[
                { label: 'OpenAI 兼容', value: 'OPENAI' },
                { label: 'Anthropic', value: 'ANTHROPIC' },
                { label: '自定义', value: 'CUSTOM' },
              ]}
            />
          </div>

          {/* Strategy hint */}
          <div className="px-3 py-2 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 text-secondary">
            <strong>策略说明：</strong>{STRATEGY_LABELS[providerForm.modelFetchStrategy]?.desc}
            {providerForm.modelFetchStrategy === 'DYNAMIC' && '（需要在下方填写 Models URL）'}
            {providerForm.modelFetchStrategy === 'PUBLIC' && '（需要在下方填写 Models URL 用于自动同步）'}
            {providerForm.modelFetchStrategy === 'MANUAL' && '（创建后需手动添加模型）'}
          </div>

          {/* Models URL - only for DYNAMIC / PUBLIC */}
          {providerForm.modelFetchStrategy !== 'MANUAL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Models URL
              </label>
              <input
                type="text"
                value={providerForm.modelsUrl}
                onChange={(e) => setProviderForm((p) => ({ ...p, modelsUrl: e.target.value }))}
                placeholder="https://api.openai.com/v1/models"
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                官网
              </label>
              <input
                type="text"
                value={providerForm.website}
                onChange={(e) => setProviderForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://openai.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                排序
              </label>
              <input
                type="number"
                value={providerForm.sortOrder}
                onChange={(e) => setProviderForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述</label>
            <textarea
              value={providerForm.description}
              onChange={(e) => setProviderForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="供应商描述..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setProviderModalOpen(false)}
              className="px-4 py-2 text-sm text-secondary hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveProvider}
              disabled={providerSaving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {providerSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingProviderId ? '保存' : '创建'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== Model Modal ==================== */}
      <Modal
        isOpen={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        title={`新增模型 — ${modelTargetProvider?.name || ''}`}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              模型 ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={modelForm.modelId}
              onChange={(e) => setModelForm((p) => ({ ...p, modelId: e.target.value }))}
              placeholder="如: gpt-4o, claude-3-opus-20240229"
              className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              显示名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={modelForm.name}
              onChange={(e) => setModelForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="如: GPT-4o"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">上下文长度</label>
              <input
                type="number"
                value={modelForm.contextLength}
                onChange={(e) => setModelForm((p) => ({ ...p, contextLength: e.target.value }))}
                placeholder="如: 128000"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">最大输出 Tokens</label>
              <input
                type="number"
                value={modelForm.maxTokens}
                onChange={(e) => setModelForm((p) => ({ ...p, maxTokens: e.target.value }))}
                placeholder="如: 4096"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述</label>
            <input
              type="text"
              value={modelForm.description}
              onChange={(e) => setModelForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="模型描述（选填）"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={modelForm.isFree}
              onChange={(e) => setModelForm((p) => ({ ...p, isFree: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">免费模型</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModelModalOpen(false)}
              className="px-4 py-2 text-sm text-secondary hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveModel}
              disabled={modelSaving}
              className="px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {modelSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              添加
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== Delete Model Confirmation ==================== */}
      <Modal
        isOpen={!!deletingModel}
        onClose={() => setDeletingModel(null)}
        title="确认删除模型"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            确定要删除模型 <strong className="text-gray-900 dark:text-white font-mono">{deletingModel?.name}</strong> 吗？
            此操作不可恢复。
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeletingModel(null)}
              className="px-4 py-2 text-sm text-secondary hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDeleteModel}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
