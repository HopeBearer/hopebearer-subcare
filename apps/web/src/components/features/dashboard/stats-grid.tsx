'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { 
  Wallet, 
  BookOpen,
  Shield, 
  Clock,
  HelpCircle,
  LucideIcon,
  RefreshCw
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useCallback, MouseEvent, ReactNode } from 'react';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { DashboardStatsResponse } from '@subcare/types';

/**
 * A span that truncates text and shows a themed Tooltip only when overflowing.
 * DOM structure is stable regardless of truncation state to avoid layout loops.
 */
function TruncateLabel({ text, className }: { text: string; className?: string }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const check = () => {
      setIsTruncated(el.scrollWidth > el.offsetWidth + 1);
    };
    // Check on mount and after layout settles
    check();
    requestAnimationFrame(check);
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <TooltipProvider>
      <Tooltip open={isTruncated ? undefined : false}>
        <TooltipTrigger asChild>
          <span
            ref={spanRef}
            className={cn("block truncate min-w-0", className)}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface StatProps {
  label: string;
  tooltip?: string;
  value: string;
  subValue?: string;
  badge: {
    text: string;
    style: {
      backgroundColor: string;
      color: string;
    };
  };
  icon: LucideIcon;
  visual: ReactNode;
  footer: string;
  isLoading?: boolean;
}

// ─── Shared card face renderer (used by StatCard) ───
function CardFace({
  stat,
  mousePos,
}: {
  stat: StatProps;
  mousePos: { x: number; y: number };
}) {
  return (
    <>
      {/* Glow Effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.05), transparent 40%)`,
        }}
      />

      {/* 1. Header */}
      <div className="relative z-10 flex justify-between items-start gap-2 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "p-2.5 rounded-xl transition-colors duration-200 flex-shrink-0 flex items-center justify-center",
            "stat-icon-bg text-[#7C3AED]"
          )}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <TruncateLabel text={stat.label} className="font-medium text-gray-600 dark:text-gray-400 text-sm" />
            {stat.tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{stat.tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <span
          className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
          style={stat.badge.style}
        >
          {stat.badge.text}
        </span>
      </div>

      {/* 2. Hero */}
      <div className="relative z-10">
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {stat.value}
        </h3>
        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 min-h-[1rem]">
          {stat.subValue || '\u00A0'}
        </p>
      </div>

      {/* 3. Visual */}
      <div className="relative z-10 mt-4 min-h-[2rem] flex items-center">
        {stat.visual}
      </div>

      {/* 4. Footer */}
      <p className="relative z-10 mt-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
        {stat.footer}
      </p>
    </>
  );
}

function StatCard({ stat }: { stat: StatProps }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  if (stat.isLoading) {
    return (
      <Card className="h-[200px] bg-surface p-5 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 rounded mb-4" />
        <div className="h-10 w-2/3 bg-gray-200 rounded mb-8" />
        <div className="h-12 w-full bg-gray-200 rounded" />
      </Card>
    );
  }

  return (
    <Card
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative overflow-hidden bg-surface p-5",
        "stat-card"
      )}
    >
      <CardFace stat={stat} mousePos={mousePos} />
    </Card>
  );
}

// ─── Flip Card for Expense (actual vs equivalent) ───
const FLIP_INTERVAL_MS = 8000;

function FlipExpenseCard({
  front,
  back,
  isLoading,
}: {
  front: StatProps;
  back: StatProps;
  isLoading: boolean;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIsFlipped(prev => !prev);
    }, FLIP_INTERVAL_MS);
  }, []);

  useEffect(() => {
    if (isLoading || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, isHovered, resetTimer]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleClick = useCallback(() => {
    setIsFlipped(prev => !prev);
    resetTimer();
  }, [resetTimer]);

  if (isLoading) {
    return (
      <Card className="h-[200px] bg-surface p-5 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 rounded mb-4" />
        <div className="h-10 w-2/3 bg-gray-200 rounded mb-8" />
        <div className="h-12 w-full bg-gray-200 rounded" />
      </Card>
    );
  }

  const activeStat = isFlipped ? back : front;

  return (
    <Card
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={cn(
        "group relative overflow-hidden bg-surface p-5 cursor-pointer",
        "stat-card"
      )}
    >
      {/* Glow Effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.05), transparent 40%)`,
        }}
      />

      {/* 1. Header — animates label/tooltip/badge changes */}
      <div className="relative z-10 flex justify-between items-start gap-2 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "p-2.5 rounded-xl transition-colors duration-200 flex-shrink-0 flex items-center justify-center",
            "stat-icon-bg text-[#7C3AED]"
          )}>
            <activeStat.icon className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <TruncateLabel text={activeStat.label} className="font-medium text-gray-600 dark:text-gray-400 text-sm flip-text-transition" />
            {activeStat.tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{activeStat.tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <span
          className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 flip-text-transition"
          style={activeStat.badge.style}
        >
          {activeStat.badge.text}
        </span>
      </div>

      {/* 2. Content — crossfade between front and back */}
      <div className="relative z-10 min-h-[7.5rem]">
        {/* Front content */}
        <div className={cn(
          "absolute inset-0 flip-content-transition",
          isFlipped ? "flip-content-exit" : "flip-content-enter"
        )}>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {front.value}
          </h3>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 min-h-[1rem]">
            {front.subValue || '\u00A0'}
          </p>
          <div className="mt-4 min-h-[2rem] flex items-center">
            {front.visual}
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
            {front.footer}
          </p>
        </div>

        {/* Back content */}
        <div className={cn(
          "absolute inset-0 flip-content-transition",
          isFlipped ? "flip-content-enter" : "flip-content-exit"
        )}>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {back.value}
          </h3>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 min-h-[1rem]">
            {back.subValue || '\u00A0'}
          </p>
          <div className="mt-4 min-h-[2rem] flex items-center">
            {back.visual}
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
            {back.footer}
          </p>
        </div>
      </div>

      {/* Flip indicator */}
      <div className="absolute bottom-2.5 right-3 z-20 text-gray-300 dark:text-gray-600 opacity-60">
        <RefreshCw className="w-3 h-3" />
      </div>
    </Card>
  );
}

// Visual Components
const Sparkline = ({ data = [] }: { data?: number[] }) => {
  // Simple sparkline path generation
  const width = 120;
  const height = 25;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  // If no data, fall back to a default curve for skeleton look or empty
  const d = data.length > 1 
    ? `M${points}` 
    : "M0 20 C20 20, 20 5, 40 15 S 60 25, 80 10 S 100 0, 120 15";

  return (
    <svg viewBox="0 0 120 25" className="w-full h-full overflow-visible">
      <path 
        d={d}
        fill="none" 
        stroke="#A5A6F6" 
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-80"
      />
    </svg>
  );
};

interface CategoryProps {
  categories?: {
    color?: string;
    percentage: number;
    name: string;
  }[];
}

const CategoryDistribution = ({ categories = [] }: CategoryProps) => {
  // Default segments if no data provided (using default colors)
  const defaultSegments = [
    { color: '#A5A6F6', percentage: 40, name: 'Entertainment' },
    { color: '#FCD34D', percentage: 30, name: 'Tools' },
    { color: '#60A5FA', percentage: 20, name: 'Cloud' },
    { color: '#9CA3AF', percentage: 10, name: 'Others' },
  ];
  const segments = categories.length > 0 ? categories : defaultSegments;

  // Pre-calculate offsets to avoid mutation during render
  const segmentsWithOffsets = segments.reduce((acc, seg) => {
    const offset = acc.currentOffset;
    acc.items.push({ ...seg, offset });
    acc.currentOffset += seg.percentage;
    return acc;
  }, { items: [] as (typeof segments[0] & { offset: number })[], currentOffset: 0 }).items;

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg viewBox="0 0 32 32" className="w-full h-full transform -rotate-90">
          {segmentsWithOffsets.map((seg, i) => {
            const dashArray = `${seg.percentage} 100`;
            const dashOffset = -seg.offset;
            const color = seg.color || '#9CA3AF'; // Use API color directly
            return (
              <circle
                key={i}
                cx="16" cy="16" r="12"
                fill="none"
                stroke={color}
                strokeWidth="6"
                pathLength="100"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <div 
              className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
              style={{ backgroundColor: seg.color || '#9CA3AF' }}
            />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate-text">{seg.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgressBar = ({ value = 62 }: { value?: number }) => (
  <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
    <div 
      className="h-full rounded-full relative overflow-hidden"
      style={{ width: `${value}%`, backgroundColor: '#A5A6F6' }}
    >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
    </div>
  </div>
);

interface RenewalProps {
  data?: {
    name: string;
    price: { formatted: string };
    daysRemaining: number;
    cycle: string;
  } | null;
}

const RenewalProgress = ({ data }: RenewalProps) => {
  const { t } = useTranslation('dashboard');

  if (!data) {
    return (
      <div className="flex items-center gap-3 w-full h-9 opacity-70">
         <div className="relative w-9 h-9 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
         </div>
         <span className="text-xs text-gray-500 font-medium">{t('stats.no_upcoming_renewals', 'No upcoming renewals')}</span>
      </div>
    );
  }

  // Calculate a visual progress based on days (e.g., assuming 30 day cycle for visual context)
  // This logic can be refined.
  const progress = Math.max(0, Math.min(100, (30 - data.daysRemaining) / 30 * 100));
  const dashOffset = 100 - progress; 

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="relative w-9 h-9 flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r="15.5" className="stroke-gray-100 dark:stroke-gray-700" strokeWidth="3" fill="none" />
          <circle 
            cx="18" cy="18" r="15.5" 
            stroke="#A5A6F6" strokeWidth="3" fill="none" 
            strokeDasharray="100" strokeDashoffset={dashOffset} 
            pathLength="100"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300">{data.daysRemaining}d</span>
        </div>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">{data.name}</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">{data.price.formatted} {data.cycle}</span>
      </div>
    </div>
  );
};

// ─── Cycle Breakdown Chart (back side of flip card) ───
const CYCLE_COLORS: Record<string, string> = {
  monthly: '#A5A6F6',
  yearly: '#FCD34D',
  weekly: '#60A5FA',
};

function EquivalentBreakdownChart({
  breakdown = [],
  total,
  t,
}: {
  breakdown?: DashboardStatsResponse['expenses']['equivalentBreakdown'];
  total: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const getCycleLabel = (cycle: string) => {
    const key = `stats.cycle_${cycle}`;
    const result = t(key);
    return result === key ? t('stats.cycle_other') : result;
  };

  if (!breakdown || breakdown.length === 0) {
    return <div className="text-[10px] text-gray-400">—</div>;
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {breakdown.map((item) => {
        const pct = total > 0 ? (item.amount / total) * 100 : 0;
        const color = CYCLE_COLORS[item.cycle] || '#9CA3AF';
        return (
          <div key={item.cycle} className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 w-8 text-right flex-shrink-0">
              {getCycleLabel(item.cycle)}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 w-16 text-right flex-shrink-0">
              {t('stats.subs_count', { count: item.count })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helper: build the front (actual) and back (equivalent) stat props ───
function buildExpenseFlipProps(
  data: DashboardStatsResponse | null,
  loading: boolean,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { front: StatProps; back: StatProps } {
  const front: StatProps = {
    label: t('stats.total_expenses'),
    tooltip: t('stats.tooltips.total_expenses'),
    value: data ? data.expenses.total.formatted : '...',
    subValue: data && data.expenses.deletedExpense.amount > 0
      ? t('stats.includes_deleted', { amount: data.expenses.deletedExpense.formatted })
      : undefined,
    badge: {
      text: data
        ? `${data.expenses.trend.percentage > 0 ? '+' : ''}${data.expenses.trend.percentage}%`
        : '...',
      style: {
        backgroundColor: '#DCFCE7',
        color: data?.expenses.trend.direction === 'down'
          ? '#16A34A'
          : data?.expenses.trend.direction === 'up'
            ? '#EF4444'
            : '#6B7280',
      },
    },
    icon: Wallet,
    visual: <Sparkline data={data?.expenses.history} />,
    footer: data
      ? t('stats.footer.total_expenses', { amount: data.expenses.trend.diffAmount.formatted, ns: 'dashboard' })
      : '...',
    isLoading: loading,
  };

  // Diff between equivalent and actual
  const diff = data
    ? Math.abs(data.expenses.equivalentExpense.amount - data.expenses.total.amount)
    : 0;
  const diffFormatted = data
    ? new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: data.expenses.equivalentExpense.currency,
        currencyDisplay: 'code',
      }).format(diff)
    : '';

  const back: StatProps = {
    label: t('stats.equivalent_expenses'),
    tooltip: t('stats.tooltips.equivalent_expenses'),
    value: data ? data.expenses.equivalentExpense.formatted : '...',
    subValue: t('stats.excludes_deleted'),
    badge: {
      text: data ? `${data.subscriptions.activeCount} subs` : '...',
      style: { backgroundColor: '#F3E8FF', color: '#9333EA' },
    },
    icon: Wallet,
    visual: (
      <EquivalentBreakdownChart
        breakdown={data?.expenses.equivalentBreakdown}
        total={data?.expenses.equivalentExpense.amount || 0}
        t={t}
      />
    ),
    footer: data
      ? t('stats.equivalent_diff', { amount: diffFormatted })
      : '...',
    isLoading: loading,
  };

  return { front, back };
}

export function StatsGrid() {
  const { t } = useTranslation('dashboard');
  const { data: data = null, isLoading: loading } = useDashboardStats();

  const { front: expenseFront, back: expenseBack } = buildExpenseFlipProps(data, loading, t);

  const otherStats: StatProps[] = [
    {
      label: t('stats.active_subs'),
      value: data ? data.subscriptions.activeCount.toString() : '...',
      badge: { 
        text: 'Active', 
        style: { backgroundColor: '#DBEAFE', color: '#2563EB' }
      },
      icon: BookOpen,
      visual: <CategoryDistribution categories={data?.subscriptions.categories} />,
      footer: data ? t('stats.footer.active_subs', { count: data.subscriptions.categoryCount, ns: 'dashboard' }) : '...',
      isLoading: loading
    },
    {
      label: (data?.budget.remaining.amount || 0) < 0 ? t('stats.over_budget') : t('stats.remaining_budget'),
      value: data ? ((data.budget.remaining.amount || 0) < 0 
        ? `${data.budget.remaining.currency} ${Math.abs(data.budget.remaining.amount).toFixed(2)}`
        : data.budget.remaining.formatted) : '...',
      badge: { 
        text: data ? `${data.budget.usedPercentage}%` : '...', 
        style: { 
          backgroundColor: (data?.budget.remaining.amount || 0) < 0 ? '#FEF2F2' : '#F3E8FF', 
          color: (data?.budget.remaining.amount || 0) < 0 ? '#EF4444' : '#9333EA' 
        }
      },
      icon: Shield,
      visual: <ProgressBar value={Math.min(data?.budget.usedPercentage || 0, 100)} />,
      footer: data ? `${t('stats.footer.remaining_budget', { ns: 'dashboard' })} / ${t('stats.total_budget', { ns: 'dashboard' })}: ${data.budget.totalLimit.formatted}` : '...',
      isLoading: loading
    },
    {
      label: t('stats.upcoming_renewals'),
      value: data ? data.renewals.upcomingCount.toString() : '...',
      badge: { 
        text: '近期', 
        style: { backgroundColor: '#FEF9C3', color: '#CA8A04' }
      },
      icon: Clock,
      visual: <RenewalProgress data={data?.renewals.nextRenewal} />,
      footer: data ? t('stats.footer.upcoming_renewals', { days: data.renewals.daysThreshold, ns: 'dashboard' }) : '...',
      isLoading: loading
    }
  ];

  return (
    <>
      <style>{`
        .stat-card {
          transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(165, 166, 246, 0.15);
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        .dark .stat-card {
           border-color: rgba(165, 166, 246, 0.1);
           background-color: var(--color-bg-surface);
        }
        .stat-card:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          border-color: var(--color-primary);
        }
        .dark .stat-card:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }

        /* Non-flip cards keep original hover lift */
        .grid > .stat-card:hover {
          transform: translateY(-5px);
        }
        .grid > .stat-card:active {
          transform: scale(0.97) translateY(-5px);
        }

        .stat-icon-bg {
          background-color: #F3F0FF;
          transition: background-color 0.2s linear;
        }
        .dark .stat-icon-bg {
          background-color: rgba(139, 92, 246, 0.15);
          color: #A78BFA;
        }
        .group:hover .stat-icon-bg {
          background-color: #E6E6FF;
        }
        .dark .group:hover .stat-icon-bg {
          background-color: rgba(139, 92, 246, 0.25);
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .truncate-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── Flip Card Content Crossfade ── */
        .flip-content-transition {
          transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flip-content-enter {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .flip-content-exit {
          opacity: 0;
          transform: translateY(6px) scale(0.97);
          pointer-events: none;
        }
        .flip-text-transition {
          transition: opacity 0.4s ease;
        }
      `}</style>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <FlipExpenseCard
          front={expenseFront}
          back={expenseBack}
          isLoading={loading}
        />
        {otherStats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>
    </>
  );
}
