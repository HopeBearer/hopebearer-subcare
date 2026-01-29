'use client';

import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { graphic } from 'echarts';
import { useTranslation } from '@/lib/i18n/hooks';
import { DashboardService } from '@/services/dashboard.service';
import { ExpenseTrendData } from '@subcare/types';

import { useThemeStore } from '@/store/theme.store';

export function ExpenseTrendChart() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { t } = useTranslation('dashboard');
  const [period, setPeriod] = useState<'6m' | '1y' | 'all'>('6m');
  const [data, setData] = useState<ExpenseTrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await DashboardService.getTrend(period);
        setData(result);
      } catch (error) {
        console.error('Failed to fetch trend data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const option = {
    color: ['#A5A6F6'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      textStyle: {
        color: isDark ? '#F9FAFB' : '#374151',
        fontSize: 12,
        fontFamily: 'inherit',
      },
      padding: [12, 16],
      extraCssText: isDark ? 'box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); border-radius: 12px;' : 'box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border-radius: 12px;',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const item = params[0];
        if (!item) return '';
        // Parse date from YYYY-MM format
        const [year, month] = item.name.split('-');
        const dateDisplay = year && month ? `${year}年${parseInt(month)}月` : item.name;

        // Use currency code format (e.g. CNY 1,200)
        const currencyCode = data?.currency || 'CNY';
        return `
          <div class="font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2">${dateDisplay}</div>
          <div class="flex items-center justify-between gap-6">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#A5A6F6]"></span>
              <span class="${isDark ? 'text-gray-400' : 'text-gray-500'}">${t('charts.spending_trends.title')}</span>
            </div>
            <span class="font-bold ${isDark ? 'text-white' : 'text-gray-900'} font-mono">${currencyCode} ${item.value.toLocaleString()}</span>
          </div>
        `;
      }
    },
    grid: {
      left: '20',
      right: '20',
      bottom: '20',
      top: '40',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data?.labels || [],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#9CA3AF' : '#9CA3AF',
        fontSize: 12,
        margin: 20,
        fontFamily: 'inherit',
        formatter: (value: string) => {
          // Parse YYYY-MM and return only the month number
          const parts = value.split('-');
          if (parts.length === 2) {
            return parseInt(parts[1]).toString();
          }
          return value;
        }
      },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      min: 0,
      splitNumber: 5,
      splitLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#F3F4F6',
          type: 'solid',
        },
      },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        margin: 16,
        fontFamily: 'inherit',
        formatter: (value: number) => value === 0 ? '0' : `${value / 1000}k`
      },
    },
    series: [
      {
        name: t('charts.spending_trends.title'),
        type: 'line',
        smooth: 0.4,
        showSymbol: false,
        symbolSize: 8,
        lineStyle: {
          width: 4,
          color: '#A5A6F6',
          shadowColor: 'rgba(165, 166, 246, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 5,
        },
        itemStyle: {
          color: '#A5A6F6',
          borderWidth: 2,
          borderColor: '#fff',
        },
        areaStyle: {
          opacity: 0.8,
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(165, 166, 246, 0.25)',
            },
            {
              offset: 1,
              color: 'rgba(165, 166, 246, 0.01)',
            },
          ]),
        },
        data: data?.values || [],
        emphasis: {
          scale: true,
          focus: 'series',
        },
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[20px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border rounded-2xl border-gray-100 dark:border-gray-700 br-8 h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{t('charts.spending_trends.title')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 font-medium">{t('charts.spending_trends.subtitle')}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-full p-1 flex items-center">
          {(['6m', '1y', 'all'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
                period === item
                  ? 'bg-[#A5A6F6]/15 text-[#A5A6F6] shadow-sm'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {t(`charts.spending_trends.periods.${item}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 w-full min-h-0">
        {loading ? (
           <div className="h-full w-full flex items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A5A6F6]"></div>
           </div>
        ) : (
          <ReactECharts 
            option={option} 
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
            notMerge={true} 
          />
        )}
      </div>
    </div>
  );
}
