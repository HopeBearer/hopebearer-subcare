'use client';

import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { graphic } from 'echarts';
import { DashboardService } from '@/services/dashboard.service';
import { ExpenseTrendData } from '@subcare/types';

export function ExpenseTrendChart() {
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
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
        fontSize: 12,
        fontFamily: 'inherit',
      },
      padding: [12, 16],
      extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border-radius: 12px;',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const item = params[0];
        if (!item) return '';
        // Use currency code format (e.g. CNY 1,200)
        const currencyCode = data?.currency || 'CNY';
        return `
          <div class="font-medium text-gray-900 mb-2">${item.name}</div>
          <div class="flex items-center justify-between gap-6">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#A5A6F6]"></span>
              <span class="text-gray-500">支出</span>
            </div>
            <span class="font-bold text-gray-900 font-mono">${currencyCode} ${item.value.toLocaleString()}</span>
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
        color: '#9CA3AF',
        fontSize: 12,
        margin: 20,
        fontFamily: 'inherit',
      },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      min: 0,
      splitNumber: 5,
      splitLine: {
        lineStyle: {
          color: '#F3F4F6',
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
        name: '支出',
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
    <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border rounded-2xl border-gray-100 br-8 h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">支出趋势</h3>
          <p className="text-sm text-gray-400 mt-1 font-medium">月度订阅成本变化</p>
        </div>
        <div className="bg-gray-50 rounded-full p-1 flex items-center">
          {(['6m', '1y', 'all'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
                period === item
                  ? 'bg-[#A5A6F6]/15 text-[#A5A6F6] shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item === '6m' ? '6个月' : item === '1y' ? '1年' : '全部'}
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
