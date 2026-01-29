'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  RefreshCw, 
  ArrowRight
} from 'lucide-react';
import { useState, useRef, MouseEvent } from 'react';

export function AIRecommendations() {
  const { t } = useTranslation('dashboard');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh delay - replace with actual query invalidation if needed
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const recommendations = [
    {
      id: 1,
      name: 'Spotify Family',
      reason: 'Upgrade individual plan to Family to save 40%',
      price: 'CNY 158/mo',
      save: 'CNY 45/mo',
      saveAmount: 45,
      icon: '🎵'
    },
    {
      id: 2,
      name: 'Netflix Standard',
      reason: 'You rarely watch in 4K. Downgrade suggested.',
      price: 'CNY 88/mo',
      save: 'CNY 30/mo',
      saveAmount: 30,
      icon: '🎬'
    },
    {
      id: 3,
      name: 'Adobe Creative Cloud',
      reason: 'Student discount available with your .edu email',
      price: 'CNY 148/mo',
      save: 'CNY 200/mo',
      saveAmount: 200,
      icon: '🎨'
    }
  ];

  const totalMonthlySave = recommendations.reduce((acc, curr) => acc + curr.saveAmount, 0);
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
          </div>

        </div>
        <button
          onClick={handleRefresh}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group',
            'hover:bg-primary-pale dark:hover:bg-white/5 bg-transparent'
          )}
        >
          <RefreshCw className={cn(
            "w-4 h-4 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-primary",
            isRefreshing && "animate-spin"
          )} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors group-hover:text-primary">
            {t('ai.refresh')}
          </span>
        </button>
      </div>
        {/* Glow Effect */}
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover/container:opacity-100"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(165, 166, 246, 0.08), transparent 40%)`,
          }}
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendations.map((rec) => (
            <Card 
              key={rec.id} 
              className="bg-surface dark:bg-gray-800/80 relative overflow-hidden group/card stat-card p-0 border-0"
            >
              {/* Decorator Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover/card:scale-110" />

              <div className="relative z-10 space-y-4 p-5">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm flex items-center justify-center text-2xl z-10">
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
                  <p className="text-sm text-secondary dark:text-gray-400 mt-1 leading-relaxed">
                    {rec.reason}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col">
                    <span className="text-xs text-secondary dark:text-gray-400">{t('ai.estimated_cost')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{rec.price}</span>
                  </div>
                  <button 
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ease group',
                      'border border-gray-200 dark:border-gray-600 hover:border-[#A5A6F6]/30',
                      'bg-transparent hover:bg-primary-pale dark:hover:bg-white/5'
                    )}
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors group-hover:text-primary">
                      {t('ai.details')}
                    </span>
                    <ArrowRight className="w-3 h-3 ml-1 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-primary" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Optimization Suggestion Footer */}
        <div className="relative z-10 mt-8 flex items-start gap-4 rounded-xl ai-footer p-5">
          <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm text-primary shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 pt-0.5">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              AI Optimization Analysis
            </h4>
            <p className="text-sm text-secondary dark:text-gray-400 leading-relaxed">
              Through the above suggestions, you can save <span className="font-semibold text-[#7C3AED] dark:text-[#A5A6F6]">CNY {totalMonthlySave}/mo</span>, <span className="font-semibold text-[#7C3AED] dark:text-[#A5A6F6]">CNY {totalYearlySave}/yr</span>. 
              AI will continuously analyze your usage patterns to recommend the optimal plan.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
