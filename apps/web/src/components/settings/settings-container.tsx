'use client';

import { useSettingsStore } from '@/store/settings.store';
import { settingsConfig } from './config';
import { useEffect, useRef } from 'react';

export function SettingsContainer() {
  const { setActiveTab } = useSettingsStore();
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id as any);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
      }
    );

    settingsConfig.forEach((tab) => {
      const element = document.getElementById(tab.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [setActiveTab]);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {settingsConfig.map((tab) => {
        const Component = tab.component;
        return (
          <div key={tab.id} id={tab.id} className="scroll-mt-6">
             <Component />
          </div>
        );
      })}
    </div>
  );
}
