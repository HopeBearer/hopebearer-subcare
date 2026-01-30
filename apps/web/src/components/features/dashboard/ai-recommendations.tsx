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
  Settings,
  BrainCircuit,
  AlertTriangle,
  Lightbulb,
  ThumbsUp,
  ExternalLink
} from 'lucide-react';
import { useState, useRef, MouseEvent, useEffect } from 'react';
import { agentService } from '@/services/modules/agent';
import { AgentConfigDTO, RecommendationResponse, LocalizedString } from '@subcare/types';
import { TruncatedTooltip } from '@/components/ui/truncated-tooltip';
import { AutoScrollText } from '@/components/ui/auto-scroll-text';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';

export function AIRecommendations() {
  const { t, i18n } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [config, setConfig] = useState<AgentConfigDTO | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('openai');

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
        currencyDisplay: 'code', // Ensure it shows "CNY 100" not "¥100"
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
        if (active.model) setSelectedModel(active.model);

        // Load models for this active config
        try {
            const models = await agentService.getModels();
            setAvailableModels(models);
        } catch (e) {
            console.warn('Failed to fetch models for dashboard', e);
        }

        // Initial load: no force refresh, use cache if available
        fetchRecommendations(false, active.model);
      }
    } catch (e) {
      console.error('Failed to check AI config', e);
    }
  };

  const fetchRecommendations = async (force: boolean = false, modelOverride?: string) => {
    setIsLoading(true);
    try {
      const result = await agentService.getRecommendations(undefined, force, modelOverride || selectedModel);
      setData(result);
      if (force) {
        toast.success(t('common.updated', { defaultValue: 'Updated' }));
      }
    } catch (e: any) {
      console.error('Failed to fetch recommendations', e);
      if (e?.response?.status === 400) {
        setConfig(null); // Force re-config if invalid
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await agentService.configure({
        provider: provider as any,
        apiKey,
        model: provider === 'openai' ? 'gpt-4o' : 'deepseek-chat'
      });
      toast.success(t('ai.success_config'));
      setShowConfigModal(false);
      checkConfig();
    } catch (e) {
      toast.error(t('ai.error_config'));
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

        <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title={t('ai.config_title')}>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
              <label className="text-sm font-medium">{t('ai.provider_label')}</label>
              <Select options={[{ label: 'OpenAI (GPT-4o)', value: 'openai' }, { label: 'DeepSeek (V3)', value: 'deepseek' }]} value={provider} onChange={(val) => setProvider(val)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('ai.apikey_label')}</label>
              <Input type="password" placeholder={t('ai.apikey_placeholder')} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t('ai.apikey_note')}</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowConfigModal(false)}>{t('ai.cancel_btn')}</Button>
              <Button onClick={handleSaveConfig} disabled={!apiKey}>{t('ai.save_connect_btn')}</Button>
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
            {config && availableModels.length > 0 && (
                <div className="w-[160px]">
                    <Select 
                        options={availableModels.map(m => ({ label: m, value: m }))}
                        value={selectedModel}
                        onChange={(val) => setSelectedModel(val)}
                        className="h-10 text-xs py-1"
                        placeholder={t('ai.model_label') || 'Model'}
                    />
                </div>
            )}
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

        {/* Skeleton Loading */}
        {isLoading && !data && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse mt-6">
              {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 rounded-xl bg-gray-200 dark:bg-gray-800/50" />
              ))}
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
