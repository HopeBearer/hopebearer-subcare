'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useThemeStore } from '@/store';
import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { SankeyData } from '@subcare/types';

interface SpendingSankeyProps {
  data: SankeyData | undefined;
  isLoading?: boolean;
}

export const SpendingSankey = ({ data, isLoading }: SpendingSankeyProps) => {
  const { theme } = useThemeStore();
  const { t } = useTranslation('finance');
  const isDark = theme === 'dark';

  const option = useMemo(() => {
    if (!data) return {};

    const textColor = isDark ? '#9CA3AF' : '#374151';

    return {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        textStyle: { color: isDark ? '#F9FAFB' : '#374151' },
        borderColor: isDark ? '#374151' : '#E5E7EB',
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency'
          },
          data: data.nodes,
          links: data.links,
          top: '10%',
          bottom: '10%',
          left: '2%',
          right: '15%', // Make room for labels
          nodeWidth: 20,
          orient: 'horizontal',
          label: {
            position: 'right',
            color: textColor,
            fontSize: 12,
            formatter: '{b}'
          },
          lineStyle: {
            color: 'source',
            curveness: 0.5,
            opacity: 0.3
          },
          itemStyle: {
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#fff'
          }
        }
      ]
    };
  }, [data, isDark]);

  if (isLoading) {
    return (
      <Card className="h-full p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </Card>
    );
  }

  return (
    <Card className="h-full p-6 flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-base-content">
            {t('sankey.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
            {t('sankey.subtitle')}
        </p>
      </div>
      
      <div className="flex-1 min-h-0 w-full">
         {data ? (
             <ReactECharts 
                option={option} 
                style={{ height: '100%', width: '100%', minHeight: '300px' }}
                opts={{ renderer: 'svg' }}
                notMerge={true} 
            />
         ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t('sankey.no_data')}
            </div>
         )}
      </div>
    </Card>
  );
};
