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
import { useState, useRef, MouseEvent, ReactNode } from 'react';

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
          <span className="font-medium text-gray-600">{stat.label}</span>
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
      <p className="relative z-10 mt-4 text-xs text-gray-500 font-medium">
        {stat.footer}
      </p>
    </Card>
  );
}

// Visual Components
const Sparkline = () => (
  <svg viewBox="0 0 120 25" className="w-full h-full overflow-visible">
    <path 
      d="M0 20 C20 20, 20 5, 40 15 S 60 25, 80 10 S 100 0, 120 15" 
      fill="none" 
      stroke="#A5A6F6" 
      strokeWidth="2"
      strokeLinecap="round"
      className="opacity-80"
    />
  </svg>
);

const CategoryDistribution = () => {
  const segments = [
    { color: '#A5A6F6', percent: 40 },
    { color: '#C4B5FD', percent: 30 },
    { color: '#DDD6FE', percent: 20 },
    { color: '#F3E8FF', percent: 10 },
  ];

  let cumulativePercent = 0;

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg viewBox="0 0 32 32" className="w-full h-full transform -rotate-90">
          {segments.map((seg, i) => {
            const dashArray = `${seg.percent} 100`;
            const dashOffset = -cumulativePercent;
            cumulativePercent += seg.percent;
            return (
              <circle
                key={i}
                cx="16" cy="16" r="12"
                fill="none"
                stroke={seg.color}
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
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#A5A6F6] flex-shrink-0" />
          <span className="text-[10px] text-gray-500 truncate-text">Entertainment</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C4B5FD] flex-shrink-0" />
          <span className="text-[10px] text-gray-500 truncate-text">Tools</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#DDD6FE] flex-shrink-0" />
          <span className="text-[10px] text-gray-500 truncate-text">Cloud</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F3E8FF] flex-shrink-0" />
          <span className="text-[10px] text-gray-500 truncate-text">Others</span>
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ value = 62 }: { value?: number }) => (
  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative">
    <div 
      className="h-full rounded-full relative overflow-hidden"
      style={{ width: `${value}%`, backgroundColor: '#A5A6F6' }}
    >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
    </div>
  </div>
);

const RenewalProgress = () => (
  <div className="flex items-center gap-3 w-full">
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="18" cy="18" r="15.5" stroke="#F3E8FF" strokeWidth="3" fill="none" />
        <circle 
          cx="18" cy="18" r="15.5" 
          stroke="#A5A6F6" strokeWidth="3" fill="none" 
          strokeDasharray="97" strokeDashoffset="24" 
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-gray-600">2d</span>
      </div>
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-xs font-semibold text-gray-900 truncate">Netflix Premium</span>
      <span className="text-[10px] text-gray-500">¥ 98.00 / Month</span>
    </div>
  </div>
);

export function StatsGrid() {
  const { t } = useTranslation('dashboard');

  const stats: StatProps[] = [
    {
      label: t('stats.total_expenses'),
      value: '¥ 8,547.50',
      badge: { 
        text: '+12.5%', 
        style: { backgroundColor: '#DCFCE7', color: '#16A34A' } 
      },
      icon: Wallet,
      visual: <Sparkline />,
      footer: t('stats.footer.total_expenses', { amount: '¥950.00', ns: 'dashboard' })
    },
    {
      label: t('stats.active_subs'),
      value: '32',
      badge: { 
        text: 'Active', 
        style: { backgroundColor: '#DBEAFE', color: '#2563EB' }
      },
      icon: BookOpen,
      visual: <CategoryDistribution />,
      footer: t('stats.footer.active_subs', { count: 8, ns: 'dashboard' })
    },
    {
      label: t('stats.remaining_budget'),
      value: '¥ 5,152.50',
      badge: { 
        text: '62%', 
        style: { backgroundColor: '#F3E8FF', color: '#9333EA' }
      },
      icon: Shield,
      visual: <ProgressBar value={62} />,
      footer: t('stats.footer.remaining_budget', { ns: 'dashboard' })
    },
    {
      label: t('stats.upcoming_renewals'),
      value: '8',
      badge: { 
        text: '近期', 
        style: { backgroundColor: '#FEF9C3', color: '#CA8A04' }
      },
      icon: Clock,
      visual: <RenewalProgress />,
      footer: t('stats.footer.upcoming_renewals', { days: 7, ns: 'dashboard' })
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
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          border-color: var(--color-primary);
        }
        .stat-card:active {
          transform: scale(0.97) translateY(-5px);
        }
        
        .stat-icon-bg {
          background-color: #F3F0FF;
          transition: background-color 0.2s linear;
        }
        .group:hover .stat-icon-bg {
          background-color: #E6E6FF;
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
