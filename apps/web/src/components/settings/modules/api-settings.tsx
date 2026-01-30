'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { agentService } from '@/services/modules/agent';
import { toast } from 'sonner';

export function ApiSettings() {
  const { t } = useTranslation('settings');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('openai');

  const checkConfig = async () => {
    try {
      const configs = await agentService.getConfig();
      const active = configs.find(c => c.isActive);
      if (active) {
        setProvider(active.provider);
      }
    } catch (e) {
      console.error('Failed to check AI config', e);
    }
  };

  useEffect(() => {
    checkConfig();
  }, []);

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      await agentService.configure({
        provider: provider as any,
        apiKey,
        model: provider === 'openai' ? 'gpt-4o' : 'deepseek-chat'
      });
      toast.success(t('api.success_config'));
      setApiKey(''); 
      checkConfig();
    } catch (e) {
      toast.error(t('api.error_config'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t('api.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('api.description')}
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="space-y-1">
             <h3 className="text-lg font-medium">{t('api.provider_settings')}</h3>
             <p className="text-sm text-muted-foreground">{t('api.provider_settings_desc')}</p>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="space-y-2">
                <label className="text-sm font-medium">{t('api.provider_label')}</label>
                <Select 
                options={[
                    { label: 'OpenAI (GPT-4o)', value: 'openai' }, 
                    { label: 'DeepSeek (V3)', value: 'deepseek' }
                ]} 
                value={provider} 
                onChange={(val) => setProvider(val)} 
                />
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium">{t('api.apikey_label')}</label>
                <Input 
                type="password" 
                placeholder={t('api.apikey_placeholder')} 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                />
                <p className="text-xs text-muted-foreground">{t('api.apikey_note')}</p>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSaveConfig} disabled={isLoading || !apiKey}>
                {isLoading ? t('api.saving') : t('api.save_btn')}
                </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
