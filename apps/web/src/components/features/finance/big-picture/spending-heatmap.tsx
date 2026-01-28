'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useThemeStore } from '@/store/theme.store';
import { useTranslation } from '@/lib/i18n/hooks';
import { HeatmapItem } from '@subcare/types';
import { Card } from '@/components/ui/card';

interface SpendingHeatmapProps {
  data: HeatmapItem[];
  isLoading?: boolean;
  className?: string;
}

export const SpendingHeatmap = ({ data, isLoading, className }: SpendingHeatmapProps) => {
  const { theme } = useThemeStore();
  const { t } = useTranslation('finance');
  const isDark = theme === 'dark';

  const option = useMemo(() => {
    const year = new Date().getFullYear();
    const chartData = data.map(item => [item.date, item.count]);

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          return `${params.value[0]}: ${params.value[1]} ${t('heatmap.tooltip_suffix', { defaultValue: 'transactions' })}`;
        },
        backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        textStyle: { color: isDark ? '#F9FAFB' : '#374151' },
        borderColor: isDark ? '#374151' : '#E5E7EB',
      },
      visualMap: {
        min: 0,
        max: 5,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: {
          color: isDark 
            ? ['#1f2937', '#3730a3', '#4f46e5', '#818cf8'] 
            : ['#ebedf0', '#9be9a8', '#40c463', '#30a14e'],
        },
        textStyle: { color: isDark ? '#9CA3AF' : '#6B7280' }
      },
      calendar: {
        top: 30,
        left: 30,
        right: 30,
        bottom: 50,
        cellSize: ['auto', 20], // Increased cell size slightly
        range: year,
        itemStyle: {
          borderWidth: 2,
          borderColor: isDark ? '#111827' : '#fff'
        },
        yearLabel: { show: false },
        dayLabel: {
          firstDay: 1,
          nameMap: 'en',
          color: isDark ? '#9CA3AF' : '#6B7280'
        },
        monthLabel: {
          color: isDark ? '#9CA3AF' : '#6B7280'
        },
        splitLine: { show: false }
      },
      grid: {
        bottom: 0,
        top: 0,
        left: 0,
        right: 0
      },
      series: {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: chartData,
        itemStyle: {
          borderRadius: 2
        }
      }
    };
  }, [data, isDark, t]);

  if (isLoading) {
    return (
      <Card className={`h-[280px] flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-lg font-bold text-base-content">
          {t('heatmap.title')}
        </h3>
      </div>
      <div className="flex-1 w-full min-h-[220px]">
         <ReactECharts 
            option={option} 
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
            notMerge={true} 
          />
      </div>
    </Card>
  );
};
