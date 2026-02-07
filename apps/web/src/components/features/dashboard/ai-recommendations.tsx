'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { 
  Sparkles, 
  RefreshCw, 
  ArrowRight,
  ExternalLink,
  Zap,
  Search,
  Check,
  Loader2,
  Key
} from 'lucide-react';
import { useState, useRef, MouseEvent, useEffect, useMemo } from 'react';
import { agentService } from '@/services/modules/agent';
import { aiProviderService } from '@/services/modules/ai-provider';
import { AgentConfigDTO, RecommendationResponse, LocalizedString, AIProviderDTO, AIModelDTO } from '@subcare/types';
import { TruncatedTooltip } from '@/components/ui/truncated-tooltip';
import { AutoScrollText } from '@/components/ui/auto-scroll-text';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';
import { useAIRecommendations } from '@/hooks/use-ai-recommendations';

export function AIRecommendations() {
  const { t, i18n } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // WebSocket-based AI recommendations
  const { 
    isConnected: wsConnected,
    isLoading: wsLoading, 
    progress, 
    data: wsData, 
    error: wsError,
    fetchRecommendations: wsFetch 
  } = useAIRecommendations();
  
  // Local state for persisting data across wsData resets
  const [localData, setLocalData] = useState<RecommendationResponse | null>(null);
  // Queue state: when WS not yet connected on mount, queue fetch for when it connects
  const [pendingFetch, setPendingFetch] = useState<{ model: string; forceRefresh: boolean } | null>(null);
  
  // All loading and data go through WebSocket
  const isLoading = wsLoading;
  const data = wsData || localData;
  
  const [config, setConfig] = useState<AgentConfigDTO | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Sync wsData to localData when received
  useEffect(() => {
    if (wsData) {
      setLocalData(wsData);
    }
  }, [wsData]);
  
  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      toast.error(wsError.message || 'AI 推荐获取失败');
    }
  }, [wsError]);

  // When WS connects and there's a pending fetch, execute it
  useEffect(() => {
    if (!pendingFetch || !wsConnected || wsLoading) return;
    wsFetch(pendingFetch);
    setPendingFetch(null);
  }, [pendingFetch, wsConnected, wsLoading, wsFetch]);
  
  // Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Provider and Model selection
  const [providers, setProviders] = useState<AIProviderDTO[]>([]);
  const [models, setModels] = useState<AIModelDTO[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Helper to get text based on current language
  const getLocalizedText = (textObj: LocalizedString) => {
    const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
    return textObj?.[lang] || textObj?.['en'] || '';
  };

  const formatCurrency = (amount: number) => {
    const currency = user?.currency || 'CNY';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        currencyDisplay: 'code',
      }).format(amount);
    } catch (e) {
      return `${currency} ${amount}`;
    }
  };

  const checkConfig = async () => {
    try {
      const configs = await agentService.getConfig();
      const active = configs.find(c => c.isActive);
      setConfig(active || null);
      if (active) {
        const model = active.model || '';
        if (active.model) setSelectedModel(model);
        // Always use WebSocket (handles cache check + fresh generation)
        fetchRecommendations(false, model);
      }
    } catch (e) {
      console.error('Failed to check AI config', e);
    }
  };

  // Unified fetch: always through WebSocket
  const fetchRecommendations = (forceRefresh: boolean = false, modelOverride?: string) => {
    const model = modelOverride || selectedModel;
    if (wsConnected) {
      wsFetch({ model, forceRefresh });
    } else {
      // WS not connected yet, queue for when it connects
      setPendingFetch({ model, forceRefresh });
    }
  };

  // Load providers for modal
  const loadProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const data = await aiProviderService.getProviders();
      setProviders(data);
    } catch (e) {
      console.error('Failed to load providers', e);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  // Load models from cache (for PUBLIC/MANUAL strategies)
  const loadModelsFromCache = async (providerId: string) => {
    setIsLoadingModels(true);
    setModelSearch('');
    try {
      const data = await aiProviderService.getModelsByProviderId(providerId);
      setModels(data);
      setModelsLoaded(true);
      if (data.length > 0) {
        setSelectedModelId(data[0].modelId);
      }
    } catch (e) {
      console.error('Failed to load models from cache', e);
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Fetch models using API Key (for DYNAMIC strategy)
  const fetchModelsWithApiKey = async () => {
    if (!selectedProviderId || !apiKey) {
      toast.error(t('ai.apikey_required') || 'Please enter your API Key first');
      return;
    }
    setIsLoadingModels(true);
    setModelSearch('');
    try {
      const result = await aiProviderService.fetchModelsWithApiKey(selectedProviderId, apiKey);
      setModels(result.models);
      setModelsLoaded(true);
      if (result.models.length > 0) {
        setSelectedModelId(result.models[0].modelId);
      }
    } catch (e: any) {
      console.error('Failed to fetch models', e);
      setModels([]);
      setModelsLoaded(false);
      const message = e?.response?.data?.message || e?.message || 'Failed to load models';
      toast.error(message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Load providers when modal opens
  useEffect(() => {
    if (showConfigModal && providers.length === 0) {
      loadProviders();
    }
  }, [showConfigModal]);

  // When provider changes, handle model loading based on strategy
  useEffect(() => {
    if (selectedProviderId) {
      const provider = providers.find(p => p.id === selectedProviderId);
      setModels([]);
      setSelectedModelId('');
      setModelsLoaded(false);
      // For PUBLIC/MANUAL strategies, load models from cache immediately
      if (provider && (provider.modelFetchStrategy === 'PUBLIC' || provider.modelFetchStrategy === 'MANUAL')) {
        loadModelsFromCache(selectedProviderId);
      }
    } else {
      setModels([]);
      setSelectedModelId('');
      setModelsLoaded(false);
    }
  }, [selectedProviderId, providers]);

  const handleSaveConfig = async () => {
    if (!selectedProvider || !apiKey) return;

    setIsSaving(true);
    try {
      await agentService.configure({
        provider: selectedProvider.slug,
        providerId: selectedProvider.id,
        apiKey,
        model: selectedModelId || undefined
      });
      toast.success(t('ai.success_config'));
      setShowConfigModal(false);
      setApiKey('');
      checkConfig();
    } catch (e) {
      toast.error(t('ai.error_config'));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    checkConfig();
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const openLink = (url?: string) => {
    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Provider options for select
  const providerOptions = useMemo(() => {
    return providers.map(p => ({
      label: p.name,
      value: p.id
    }));
  }, [providers]);

  // Filtered models based on search and free filter
  const filteredModels = useMemo(() => {
    let result = models;
    
    if (showFreeOnly) {
      result = result.filter(m => m.isFree);
    }
    
    if (modelSearch) {
      const search = modelSearch.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(search) || 
        m.modelId.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [models, modelSearch, showFreeOnly]);

  // Get selected provider
  const selectedProvider = useMemo(() => {
    return providers.find(p => p.id === selectedProviderId);
  }, [providers, selectedProviderId]);

  // Check if provider requires API key to fetch models
  const requiresApiKeyForModels = useMemo(() => {
    return selectedProvider?.modelFetchStrategy === 'DYNAMIC';
  }, [selectedProvider]);

  // Format pricing for display
  const formatPricing = (model: AIModelDTO) => {
    if (model.isFree) return 'Free';
    if (!model.pricingPrompt && !model.pricingCompletion) return 'N/A';
    const prompt = parseFloat(model.pricingPrompt || '0');
    const completion = parseFloat(model.pricingCompletion || '0');
    if (prompt === 0 && completion === 0) return 'Free';
    const formatPrice = (price: number) => {
      if (price >= 1) return price.toFixed(2);
      if (price >= 0.01) return price.toFixed(3);
      return price.toFixed(4);
    };
    return `$${formatPrice(prompt)} / $${formatPrice(completion)}`;
  };

  // If not configured, show simple setup card
  if (!config && !isLoading && !data) {
     return (
      <section className="space-y-6 mt-8">
        <style>{`
        .ai-container {
          background: linear-gradient(135deg, rgba(165, 166, 246, 0.12) 0%, rgba(165, 166, 246, 0.02) 60%, rgba(255, 255, 255, 0) 100%);
          border: 1px solid rgba(165, 166, 246, 0.2);
          box-shadow: 0 0 0 1px rgba(165, 166, 246, 0.05), 0 20px 50px -12px rgba(165, 166, 246, 0.15);
          backdrop-filter: blur(8px);
        }
        .dark .ai-container {
           background: linear-gradient(135deg, rgba(165, 166, 246, 0.15) 0%, rgba(165, 166, 246, 0.05) 60%, rgba(0, 0, 0, 0) 100%);
           box-shadow: 0 0 0 1px rgba(165, 166, 246, 0.1), 0 20px 50px -12px rgba(0, 0, 0, 0.4);
        }
      `}</style>
        <div className="rounded-3xl ai-container p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold">{t('ai.enable_title')}</h3>
          <p className="text-muted-foreground max-w-md">{t('ai.enable_desc')}</p>
          <Button onClick={() => setShowConfigModal(true)} className="mt-4 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
            {t('ai.connect_btn')}
          </Button>
        </div>

        {/* Config Modal */}
        <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title={t('ai.config_title')} className="max-w-md">
          <div className="space-y-4 py-4">
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('ai.provider_label')}</label>
              <Select
                options={providerOptions}
                value={selectedProviderId}
                onChange={(val) => {
                  setSelectedProviderId(val);
                  setSelectedModelId('');
                  setModels([]);
                  setModelsLoaded(false);
                }}
                placeholder={isLoadingProviders ? 'Loading...' : (t('ai.select_provider') || 'Select a provider')}
                disabled={isLoadingProviders}
              />
              {selectedProvider?.website && (
                <a 
                  href={selectedProvider.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t('ai.get_key') || 'Get API Key'} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('ai.apikey_label')}</label>
              <div className="flex gap-2">
                <Input 
                  type="password" 
                  placeholder={t('ai.apikey_placeholder')} 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)} 
                  className="flex-1"
                />
                {/* Load Models Button - Only show for DYNAMIC strategy */}
                {requiresApiKeyForModels && selectedProviderId && (
                  <Button
                    variant="outline"
                    onClick={fetchModelsWithApiKey}
                    disabled={!apiKey || isLoadingModels}
                    className="shrink-0"
                  >
                    {isLoadingModels ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        {t('ai.load_models') || 'Load Models'}
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {requiresApiKeyForModels && !modelsLoaded
                  ? (t('ai.apikey_required_for_models') || 'Enter your API Key and click "Load Models" to see available models.')
                  : (t('ai.apikey_note'))
                }
              </p>
            </div>

            {/* Model Selection */}
            {selectedProviderId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('ai.model_label') || 'Model'}</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showFreeOnly}
                        onChange={(e) => setShowFreeOnly(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Zap className="w-3 h-3 text-yellow-500" />
                      {t('ai.free_only') || 'Free only'}
                    </label>
                    {modelsLoaded && (
                      <button
                        onClick={() => {
                          if (requiresApiKeyForModels) {
                            fetchModelsWithApiKey();
                          } else {
                            loadModelsFromCache(selectedProviderId);
                          }
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        disabled={isLoadingModels}
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', isLoadingModels && 'animate-spin')} />
                      </button>
                    )}
                  </div>
                </div>

                {/* DYNAMIC strategy: show hint before models are loaded */}
                {requiresApiKeyForModels && !modelsLoaded && !isLoadingModels && (
                  <div className="p-4 text-center rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <Key className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {t('ai.model_manual_hint') || 'Enter your API Key above and click "Load Models" to view available models.'}
                    </p>
                  </div>
                )}

                {/* Model Search & List - Only show when models are loaded */}
                {modelsLoaded && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('ai.search_models') || 'Search models...'}
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>

                    <div className="max-h-[200px] overflow-y-auto rounded-xl bg-gray-50/50 dark:bg-gray-900/30 p-1.5">
                      {isLoadingModels ? (
                        <div className="space-y-1.5">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-14 bg-white dark:bg-gray-800 rounded-lg animate-pulse border border-gray-200 dark:border-gray-700" />
                          ))}
                        </div>
                      ) : filteredModels.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          {models.length === 0 
                            ? (t('ai.no_models') || 'No models available')
                            : (t('ai.no_models_match') || 'No models match')
                          }
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {filteredModels.slice(0, 30).map(model => (
                            <button
                              key={model.id || model.modelId}
                              onClick={() => setSelectedModelId(model.modelId)}
                              className={cn(
                                'w-full p-2.5 text-left transition-all duration-200 rounded-lg',
                                'bg-white dark:bg-gray-800',
                                'border-2',
                                'hover:shadow-sm hover:scale-[1.01]',
                                selectedModelId === model.modelId 
                                  ? 'border-primary shadow-sm shadow-primary/10 bg-primary/5 dark:bg-primary/10' 
                                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "text-sm font-medium truncate",
                                      selectedModelId === model.modelId && "text-primary"
                                    )}>
                                      {model.name}
                                    </span>
                                    {model.isFree && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shrink-0">
                                        FREE
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {model.contextLength && (
                                      <span className="text-[10px] text-muted-foreground px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                        {(model.contextLength / 1000).toFixed(0)}K
                                      </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatPricing(model)}
                                    </span>
                                  </div>
                                </div>
                                <div className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                  selectedModelId === model.modelId 
                                    ? "border-primary bg-primary text-white" 
                                    : "border-gray-300 dark:border-gray-600"
                                )}>
                                  {selectedModelId === model.modelId && (
                                    <Check className="w-3 h-3" />
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                          {filteredModels.length > 30 && (
                            <div className="p-2 text-center text-xs text-muted-foreground bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                              +{filteredModels.length - 30} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowConfigModal(false)}>
                {t('ai.cancel_btn')}
              </Button>
              <Button 
                onClick={handleSaveConfig} 
                disabled={!apiKey || !selectedProviderId || isSaving}
              >
                {isSaving ? 'Saving...' : t('ai.save_connect_btn')}
              </Button>
            </div>
          </div>
        </Modal>
      </section>
     );
  }

  // Calculate total savings from insights
  const totalMonthlySave = data?.insights?.reduce((acc, curr) => acc + (curr.potentialSavings || 0), 0) || 0;
  const totalYearlySave = totalMonthlySave * 12;

  return (
    <section className="space-y-6 mt-8">
      <style>{`
        .stat-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(165, 166, 246, 0.15);
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(165, 166, 246, 0.15);
          border-color: var(--color-primary);
        }
        .stat-card:active {
          transform: scale(0.98) translateY(-5px);
        }
        
        .ai-container {
          background: linear-gradient(135deg, rgba(165, 166, 246, 0.12) 0%, rgba(165, 166, 246, 0.02) 60%, rgba(255, 255, 255, 0) 100%);
          border: 1px solid rgba(165, 166, 246, 0.2);
          box-shadow: 
            0 0 0 1px rgba(165, 166, 246, 0.05),
            0 20px 50px -12px rgba(165, 166, 246, 0.15);
          backdrop-filter: blur(8px);
        }
        .dark .ai-container {
           background: linear-gradient(135deg, rgba(165, 166, 246, 0.15) 0%, rgba(165, 166, 246, 0.05) 60%, rgba(0, 0, 0, 0) 100%);
           box-shadow: 
            0 0 0 1px rgba(165, 166, 246, 0.1),
            0 20px 50px -12px rgba(0, 0, 0, 0.4);
        }
        
        .ai-footer {
           background: linear-gradient(90deg, rgba(165, 166, 246, 0.12) 0%, rgba(165, 166, 246, 0.03) 50%, transparent 100%);
           border-left: 3px solid #A5A6F6;
        }
        .dark .ai-footer {
           background: linear-gradient(90deg, rgba(165, 166, 246, 0.2) 0%, rgba(165, 166, 246, 0.05) 50%, transparent 100%);
        }
      `}</style>

      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="group/container relative overflow-hidden rounded-3xl ai-container p-6 md:p-8"
      >
        
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('ai.title')}
            </h2>
            {config && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {config.provider}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button
            onClick={() => fetchRecommendations(true)}
            disabled={isLoading}
            className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group',
                'hover:bg-primary-pale dark:hover:bg-white/5 bg-transparent'
            )}
            >
            <RefreshCw className={cn(
                "w-4 h-4 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-primary",
                isLoading && "animate-spin"
            )} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors group-hover:text-primary">
                {isLoading ? t('ai.analyzing') : t('ai.refresh')}
            </span>
            </button>
        </div>
      </div>
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover/container:opacity-100"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(165, 166, 246, 0.08), transparent 40%)`,
          }}
        />

        {/* Loading State with Progress */}
        {isLoading && !data && (
          <div className="mt-6 space-y-4">
            {/* Progress indicator for WebSocket */}
            {progress && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {t(progress.messageKey, { 
                    tool: progress.toolName ? t(`ai.tools.${progress.toolName}`, { defaultValue: progress.toolName }) : undefined,
                    defaultValue: progress.messageKey 
                  })}
                </span>
              </div>
            )}
            {/* Skeleton cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 rounded-xl bg-gray-200 dark:bg-gray-800/50" />
              ))}
            </div>
          </div>
        )}
        
        {/* Progress overlay when refreshing with existing data */}
        {isLoading && data && progress && (
          <div className="mt-4 flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-primary/5 border border-primary/20">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-primary font-medium">
              {t(progress.messageKey, { 
                tool: progress.toolName ? t(`ai.tools.${progress.toolName}`, { defaultValue: progress.toolName }) : undefined,
                defaultValue: progress.messageKey 
              })}
            </span>
          </div>
        )}

        {!isLoading && data && (
            <>
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* 1. Map Recommendations */}
                {data.recommendations.map((rec, idx) => (
                    <Card 
                    key={`rec-${idx}`} 
                    className="bg-surface dark:bg-gray-800/80 relative overflow-hidden group/card stat-card p-0 border-0"
                    >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover/card:scale-110" />

                    <div className="relative z-10 space-y-4 p-5">
                        <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm flex items-center justify-center text-2xl z-10">
                            {(rec as any).icon || '💡'} 
                        </div>
                        <div className="flex flex-col items-end">
                            {(rec as any).save && (
                                <span className="text-xs font-bold text-primary bg-primary-soft px-2 py-1 rounded-lg">
                                {getLocalizedText((rec as any).save)}
                                </span>
                            )}
                        </div>
                        </div>

                        <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                            {rec.name}
                        </h3>
                        <TruncatedTooltip 
                            text={getLocalizedText(rec.reason)} 
                            className="text-sm text-secondary dark:text-gray-400 mt-1 leading-relaxed" 
                            lineClamp={2} 
                        />
                        </div>

                        <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col mr-2 overflow-hidden flex-1 min-w-0">
                            <span className="text-xs text-secondary dark:text-gray-400 whitespace-nowrap">{t('ai.estimated_cost')}</span>
                            <AutoScrollText 
                                text={getLocalizedText(rec.price)}
                                className="font-semibold text-gray-900 dark:text-white w-full"
                            />
                        </div>
                        <button  
                            onClick={() => openLink(rec.link)}
                            className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group shrink-0',
                            'border border-gray-200 dark:border-gray-600 hover:border-[#A5A6F6]/30',
                            'bg-transparent hover:bg-primary-pale dark:hover:bg-white/5',
                            !rec.link && 'opacity-50 cursor-not-allowed'
                            )}
                            disabled={!rec.link}
                        >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors group-hover:text-primary whitespace-nowrap">
                            {t('ai.details')}
                            </span>
                            {rec.link ? <ExternalLink className="w-3 h-3 ml-1 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-primary" /> : <ArrowRight className="w-3 h-3 ml-1" />}
                        </button>
                        </div>
                    </div>
                    </Card>
                ))}

                {/* 2. Map Insights as Cards if there are fewer recommendations */}
                {data.insights.map((insight, idx) => (
                     <Card 
                     key={`insight-${idx}`} 
                     className="bg-surface dark:bg-gray-800/80 relative overflow-hidden group/card stat-card p-0 border-0"
                     >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover/card:scale-110" />
                      <div className="relative z-10 space-y-4 p-5">
                         <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm flex items-center justify-center text-2xl z-10">
                                {insight.type === 'warning' ? '⚠️' : (insight.type === 'praise' ? '🏆' : '📈')}
                            </div>
                         </div>
                         <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                                {getLocalizedText(insight.title)}
                            </h3>
                            <TruncatedTooltip 
                                text={getLocalizedText(insight.description)} 
                                className="text-sm text-secondary dark:text-gray-400 mt-1 leading-relaxed" 
                                lineClamp={3} 
                            />
                        </div>
                      </div>
                     </Card>
                ))}
                </div>

                <div className="relative z-10 mt-8 flex items-start gap-4 rounded-xl ai-footer p-5">
                <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm text-primary shrink-0">
                    <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 pt-0.5">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {t('ai.optimization_analysis')}
                    </h4>
                    <p className="text-sm text-secondary dark:text-gray-400 leading-relaxed">
                    {getLocalizedText(data.summary)}
                    {totalMonthlySave > 0 && (
                        <span className="block mt-1">
                            {t('ai.estimated_savings')} <span className="font-semibold text-[#7C3AED] dark:text-[#A5A6F6]">{formatCurrency(totalMonthlySave)} {t('ai.per_month')}</span> ({t('ai.approx')} {formatCurrency(totalYearlySave)} {t('ai.per_year')}).
                        </span>
                    )}
                    </p>
                </div>
                </div>
            </>
        )}
      </div>
    </section>
  );
}
