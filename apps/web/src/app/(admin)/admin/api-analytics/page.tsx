'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  adminService,
  ApiAnalyticsOverview,
  ApiAnalyticsTrend,
  ApiAnalyticsHourly,
  ApiEndpointItem,
  ApiErrorTrend,
  ApiTopUserItem,
} from '@/services';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  Activity,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useThemeStore } from '@/store';
import ReactECharts from 'echarts-for-react';
import { graphic } from 'echarts';

// ==================== Stat Card ====================
function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-base p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-4 h-4', color || 'text-primary')} />
        <span className="text-xs text-secondary font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subValue && <p className="text-xs text-secondary mt-1">{subValue}</p>}
    </div>
  );
}

// ==================== Request Trend Chart (Bar) ====================
function RequestTrendChart({ data, isDark }: { data: ApiAnalyticsTrend; isDark: boolean }) {
  const option = useMemo(() => ({
    color: ['#A5A6F6'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: isDark ? '#F9FAFB' : '#374151', fontSize: 12 },
      padding: [12, 16],
      extraCssText: `border-radius: 12px; box-shadow: 0 10px 15px -3px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'};`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const item = params[0];
        if (!item) return '';
        return `
          <div class="font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2">${item.name}</div>
          <div class="flex items-center justify-between gap-6">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" style="background:#A5A6F6"></span>
              <span class="${isDark ? 'text-gray-400' : 'text-gray-500'}">请求量</span>
            </div>
            <span class="font-bold ${isDark ? 'text-white' : 'text-gray-900'} font-mono">${item.value.toLocaleString()}</span>
          </div>
        `;
      },
    },
    grid: { left: 20, right: 20, top: 30, bottom: 20, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        margin: 14,
        interval: Math.max(Math.floor(data.labels.length / 7) - 1, 0),
        formatter: (value: string) => value.slice(5), // MM-DD
      },
      boundaryGap: true,
    },
    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      splitLine: {
        lineStyle: { color: isDark ? '#374151' : '#F3F4F6', type: 'dashed' as const },
      },
      axisLabel: { color: '#9CA3AF', fontSize: 11 },
    },
    series: [
      {
        name: '请求量',
        type: 'bar',
        barMaxWidth: 14,
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#A5A6F6' },
            { offset: 1, color: 'rgba(165,166,246,0.25)' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#8B8CF5' },
              { offset: 1, color: 'rgba(139,140,245,0.4)' },
            ]),
          },
        },
        data: data.values,
      },
    ],
  }), [data, isDark]);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
}

// ==================== Hourly Distribution Chart (Bar) ====================
function HourlyChart({ data, isDark }: { data: ApiAnalyticsHourly; isDark: boolean }) {
  const option = useMemo(() => ({
    color: ['#60A5FA'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: isDark ? '#F9FAFB' : '#374151', fontSize: 12 },
      padding: [10, 14],
      extraCssText: `border-radius: 10px; box-shadow: 0 4px 12px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'};`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const item = params[0];
        if (!item) return '';
        return `
          <div class="font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-1">${item.name}</div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" style="background:#60A5FA"></span>
            <span class="${isDark ? 'text-gray-400' : 'text-gray-500'}">请求数</span>
            <span class="font-bold ${isDark ? 'text-white' : 'text-gray-900'} font-mono ml-auto">${item.value.toLocaleString()}</span>
          </div>
        `;
      },
    },
    grid: { left: 10, right: 10, top: 20, bottom: 10, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        interval: 2, // Show every 3rd hour
        formatter: (v: string) => v.replace(':00', 'h'),
      },
      boundaryGap: true,
    },
    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      splitLine: {
        lineStyle: { color: isDark ? '#374151' : '#F3F4F6', type: 'dashed' as const },
      },
      axisLabel: { color: '#9CA3AF', fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#60A5FA' },
            { offset: 1, color: 'rgba(96,165,250,0.2)' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        data: data.values,
      },
    ],
  }), [data, isDark]);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
}

// ==================== Error Trend Chart (Bar + Line Dual-Axis) ====================
function ErrorTrendChart({ data, isDark }: { data: ApiErrorTrend; isDark: boolean }) {
  const option = useMemo(() => ({
    color: ['#F87171', '#FBBF24'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: isDark ? '#F9FAFB' : '#374151', fontSize: 12 },
      padding: [12, 16],
      extraCssText: `border-radius: 12px; box-shadow: 0 10px 15px -3px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'};`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const date = params[0]?.name || '';
        let html = `<div class="font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2">${date}</div>`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params.forEach((item: any) => {
          const unit = item.seriesName === '错误率' ? '%' : '';
          html += `
            <div class="flex items-center justify-between gap-6 mb-0.5">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background:${item.color}"></span>
                <span class="${isDark ? 'text-gray-400' : 'text-gray-500'}">${item.seriesName}</span>
              </div>
              <span class="font-bold ${isDark ? 'text-white' : 'text-gray-900'} font-mono">${item.value}${unit}</span>
            </div>
          `;
        });
        return html;
      },
    },
    legend: {
      show: true,
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
      borderRadius: 6,
      textStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 11 },
    },
    grid: { left: 46, right: 46, top: 24, bottom: 36 },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        interval: Math.max(Math.floor(data.labels.length / 6) - 1, 0),
        formatter: (v: string) => v.slice(5),
      },
      boundaryGap: true,
    },
    yAxis: [
      {
        type: 'value',
        name: '错误数',
        nameTextStyle: { color: '#9CA3AF', fontSize: 10, padding: [0, 0, 0, 0] },
        nameGap: 8,
        min: 0,
        minInterval: 1,
        splitLine: {
          lineStyle: { color: isDark ? '#374151' : '#F3F4F6', type: 'dashed' as const },
        },
        axisLabel: { color: '#9CA3AF', fontSize: 10 },
      },
      {
        type: 'value',
        name: '错误率',
        nameTextStyle: { color: '#9CA3AF', fontSize: 10, padding: [0, 0, 0, 0] },
        nameGap: 8,
        min: 0,
        max: 100,
        splitLine: { show: false },
        axisLabel: {
          color: '#9CA3AF',
          fontSize: 10,
          formatter: (v: number) => `${v}%`,
        },
      },
    ],
    series: [
      {
        name: '错误数',
        type: 'bar',
        yAxisIndex: 0,
        barMaxWidth: 10,
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#F87171' },
            { offset: 1, color: 'rgba(248,113,113,0.2)' },
          ]),
          borderRadius: [3, 3, 0, 0],
        },
        data: data.errorCounts,
      },
      {
        name: '错误率',
        type: 'line',
        yAxisIndex: 1,
        smooth: 0.4,
        showSymbol: false,
        lineStyle: { width: 2, color: '#FBBF24' },
        areaStyle: {
          opacity: 0.1,
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(251,191,36,0.2)' },
            { offset: 1, color: 'rgba(251,191,36,0.01)' },
          ]),
        },
        data: data.errorRates,
      },
    ],
  }), [data, isDark]);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
}

// ==================== Top Endpoints Chart (Horizontal Bar) ====================
function TopEndpointsChart({ data, isDark }: { data: ApiEndpointItem[]; isDark: boolean }) {
  const reversed = useMemo(() => [...data].reverse(), [data]);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: isDark ? '#F9FAFB' : '#374151', fontSize: 12 },
      padding: [10, 14],
      extraCssText: `border-radius: 10px; box-shadow: 0 4px 12px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'};`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const item = params[0];
        if (!item) return '';
        return `
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full" style="background:${item.color}"></span>
            <span class="font-medium ${isDark ? 'text-white' : 'text-gray-900'} font-mono text-xs">${item.name}</span>
          </div>
          <div class="${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1">${item.value.toLocaleString()} 次</div>
        `;
      },
    },
    grid: { left: 10, right: 40, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: isDark ? '#374151' : '#F3F4F6', type: 'dashed' as const },
      },
      axisLabel: { color: '#9CA3AF', fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: reversed.map((i) => i.endpoint),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#D1D5DB' : '#4B5563',
        fontSize: 11,
        width: 140,
        overflow: 'truncate',
        formatter: (v: string) => {
          // Show method + shortened path
          return v.length > 28 ? v.slice(0, 28) + '…' : v;
        },
      },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 14,
        data: reversed.map((i) => i.count),
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: 'rgba(165,166,246,0.5)' },
            { offset: 1, color: '#A5A6F6' },
          ]),
          borderRadius: [0, 6, 6, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: isDark ? '#D1D5DB' : '#6B7280',
          fontSize: 11,
          fontWeight: 'bold' as const,
        },
        emphasis: {
          itemStyle: {
            color: new graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: 'rgba(165,166,246,0.7)' },
              { offset: 1, color: '#8B8CF5' },
            ]),
          },
        },
      },
    ],
  }), [reversed, isDark]);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
}

// ==================== Top Users Chart (Horizontal Bar) ====================
function TopUsersChart({ data, isDark }: { data: ApiTopUserItem[]; isDark: boolean }) {
  const reversed = useMemo(() => [...data].reverse(), [data]);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: isDark ? '#F9FAFB' : '#374151', fontSize: 12 },
      padding: [10, 14],
      extraCssText: `border-radius: 10px; box-shadow: 0 4px 12px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'};`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const item = params[0];
        if (!item) return '';
        return `
          <div class="font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-1">${item.name}</div>
          <div class="${isDark ? 'text-gray-400' : 'text-gray-500'}">${item.value.toLocaleString()} 次调用</div>
        `;
      },
    },
    grid: { left: 10, right: 40, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: isDark ? '#374151' : '#F3F4F6', type: 'dashed' as const },
      },
      axisLabel: { color: '#9CA3AF', fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: reversed.map((i) => i.user?.name || i.user?.email || i.userId || 'Anonymous'),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#D1D5DB' : '#4B5563',
        fontSize: 11,
        width: 120,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 14,
        data: reversed.map((i) => i.count),
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: 'rgba(96,165,250,0.5)' },
            { offset: 1, color: '#60A5FA' },
          ]),
          borderRadius: [0, 6, 6, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: isDark ? '#D1D5DB' : '#6B7280',
          fontSize: 11,
          fontWeight: 'bold' as const,
        },
        emphasis: {
          itemStyle: {
            color: new graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: 'rgba(96,165,250,0.7)' },
              { offset: 1, color: '#3B82F6' },
            ]),
          },
        },
      },
    ],
  }), [reversed, isDark]);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
}

// ==================== Level Distribution (Badge Tags) ====================
const LEVEL_COLORS: Record<string, string> = {
  DEBUG: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  WARN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  AUDIT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

// ==================== Empty State ====================
function EmptyState({ text = '暂无数据' }: { text?: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-secondary">
      {text}
    </div>
  );
}

// ==================== Main Page ====================
export default function AdminApiAnalyticsPage() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [overview, setOverview] = useState<ApiAnalyticsOverview | null>(null);
  const [trend, setTrend] = useState<ApiAnalyticsTrend | null>(null);
  const [hourly, setHourly] = useState<ApiAnalyticsHourly | null>(null);
  const [topEndpoints, setTopEndpoints] = useState<ApiEndpointItem[]>([]);
  const [errorTrend, setErrorTrend] = useState<ApiErrorTrend | null>(null);
  const [topUsers, setTopUsers] = useState<ApiTopUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(30);

  const fetchData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        adminService.getApiAnalyticsOverview(),
        adminService.getApiAnalyticsTrend(trendDays),
        adminService.getApiAnalyticsHourly(),
        adminService.getApiTopEndpoints(10),
        adminService.getApiErrorTrend(trendDays),
        adminService.getApiTopUsers(10),
      ]);

      const [ov, tr, hr, ep, er, us] = results;

      if (ov.status === 'fulfilled') setOverview(ov.value);
      else console.error('Overview failed:', ov.reason);

      if (tr.status === 'fulfilled') setTrend(tr.value);
      else console.error('Trend failed:', tr.reason);

      if (hr.status === 'fulfilled') setHourly(hr.value);
      else console.error('Hourly failed:', hr.reason);

      if (ep.status === 'fulfilled') setTopEndpoints(ep.value?.endpoints || []);
      else console.error('Top endpoints failed:', ep.reason);

      if (er.status === 'fulfilled') setErrorTrend(er.value);
      else console.error('Error trend failed:', er.reason);

      if (us.status === 'fulfilled') setTopUsers(us.value?.users || []);
      else console.error('Top users failed:', us.reason);

      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        toast.error(`${failedCount} 个 API 请求失败，部分数据可能缺失`);
      }
    } catch (error) {
      console.error('Failed to fetch API analytics:', error);
      toast.error('获取 API 分析数据失败');
    } finally {
      setLoading(false);
    }
  }, [trendDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-2">
        <select
          value={trendDays}
          onChange={(e) => { setTrendDays(Number(e.target.value)); setLoading(true); }}
          className="px-3 py-1.5 border border-base rounded-lg bg-surface text-sm"
        >
          <option value={7}>最近 7 天</option>
          <option value={14}>最近 14 天</option>
          <option value={30}>最近 30 天</option>
          <option value={90}>最近 90 天</option>
        </select>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-secondary rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="总请求量"
          value={overview?.totalRequests?.toLocaleString() ?? '-'}
        />
        <StatCard
          icon={Zap}
          label="最近 24h"
          value={overview?.last24hRequests?.toLocaleString() ?? '-'}
        />
        <StatCard
          icon={TrendingUp}
          label="最近 7 天"
          value={overview?.last7dRequests?.toLocaleString() ?? '-'}
        />
        <StatCard
          icon={AlertTriangle}
          label="24h 错误率"
          value={overview ? `${overview.errorRate24h}%` : '-'}
          subValue={overview ? `${overview.errorCount24h} 个错误` : undefined}
          color="text-red-500"
        />
      </div>

      {/* Request Trend — Full Width Bar Chart */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            请求量趋势
          </h2>
          {trend && (
            <span className="text-xs text-secondary">
              总计 {trend.total.toLocaleString()} 次
            </span>
          )}
        </div>
        <div className="h-[280px]">
          {trend && trend.values.some(v => v > 0) ? (
            <RequestTrendChart data={trend} isDark={isDark} />
          ) : (
            <EmptyState text={trend ? '暂无请求数据' : '加载中...'} />
          )}
        </div>
      </div>

      {/* Hourly + Error Trend — Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-base shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            每小时分布 (24h)
          </h2>
          <div className="h-[220px]">
            {hourly && hourly.values.some(v => v > 0) ? (
              <HourlyChart data={hourly} isDark={isDark} />
            ) : (
              <EmptyState text={hourly ? '暂无请求数据' : '加载中...'} />
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-base shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            错误趋势
          </h2>
          <div className="h-[220px]">
            {errorTrend && errorTrend.errorCounts.some(v => v > 0) ? (
              <ErrorTrendChart data={errorTrend} isDark={isDark} />
            ) : (
              <EmptyState text={errorTrend ? '暂无错误数据' : '加载中...'} />
            )}
          </div>
        </div>
      </div>

      {/* Top Endpoints + Top Users — Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-base shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            热门接口 Top 10
          </h2>
          <div style={{ height: `${Math.max(topEndpoints.length * 36 + 24, 384)}px` }}>
            {topEndpoints.length > 0 ? (
              <TopEndpointsChart data={topEndpoints} isDark={isDark} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-base shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            用户 API 调用排行
          </h2>
          <div style={{ height: `${Math.max(topUsers.length * 36 + 24, 384)}px` }}>
            {topUsers.length > 0 ? (
              <TopUsersChart data={topUsers} isDark={isDark} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>

      {/* Level Distribution — Badge Tags */}
      {overview && overview.levelDistribution.length > 0 && (
        <div className="bg-surface rounded-2xl border border-base shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">日志级别分布</h2>
          <div className="flex flex-wrap gap-4">
            {overview.levelDistribution.map((item) => (
              <div key={item.level} className="flex items-center gap-2">
                <span className={cn('px-3 py-1 rounded-lg text-sm font-medium', LEVEL_COLORS[item.level] || 'bg-gray-100')}>
                  {item.level}
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {item.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
