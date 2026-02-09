'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useState, useEffect, useMemo } from 'react';
import { agentService } from '@/services/modules/agent';
import { aiProviderService } from '@/services/modules/ai-provider';
import { AIProviderDTO, AIModelDTO } from '@subcare/types';
import { toast } from 'sonner';
import { Search, Zap, RefreshCw, Check, ExternalLink, Key, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';

export function ApiSettings() {
  const { t } = useTranslation('settings');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  // Data states
  const [providers, setProviders] = useState<AIProviderDTO[]>([]);
  const [models, setModels] = useState<AIModelDTO[]>([]);
  const [currentConfig, setCurrentConfig] = useState<{ provider: string; model?: string } | null>(null);
  
  // Form states
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  
  // Track if models have been loaded for DYNAMIC providers
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Load providers on mount
  useEffect(() => {
    loadProviders();
    checkCurrentConfig();
  }, []);

  // When provider changes, handle model loading based on strategy
  useEffect(() => {
    if (selectedProviderId) {
      const provider = providers.find(p => p.id === selectedProviderId);
      setModels([]);
      setSelectedModelId('');
      setModelsLoaded(false);
      
      // For PUBLIC and MANUAL strategies, load models from cache immediately
      if (provider && (provider.modelFetchStrategy === 'PUBLIC' || provider.modelFetchStrategy === 'MANUAL')) {
        loadModelsFromCache(selectedProviderId);
      }
    } else {
      setModels([]);
      setSelectedModelId('');
      setModelsLoaded(false);
    }
  }, [selectedProviderId, providers]);

  const loadProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const data = await aiProviderService.getProviders();
      setProviders(data);
    } catch (e) {
      console.error('Failed to load providers', e);
      toast.error(t('api.error_load_providers') || 'Failed to load providers');
    } finally {
      setIsLoadingProviders(false);
    }
  };

  // Load models from cache (for PUBLIC/MANUAL strategies)
  const loadModelsFromCache = async (providerId: string) => {
    setIsLoadingModels(true);
    setModelSearch('');
    try {
      const data = await aiProviderService.getModelsByProviderId(providerId, {
        isFree: showFreeOnly || undefined
      });
      setModels(data);
      setModelsLoaded(true);
      
      // Auto-select first model
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
      toast.error(t('api.apikey_required') || 'Please enter your API Key first');
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
        toast.success(t('api.models_fetched') || 'Models loaded successfully');
      } else {
        toast.info(t('api.no_models_found') || 'No models found');
      }
    } catch (e: any) {
      console.error('Failed to fetch models', e);
      setModels([]);
      setModelsLoaded(false);
      
      // Show specific error message
      const message = e?.response?.data?.message || e?.message || 'Failed to load models';
      toast.error(message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const checkCurrentConfig = async () => {
    try {
      const configs = await agentService.getConfig();
      const active = configs.find(c => c.isActive);
      if (active) {
        setCurrentConfig({ provider: active.provider, model: active.model });
      }
    } catch (e) {
      console.error('Failed to check AI config', e);
    }
  };

  // Filtered models based on search
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

  // Provider options for select
  const providerOptions = useMemo(() => {
    return providers.map(p => ({
      label: p.name,
      value: p.id
    }));
  }, [providers]);

  const handleSaveConfig = async () => {
    if (!selectedProvider || !apiKey) return;
    
    setIsLoading(true);
    try {
      await agentService.configure({
        provider: selectedProvider.slug,
        providerId: selectedProvider.id,
        apiKey,
        model: selectedModelId || undefined
      });
      toast.success(t('api.success_config') || 'Configuration saved successfully');
      setApiKey('');
      checkCurrentConfig();
      
      // 更新全局用户状态，标记已配置 AI 服务
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().updateUser({ ...currentUser, hasAIConfig: true });
      }
    } catch (e) {
      toast.error(t('api.error_config') || 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  // Format pricing for display
  // Pricing is stored as $ per million tokens (e.g., "2.8" = $2.8/1M tokens)
  const formatPricing = (model: AIModelDTO) => {
    if (model.isFree) return 'Free';
    if (!model.pricingPrompt && !model.pricingCompletion) return 'N/A';
    
    const prompt = parseFloat(model.pricingPrompt || '0');
    const completion = parseFloat(model.pricingCompletion || '0');
    
    if (prompt === 0 && completion === 0) return 'Free';
    
    // Format price with appropriate precision
    const formatPrice = (price: number) => {
      if (price >= 1) return price.toFixed(2);
      if (price >= 0.01) return price.toFixed(3);
      return price.toFixed(4);
    };
    
    // Display: input / output price per 1M tokens
    return `$${formatPrice(prompt)} / $${formatPrice(completion)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t('api.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('api.description')}
        </p>
      </div>

      {/* Current Config Status */}
      {currentConfig && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <Check className="w-4 h-4 text-primary" />
          <span className="text-sm">
            {t('api.current_config') || 'Current:'} <strong>{currentConfig.provider}</strong>
            {currentConfig.model && <span className="text-muted-foreground"> / {currentConfig.model}</span>}
          </span>
        </div>
      )}

      <Card>
        <div className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">{t('api.provider_settings')}</h3>
            <p className="text-sm text-muted-foreground">{t('api.provider_settings_desc')}</p>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('api.provider_label')}</label>
              <Select
                options={providerOptions}
                value={selectedProviderId}
                onChange={(val) => {
                  setSelectedProviderId(val);
                  setSelectedModelId('');
                  setModels([]);
                  setModelsLoaded(false);
                }}
                placeholder={isLoadingProviders ? 'Loading...' : (t('api.select_provider') || 'Select a provider')}
                disabled={isLoadingProviders}
              />
              {selectedProvider?.website && (
                <a
                  href={selectedProvider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t('api.visit_website') || 'Get API Key'} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            
            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('api.apikey_label')}</label>
              <div className="flex gap-2">
                <Input 
                  type="password" 
                  placeholder={t('api.apikey_placeholder') || 'Enter your API key'} 
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
                        {t('api.load_models') || 'Load Models'}
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {requiresApiKeyForModels && !modelsLoaded
                  ? (t('api.apikey_required_for_models') || 'Enter your API Key and click "Load Models" to see available models.')
                  : (t('api.apikey_note') || 'Your API key is stored securely.')
                }
              </p>
            </div>

            {/* Model Selection */}
            {selectedProviderId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('api.model_label') || 'Model'}</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showFreeOnly}
                        onChange={(e) => setShowFreeOnly(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Zap className="w-3 h-3 text-yellow-500" />
                      {t('api.free_only') || 'Free only'}
                    </label>
                    {/* Refresh button - only show after models are loaded */}
                    {modelsLoaded && (
                      <button
                        onClick={() => {
                          if (requiresApiKeyForModels) {
                            fetchModelsWithApiKey();
                          } else {
                            loadModelsFromCache(selectedProviderId);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        disabled={isLoadingModels}
                      >
                        <RefreshCw className={cn('w-4 h-4', isLoadingModels && 'animate-spin')} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Show prompt for DYNAMIC strategy before models are loaded */}
                {requiresApiKeyForModels && !modelsLoaded && !isLoadingModels && (
                  <div className="p-6 text-center rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <Key className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {t('api.model_manual_hint') || 'Enter your API Key above and click "Load Models" to view available models.'}
                    </p>
                  </div>
                )}

                {/* Model Search - Only show when models are loaded */}
                {modelsLoaded && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('api.search_models') || 'Search models...'}
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Model List */}
                    <div className="max-h-[320px] overflow-y-auto rounded-xl bg-gray-50/50 dark:bg-gray-900/30 p-2">
                      {isLoadingModels ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-white dark:bg-gray-800 rounded-xl animate-pulse border border-gray-200 dark:border-gray-700" />
                          ))}
                        </div>
                      ) : filteredModels.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                          {models.length === 0 
                            ? (t('api.no_models') || 'No models available')
                            : (t('api.no_models_match') || 'No models match your search')
                          }
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredModels.slice(0, 50).map(model => (
                            <button
                              key={model.id || model.modelId}
                              onClick={() => setSelectedModelId(model.modelId)}
                              className={cn(
                                'w-full p-3 text-left transition-all duration-200 rounded-xl',
                                'bg-white dark:bg-gray-800',
                                'border-2',
                                'hover:shadow-md hover:scale-[1.01]',
                                selectedModelId === model.modelId 
                                  ? 'border-primary shadow-md shadow-primary/10 bg-primary/5 dark:bg-primary/10' 
                                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "font-semibold text-sm truncate",
                                      selectedModelId === model.modelId && "text-primary"
                                    )}>
                                      {model.name}
                                    </span>
                                    {model.isFree && (
                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shrink-0 shadow-sm">
                                        FREE
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {model.contextLength && (
                                      <span className="text-[11px] text-muted-foreground px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                        {(model.contextLength / 1000).toFixed(0)}K
                                      </span>
                                    )}
                                    <span className="text-[11px] text-muted-foreground">
                                      {formatPricing(model)}
                                    </span>
                                  </div>
                                </div>
                                <div className={cn(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                  selectedModelId === model.modelId 
                                    ? "border-primary bg-primary text-white" 
                                    : "border-gray-300 dark:border-gray-600"
                                )}>
                                  {selectedModelId === model.modelId && (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                          {filteredModels.length > 50 && (
                            <div className="p-3 text-center text-xs text-muted-foreground bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                              {t('api.more_models', { count: filteredModels.length - 50 }) || `+${filteredModels.length - 50} more models, use search to filter`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveConfig} 
                disabled={isLoading || !apiKey || !selectedProviderId}
              >
                {isLoading ? t('api.saving') : t('api.save_btn')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
