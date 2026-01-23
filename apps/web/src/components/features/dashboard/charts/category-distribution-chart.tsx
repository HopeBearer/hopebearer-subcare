'use client';

import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { DashboardService } from '@/services/dashboard.service';
import { CategoryDistributionData } from '@subcare/types';
import { getCategoryColor } from '@/lib/category-colors';

export function CategoryDistributionChart() {
  const [data, setData] = useState<CategoryDistributionData>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await DashboardService.getDistribution();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch distribution data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const processedData = data.map(item => ({
    value: item.value, // This is the amount
    name: item.name,
    percentage: item.percentage,
    itemStyle: { 
      color: getCategoryColor(item.name)
    },
    // Adding custom properties to access in formatter
    formattedValue: item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    count: item.count
  }));

  const option = {
    tooltip: {
      trigger: 'item',
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
        const dataItem = params.data;
        return `
          <div class="font-medium text-gray-900 mb-2">${params.name}</div>
          <div class="flex items-center justify-between gap-8 mb-1">
             <div class="flex items-center gap-2">
               <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${params.color}"></span>
               <span class="text-gray-500">占比</span>
             </div>
             <span class="font-bold text-gray-900">${dataItem.percentage}%</span>
          </div>
          <div class="flex items-center justify-between gap-8">
             <span class="text-gray-500 pl-4.5">金额</span>
             <span class="font-bold text-gray-900 font-mono">CNY ${dataItem.formattedValue}</span>
          </div>
        `;
      }
    },
    series: [
      {
        name: '分类占比',
        type: 'pie',
        radius: ['55%', '75%'], // Thinner ring
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 3,
        },
        label: {
          show: true,
          position: 'inside',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (params: any) => {
            // Only show label if percentage > 5% to avoid clutter
            if (params.data.percentage < 5) return '';
            return `${params.name}\n${params.data.percentage}%`;
          },
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'inherit',
          lineHeight: 14,
          color: '#fff', // Default to white for better contrast on colored segments
          textShadowColor: 'rgba(0,0,0,0.3)',
          textShadowBlur: 2
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
          },
          scale: true,
          scaleSize: 6,
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
          }
        },
        data: processedData,
      },
    ],
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-base h-full flex flex-col">
       <div className="mb-2">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">分类占比</h3>
          <p className="text-sm text-gray-400 mt-1 font-medium">按分类统计支出</p>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center -mt-4">
           {loading ? (
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A5A6F6]"></div>
           ) : (
             <ReactECharts 
                option={option} 
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
             />
           )}
        </div>
    </div>
  );
}
