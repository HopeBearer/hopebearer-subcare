'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useThemeStore } from '@/store';
import { useTranslation } from '@/lib/i18n/hooks';
import { MonthlyProjection } from '@subcare/types';
import { Card } from '@/components/ui/card';

interface ProjectionChartProps {
  data: MonthlyProjection[];
  className?: string;
}

export const ProjectionChart = ({ data, className }: ProjectionChartProps) => {
  const { theme } = useThemeStore();
  const { t } = useTranslation('finance');
  const isDark = theme === 'dark';

  const option = useMemo(() => {
    // ... same logic ...
    const labels = data.map(d => d.month);
    let cumulative = 0;
    const cumulativeData = data.map(d => {
      cumulative += d.amount;
      return cumulative;
    });
    const monthlyData = data.map(d => d.amount);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        textStyle: { color: isDark ? '#F9FAFB' : '#374151' },
      },
      legend: {
        data: [t('projection.monthly'), t('projection.cumulative')],
        textStyle: { color: isDark ? '#9CA3AF' : '#6B7280' },
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
        top: 30 // Adjusted top padding
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280' }
      },
      yAxis: [
        {
          type: 'value',
          name: t('projection.monthly'),
          axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280' },
          splitLine: { lineStyle: { color: isDark ? '#374151' : '#F3F4F6' } }
        },
        {
          type: 'value',
          name: t('projection.cumulative'),
          axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: t('projection.monthly'),
          type: 'bar',
          data: monthlyData,
          itemStyle: { color: '#818cf8', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 20,
          tooltip: {
            valueFormatter: (value: number) => value.toFixed(2)
          }
        },
        {
          name: t('projection.cumulative'),
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: cumulativeData,
          itemStyle: { color: '#34d399' },
          tooltip: {
            valueFormatter: (value: number) => value.toFixed(2)
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(52, 211, 153, 0.5)' }, { offset: 1, color: 'rgba(52, 211, 153, 0)' }]
            }
          }
        }
      ]
    };
  }, [data, isDark, t]);

  return (
    <Card className={`p-6 h-full flex flex-col ${className}`}>
      <div className="mb-4 flex-none shrink-0">
        <h3 className="text-lg font-bold text-base-content">{t('projection.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('projection.subtitle')}</p>
      </div>
      <div className="flex-1 w-full min-h-[250px]">
         <ReactECharts 
            option={{
                ...option,
                maintainAspectRatio: false,
                grid: {
                    ...option.grid,
                    top: 40,
                    bottom: 30, 
                }
            }}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
            notMerge={true} 
          />
      </div>
    </Card>
  );
};
