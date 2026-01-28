'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useThemeStore } from '@/store/theme.store';
import { useTranslation } from '@/lib/i18n/hooks';
import { MonthlyProjection } from '@/services/finance/projection';
import { Card } from '@/components/ui/card';

interface ProjectionChartProps {
  data: MonthlyProjection[];
}

export const ProjectionChart = ({ data }: ProjectionChartProps) => {
  const { theme } = useThemeStore();
  const { t } = useTranslation('analytics');
  const isDark = theme === 'dark';

  const option = useMemo(() => {
    const labels = data.map(d => d.month);
    
    // Calculate cumulative
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
        data: [t('projection.monthly', 'Monthly'), t('projection.cumulative', 'Cumulative')],
        textStyle: { color: isDark ? '#9CA3AF' : '#6B7280' },
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
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
          name: t('projection.monthly', 'Monthly'),
          axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280' },
          splitLine: { lineStyle: { color: isDark ? '#374151' : '#F3F4F6' } }
        },
        {
          type: 'value',
          name: t('projection.cumulative', 'Cumulative'),
          axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: t('projection.monthly', 'Monthly'),
          type: 'bar',
          data: monthlyData,
          itemStyle: { color: '#818cf8', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 20
        },
        {
          name: t('projection.cumulative', 'Cumulative'),
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: cumulativeData,
          itemStyle: { color: '#34d399' },
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
    <Card className="p-6 h-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-base-content">{t('projection.title', 'Projected Spend')}</h3>
        <p className="text-sm text-muted-foreground">{t('projection.subtitle', 'Future 12 months forecast')}</p>
      </div>
      <div className="h-[300px] w-full">
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
