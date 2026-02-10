'use client';

import { useEffect, useState, useMemo } from 'react';
import { adminService, AdminOverviewStats, UserGrowthTrend, SubscriptionStatsData } from '@/services';
import {
  Users,
  UserPlus,
  CreditCard,
  Activity,
  AlertTriangle,
  AlertCircle,
  FolderTree,
  Loader2,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store';
import ReactECharts from 'echarts-for-react';
import { graphic } from 'echarts';

// ==================== Stat Card ====================
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

function StatCard({ title, value, subtitle, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-base p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-secondary font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      </div>
    </div>
  );
}

// ==================== User Growth Chart ====================
function UserGrowthChart({ data, isDark }: { data: UserGrowthTrend; isDark: boolean }) {
  const option = useMemo(() => ({
    color: ['#A5A6F6', '#34D399'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      textStyle: {
        color: isDark ? '#F9FAFB' : '#374151',
        fontSize: 12,
      },
      padding: [12, 16],
      extraCssText: `border-radius: 12px; box-shadow: 0 10px 15px -3px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'};`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const date = params[0]?.name || '';
        let html = `<div class="font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2">${date}</div>`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params.forEach((item: any) => {
          html += `
            <div class="flex items-center justify-between gap-6 mb-0.5">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background:${item.color}"></span>
                <span class="${isDark ? 'text-gray-400' : 'text-gray-500'}">${item.seriesName}</span>
              </div>
              <span class="font-bold ${isDark ? 'text-white' : 'text-gray-900'} font-mono">${item.value}</span>
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
      itemGap: 20,
      borderRadius: 6,
      textStyle: {
        color: isDark ? '#9CA3AF' : '#6B7280',
        fontSize: 12,
      },
    },
    grid: {
      left: 20,
      right: 20,
      top: 36,
      bottom: 40,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        margin: 14,
        // Show fewer labels to avoid crowding
        interval: Math.max(Math.floor(data.labels.length / 6) - 1, 0),
        formatter: (value: string) => value.slice(5), // show MM-DD
      },
      boundaryGap: false,
    },
    yAxis: [
      {
        type: 'value',
        name: '新增',
        nameTextStyle: { color: '#9CA3AF', fontSize: 11 },
        min: 0,
        minInterval: 1, // 人数必须为整数
        splitLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#F3F4F6',
            type: 'dashed',
          },
        },
        axisLabel: {
          color: '#9CA3AF',
          fontSize: 11,
        },
      },
      {
        type: 'value',
        name: '累计',
        nameTextStyle: { color: '#9CA3AF', fontSize: 11 },
        minInterval: 1, // 人数必须为整数
        splitLine: { show: false },
        axisLabel: {
          color: '#9CA3AF',
          fontSize: 11,
        },
      },
    ],
    series: [
      {
        name: '每日新增',
        type: 'bar',
        yAxisIndex: 0,
        barMaxWidth: 12,
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#A5A6F6' },
            { offset: 1, color: 'rgba(165,166,246,0.3)' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        data: data.values,
      },
      {
        name: '累计用户',
        type: 'line',
        yAxisIndex: 1,
        smooth: 0.4,
        showSymbol: false,
        lineStyle: {
          width: 2.5,
          color: '#34D399',
        },
        areaStyle: {
          opacity: 0.15,
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(52, 211, 153, 0.25)' },
            { offset: 1, color: 'rgba(52, 211, 153, 0.01)' },
          ]),
        },
        data: data.cumulativeValues,
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

// ==================== Status Distribution (Pie) ====================
// 与项目订阅卡片状态颜色保持一致:
// ACTIVE → 绿色, PAUSED → 琥珀色, CANCELLED → 灰色(zinc), EXPIRED → 红色
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '活跃',
  CANCELLED: '已取消',
  PAUSED: '已暂停',
  EXPIRED: '已过期',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22C55E',
  PAUSED: '#F59E0B',
  CANCELLED: '#71717A',
  EXPIRED: '#EF4444',
};

function StatusDistributionChart({ data, isDark }: { data: SubscriptionStatsData['statusDistribution']; isDark: boolean }) {
  const total = data.reduce((acc, i) => acc + i.count, 0);

  // 构建 ECharts 的 color 调色盘（按 data 顺序），同时构建 series data
  const colorPalette: string[] = [];
  const chartData = data.map((item) => {
    const c = STATUS_COLORS[item.status] || '#9CA3AF';
    colorPalette.push(c);
    return {
      value: item.count,
      name: STATUS_LABELS[item.status] || item.status,
    };
  });

  const option = {
    color: colorPalette,
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: isDark ? '#F9FAFB' : '#374151', fontSize: 12 },
      padding: [10, 14],
      extraCssText: `border-radius: 10px; box-shadow: 0 4px 12px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'};`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0';
        return `
          <div class="flex items-center gap-2 mb-1">
            <span class="w-2.5 h-2.5 rounded-full" style="background:${params.color}"></span>
            <span class="font-medium ${isDark ? 'text-white' : 'text-gray-900'}">${params.name}</span>
          </div>
          <div class="${isDark ? 'text-gray-400' : 'text-gray-500'}">${params.value} 个 (${pct}%)</div>
        `;
      },
    },
    series: [
      {
        type: 'pie' as const,
        radius: ['50%', '72%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: isDark ? '#1F2937' : '#fff',
          borderWidth: 3,
        },
        label: {
          show: true,
          position: 'outside' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (params: any) => {
            const pct = total > 0 ? ((params.value / total) * 100).toFixed(0) : '0';
            return `${params.name} ${pct}%`;
          },
          fontSize: 12,
          color: isDark ? '#D1D5DB' : '#4B5563',
        },
        labelLine: {
          length: 12,
          length2: 8,
          lineStyle: {
            color: isDark ? '#4B5563' : '#D1D5DB',
          },
        },
        emphasis: {
          scale: true,
          scaleSize: 5,
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.15)',
          },
        },
        data: chartData,
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: 'center',
        style: {
          text: `${total}`,
          fontSize: 22,
          fontWeight: 'bold' as const,
          fill: isDark ? '#F9FAFB' : '#111827',
          textAlign: 'center' as const,
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '55%',
        style: {
          text: '总订阅',
          fontSize: 12,
          fill: '#9CA3AF',
          textAlign: 'center' as const,
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
}

// ==================== Category Distribution (Horizontal Bar) ====================
function CategoryDistributionChart({ data, isDark }: { data: SubscriptionStatsData['categoryDistribution']; isDark: boolean }) {
  // Take top 8, filter out zero-count
  const filtered = data.filter((item) => item.count > 0).slice(0, 8);

  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-secondary">
        暂无分类数据
      </div>
    );
  }

  // Reverse so largest at top
  const reversed = [...filtered].reverse();

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
            <span class="font-medium ${isDark ? 'text-white' : 'text-gray-900'}">${item.name}</span>
            <span class="font-bold ${isDark ? 'text-white' : 'text-gray-900'} ml-2">${item.value} 个</span>
          </div>
        `;
      },
    },
    grid: {
      left: 10,
      right: 30,
      top: 8,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#F3F4F6',
          type: 'dashed',
        },
      },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'category',
      data: reversed.map((i) => i.category),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#D1D5DB' : '#4B5563',
        fontSize: 12,
        width: 80,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: reversed.map((i) => i.count),
        itemStyle: {
          color: new graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: 'rgba(165,166,246,0.6)' },
            { offset: 1, color: '#A5A6F6' },
          ]),
          borderRadius: [0, 6, 6, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: isDark ? '#D1D5DB' : '#6B7280',
          fontSize: 12,
          fontWeight: 'bold',
        },
        emphasis: {
          itemStyle: {
            color: new graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: 'rgba(165,166,246,0.8)' },
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

// ==================== Main Dashboard ====================
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [userTrend, setUserTrend] = useState<UserGrowthTrend | null>(null);
  const [subStats, setSubStats] = useState<SubscriptionStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, trendData, subData] = await Promise.all([
          adminService.getOverviewStats(),
          adminService.getUserGrowthTrend(30),
          adminService.getSubscriptionStats(),
        ]);
        setStats(statsData);
        setUserTrend(trendData);
        setSubStats(subData);
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-secondary py-20">
        Failed to load dashboard data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="用户总数"
          value={stats.users.total}
          subtitle={`活跃 ${stats.users.active} 人`}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          title="新增用户 (7天)"
          value={stats.users.newLast7d}
          subtitle={`近30天 ${stats.users.newLast30d} 人`}
          icon={UserPlus}
          color="text-green-600"
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          title="订阅总数"
          value={stats.subscriptions.total}
          subtitle={`活跃 ${stats.subscriptions.active} 个`}
          icon={CreditCard}
          color="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="支付笔数"
          value={stats.payments?.total?.toLocaleString() || '0'}
          subtitle={`本月 ¥${stats.payments?.thisMonthAmount?.toLocaleString() || '0'}`}
          icon={DollarSign}
          color="text-emerald-600"
          bgColor="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          title="AI 对话"
          value={stats.conversations?.total?.toLocaleString() || '0'}
          icon={MessageSquare}
          color="text-indigo-600"
          bgColor="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <StatCard
          title="通知总数"
          value={stats.notifications?.total?.toLocaleString() || '0'}
          subtitle={`未读 ${stats.notifications?.unread || 0}`}
          icon={Bell}
          color="text-pink-600"
          bgColor="bg-pink-50 dark:bg-pink-900/20"
        />
        <StatCard
          title="系统分类"
          value={stats.categories.total}
          icon={FolderTree}
          color="text-amber-600"
          bgColor="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* Logs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="日志总数"
          value={stats.logs.total.toLocaleString()}
          icon={Activity}
          color="text-gray-600"
          bgColor="bg-gray-50 dark:bg-gray-800"
        />
        <StatCard
          title="24h 错误数"
          value={stats.logs.errorsLast24h}
          icon={AlertCircle}
          color="text-red-600"
          bgColor="bg-red-50 dark:bg-red-900/20"
        />
        <StatCard
          title="24h 告警数"
          value={stats.logs.warningsLast24h}
          icon={AlertTriangle}
          color="text-yellow-600"
          bgColor="bg-yellow-50 dark:bg-yellow-900/20"
        />
      </div>

      {/* User Growth Trend - Full Width ECharts */}
      {userTrend && (
        <div className="bg-surface rounded-2xl border border-base p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            用户增长趋势 (近30天)
          </h3>
          <p className="text-xs text-secondary mb-4">
            累计用户: {userTrend.cumulativeValues[userTrend.cumulativeValues.length - 1]} 人
          </p>
          <div className="h-64">
            <UserGrowthChart data={userTrend} isDark={isDark} />
          </div>
        </div>
      )}

      {/* Subscription Distribution - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie */}
        {subStats && subStats.statusDistribution.length > 0 && (
          <div className="bg-surface rounded-2xl border border-base p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              订阅状态分布
            </h3>
            <div className="h-56">
              <StatusDistributionChart data={subStats.statusDistribution} isDark={isDark} />
            </div>
          </div>
        )}

        {/* Category Distribution Horizontal Bar */}
        {subStats && (
          <div className="bg-surface rounded-2xl border border-base p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-primary" />
              分类订阅分布 (Top 8)
            </h3>
            <div className="h-56">
              <CategoryDistributionChart data={subStats.categoryDistribution} isDark={isDark} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
