'use client';

import React from 'react';
import { ExpenseTrendChart } from './expense-trend-chart';
import { CategoryDistributionChart } from './category-distribution-chart';

export function DashboardCharts() {
  return (
    <div className="flex lg:flex-row gap-6 w-full mt-8 h-[400px]">
      <div className="h-full min-w-0 flex-7 br-8">
        <ExpenseTrendChart />
      </div>
      <div className="h-full min-w-0 flex-3">
        <CategoryDistributionChart />
      </div>
    </div>  
  );
}
