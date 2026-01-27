'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { Card } from '@/components/ui/card';
import { 
  Wallet, 
  BookOpen,
  Shield, 
  Clock,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, MouseEvent, ReactNode, useEffect } from 'react';
import { DashboardService } from '@/services/dashboard.service';
import { DashboardStatsResponse } from '@subcare/types';
import { getCategoryColor } from '@/lib/category-colors';

interface StatProps {
  label: string;
  value: string;
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
      {/* Glow Effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.05), transparent 40%)`,
        }}
      />

      {/* 1. Header */}
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl transition-colors duration-200",
            "stat-icon-bg text-[#7C3AED]"
          )}>
            <stat.icon className="w-5 h-5" />
          </div>
          <span className="font-medium text-gray-600 dark:text-gray-400">{stat.label}</span>
        </div>
        
        <span 
          className="px-2 py-1 rounded-full text-xs font-medium"
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
      </div>

      {/* 3. Visual */}
      <div className="relative z-10 mt-4 min-h-[2rem] flex items-center">
        {stat.visual}
      </div>

      {/* 4. Footer */}
      <p className="relative z-10 mt-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
        {stat.footer}
      </p>
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
  // Default segments if no data provided
  const segments = categories.length > 0 ? categories : [
    { color: getCategoryColor('entertainment'), percentage: 40, name: 'Entertainment' },
    { color: getCategoryColor('tools'), percentage: 30, name: 'Tools' },
    { color: getCategoryColor('cloud'), percentage: 20, name: 'Cloud' },
    { color: getCategoryColor('other'), percentage: 10, name: 'Others' },
  ];

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
            const color = getCategoryColor(seg.name);
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
              style={{ backgroundColor: getCategoryColor(seg.name) }}
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

export function StatsGrid() {
  const { t } = useTranslation('dashboard');
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await DashboardService.getStats();
        setData(response);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats: StatProps[] = [
    {
      label: t('stats.total_expenses'),
      value: data ? data.expenses.total.formatted : '...',
      badge: { 
        text: data ? `${data.expenses.trend.percentage > 0 ? '+' : ''}${data.expenses.trend.percentage}%` : '...', 
        style: { 
          backgroundColor: '#DCFCE7', 
          color: data?.expenses.trend.direction === 'down' ? '#16A34A' : (data?.expenses.trend.direction === 'up' ? '#EF4444' : '#6B7280') // Adjust colors based on logic
        } 
        // Note: Logic above assumes 'down' expenses is good (Green #16A34A), 'up' is bad (Red #EF4444).
        // Original code had '#16A34A' (Green) hardcoded with +12.5%. I will keep original style for now or infer context.
        // Usually +Expenses is bad (Red), but let's stick to the visual style requested or common sense.
        // Actually, let's keep it simple. If trend direction is up -> red, down -> green.
      },
      icon: Wallet,
      visual: <Sparkline data={data?.expenses.history} />,
      footer: data ? t('stats.footer.total_expenses', { amount: data.expenses.trend.diffAmount.formatted, ns: 'dashboard' }) : '...',
      isLoading: loading
    },
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
      label: t('stats.remaining_budget'),
      value: data ? data.budget.remaining.formatted : '...',
      badge: { 
        text: data ? `${data.budget.usedPercentage}%` : '...', 
        style: { backgroundColor: '#F3E8FF', color: '#9333EA' }
      },
      icon: Shield,
      visual: <ProgressBar value={data?.budget.usedPercentage} />,
      footer: t('stats.footer.remaining_budget', { ns: 'dashboard' }),
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
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(165, 166, 246, 0.15);
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        .dark .stat-card {
           border-color: rgba(165, 166, 246, 0.1);
           background-color: var(--color-bg-surface);
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          border-color: var(--color-primary);
        }
        .dark .stat-card:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        .stat-card:active {
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
      `}</style>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>
    </>
  );
}
