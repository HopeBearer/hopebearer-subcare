'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  RefreshCw, 
  ArrowRight
} from 'lucide-react';

export function AIRecommendations() {
  const { t } = useTranslation('dashboard');

  const recommendations = [
    {
      id: 1,
      name: 'Spotify Family',
      reason: 'Upgrade individual plan to Family to save 40%',
      price: '¥ 158/mo',
      save: '¥ 45/mo',
      icon: '🎵'
    },
    {
      id: 2,
      name: 'Netflix Standard',
      reason: 'You rarely watch in 4K. Downgrade suggested.',
      price: '¥ 88/mo',
      save: '¥ 30/mo',
      icon: '🎬'
    },
    {
      id: 3,
      name: 'Adobe Creative Cloud',
      reason: 'Student discount available with your .edu email',
      price: '¥ 148/mo',
      save: '¥ 200/mo',
      icon: '🎨'
    }
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('ai.title')}
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-primary to-purple-400 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
            {t('ai.beta')}
          </span>
        </div>
        <Button variant="ghost" className="text-secondary hover:text-primary gap-2">
          <RefreshCw className="w-4 h-4" />
          {t('ai.refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map((rec) => (
          <Card 
            key={rec.id} 
            className="relative overflow-hidden group hover:border-primary/50 transition-all duration-300 hover:shadow-primary-sm"
          >
            {/* Decorator Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />

            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-2xl">
                  {rec.icon}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-primary bg-primary-soft px-2 py-1 rounded-lg">
                    {t('ai.save')} {rec.save}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  {rec.name}
                </h3>
                <p className="text-sm text-secondary mt-1 leading-relaxed">
                  {rec.reason}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <div className="flex flex-col">
                  <span className="text-xs text-secondary">{t('ai.estimated_cost')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{rec.price}</span>
                </div>
                <Button variant="outline" className="group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                  {t('ai.details')}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
